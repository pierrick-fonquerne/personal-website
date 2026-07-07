import { describe, expect, it } from 'vitest';
import {
  retrieve,
  buildContext,
  generateGrounded,
  generateParametric,
  type RagDocument,
  type RagQuery,
  type RankedPassage,
} from './rag-pipeline';
import {
  corpusStats,
  bm25Score,
  cosineSimilarity,
  rank,
  reciprocalRankFusion,
  type ScoredDoc,
} from '../hybrid-search/hybrid-search';

// ---------------------------------------------------------------------------
// Corpus jouet partage. Quatre passages d une base documentaire personnelle.
// d1 porte le fait qui repond a q1 ; aucun passage ne repond a q2 (piege).
// ---------------------------------------------------------------------------

function ragDoc(
  id: string,
  tokens: string[],
  vector: number[],
  extra: Partial<Pick<RagDocument, 'text' | 'fact' | 'answersQueryIds'>> = {},
): RagDocument {
  return { id, text: extra.text ?? id, tokens, vector, ...extra };
}

const OPTS = { k1: 1.5, b: 0.75, rrfK: 60 };

const DOCS: RagDocument[] = [
  ragDoc('d1', ['facture', '8831', 'prestation', 'conseil'], [0.98, 0.2], {
    text: 'Facture 8831, prestation de conseil, montant 4 200 euros.',
    fact: 'La facture 8831 correspond a une prestation de conseil de 4 200 euros.',
    answersQueryIds: ['q1'],
  }),
  ragDoc('d2', ['facture', '2207', 'hebergement', 'annuel'], [0.96, 0.28], {
    text: 'Facture 2207, hebergement annuel.',
  }),
  ragDoc('d3', ['reglement', 'interieur', 'personnel'], [0.64, 0.77], {
    text: 'Reglement interieur du personnel.',
  }),
  ragDoc('d4', ['note', 'frais', 'deplacement', 'lyon'], [0.47, 0.88], {
    text: 'Note de frais, deplacement a Lyon.',
  }),
];

const Q1: RagQuery = {
  id: 'q1',
  label: 'montant de la facture 8831',
  tokens: ['facture', '8831', 'montant'],
  vector: [0.98, 0.2],
  parametricAnswer: 'La facture 8831 s eleve a 1 500 euros.',
  parametricStatus: 'hallucinated',
  refusalText: 'Je ne trouve pas cette information dans tes documents.',
};

const Q2: RagQuery = {
  id: 'q2',
  label: 'date d echeance de la facture 2207',
  tokens: ['date', 'echeance', 'facture', '2207'],
  vector: [0.95, 0.3],
  parametricAnswer: 'La facture 2207 arrive a echeance le 15 mars.',
  parametricStatus: 'hallucinated',
  refusalText: 'Je ne trouve pas cette information dans tes documents.',
};

// ---------------------------------------------------------------------------
// retrieve : reutilise exactement le pipeline hybride du chapitre 7.
// ---------------------------------------------------------------------------

describe('retrieve', () => {
  it('classe tous les documents et attribue des rangs consecutifs bases sur 1', () => {
    const ranked = retrieve(Q1, DOCS, OPTS);
    expect(ranked).toHaveLength(DOCS.length);
    expect(ranked.map((p) => p.rank)).toEqual([1, 2, 3, 4]);
  });

  it('rattache a chaque passage classe le document source complet', () => {
    const ranked = retrieve(Q1, DOCS, OPTS);
    const top = ranked[0] as RankedPassage;
    const source = DOCS.find((d) => d.id === top.doc.id);
    expect(top.doc).toBe(source);
  });

  it('produit exactement la fusion RRF des classements lexical et semantique', () => {
    const stats = corpusStats(DOCS);
    const lexScored: ScoredDoc[] = DOCS.map((d) => ({
      id: d.id,
      score: bm25Score(Q1.tokens, d, stats, { k1: OPTS.k1, b: OPTS.b }),
    }));
    const semScored: ScoredDoc[] = DOCS.map((d) => ({
      id: d.id,
      score: cosineSimilarity(Q1.vector, d.vector),
    }));
    const expected = reciprocalRankFusion([rank(lexScored), rank(semScored)], OPTS.rrfK);

    const got = retrieve(Q1, DOCS, OPTS);
    expect(got.map((p) => p.doc.id)).toEqual(expected.map((e) => e.id));
    expect(got.map((p) => p.rank)).toEqual(expected.map((e) => e.rank));
    got.forEach((p, i) => {
      expect(p.rrfScore).toBeCloseTo((expected[i] as { score: number }).score, 10);
    });
  });
});

// ---------------------------------------------------------------------------
// buildContext : le budget de contexte garde les k premiers passages.
// ---------------------------------------------------------------------------

describe('buildContext', () => {
  const ranked = retrieve(Q1, DOCS, OPTS);

  it('garde les k premiers passages, dans l ordre du classement', () => {
    const context = buildContext(ranked, 2);
    expect(context.map((p) => p.doc.id)).toEqual(ranked.slice(0, 2).map((p) => p.doc.id));
  });

  it('ne garde aucun passage quand k vaut 0', () => {
    expect(buildContext(ranked, 0)).toEqual([]);
  });

  it('garde tout le classement quand k depasse le nombre de passages', () => {
    expect(buildContext(ranked, 999)).toHaveLength(ranked.length);
  });
});

// ---------------------------------------------------------------------------
// generateGrounded : ancre la reponse sur un passage du contexte, ou refuse.
// C est le coeur du chapitre : la reponse est plafonnee par le retrieval.
// ---------------------------------------------------------------------------

describe('generateGrounded', () => {
  // Classement artificiel ou le passage porteur d1 est au rang 3.
  const rankedWithCarrierThird: RankedPassage[] = [
    { doc: DOCS[1] as RagDocument, rrfScore: 0.03, rank: 1 },
    { doc: DOCS[2] as RagDocument, rrfScore: 0.02, rank: 2 },
    { doc: DOCS[0] as RagDocument, rrfScore: 0.01, rank: 3 }, // d1, le porteur
    { doc: DOCS[3] as RagDocument, rrfScore: 0.005, rank: 4 },
  ];

  it('ancre la reponse sur le passage porteur present dans le contexte', () => {
    const context = buildContext(rankedWithCarrierThird, 3); // inclut d1
    const answer = generateGrounded(Q1, context);
    expect(answer.status).toBe('grounded');
    expect(answer.text).toContain('prestation de conseil');
  });

  it('cite la position base 1 du passage porteur dans le contexte', () => {
    const context = buildContext(rankedWithCarrierThird, 3);
    const answer = generateGrounded(Q1, context);
    // d1 est le 3e passage du contexte -> citation [3].
    expect(answer.citations).toEqual([3]);
    expect(answer.text).toContain('[3]');
  });

  it('refuse honnetement quand le passage porteur est HORS du contexte (k trop petit)', () => {
    const context = buildContext(rankedWithCarrierThird, 2); // d1 exclu
    const answer = generateGrounded(Q1, context);
    expect(answer.status).toBe('honest-refusal');
    expect(answer.citations).toEqual([]);
    expect(answer.text).toBe(Q1.refusalText);
  });

  it('refuse honnetement quand aucun document ne porte le fait demande', () => {
    const context = buildContext(retrieve(Q2, DOCS, OPTS), 4);
    const answer = generateGrounded(Q2, context);
    expect(answer.status).toBe('honest-refusal');
    expect(answer.text).toBe(Q2.refusalText);
  });
});

// ---------------------------------------------------------------------------
// generateParametric : le LLM seul ne lit jamais les documents.
// ---------------------------------------------------------------------------

describe('generateParametric', () => {
  it('renvoie la reponse parametrique pre-ecrite de la requete', () => {
    const answer = generateParametric(Q1);
    expect(answer.text).toBe(Q1.parametricAnswer);
    expect(answer.status).toBe(Q1.parametricStatus);
  });

  it('ne prend aucun document en entree : sa sortie ne peut pas dependre du corpus', () => {
    // La signature elle-meme (une seule requete, zero document) materialise le
    // fait que le modele parametrique repond de memoire, sans ancrage.
    expect(generateParametric.length).toBe(1);
  });
});
