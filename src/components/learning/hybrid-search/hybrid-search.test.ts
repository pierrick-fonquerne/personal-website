import { describe, expect, it } from 'vitest';
import {
  corpusStats,
  idf,
  bm25Score,
  cosineSimilarity,
  rank,
  reciprocalRankFusion,
  naiveSumFusion,
  type CorpusStats,
  type Document,
  type ScoredDoc,
} from './hybrid-search';

// ---------------------------------------------------------------------------
// Petit corpus jouet, partage par plusieurs tests.
// ---------------------------------------------------------------------------

function doc(id: string, tokens: string[], vector: number[]): Document {
  return { id, tokens, vector };
}

const PARAMS = { k1: 1.5, b: 0.75 };

describe('corpusStats', () => {
  const docs = [
    doc('a', ['chat', 'noir'], [1, 0]),
    doc('b', ['chat', 'chat', 'blanc', 'gris'], [0, 1]),
    doc('c', ['chien'], [1, 1]),
  ];

  it('compte le nombre de documents', () => {
    expect(corpusStats(docs).docCount).toBe(3);
  });

  it('calcule la longueur moyenne des documents en tokens', () => {
    // longueurs : 2, 4, 1 -> moyenne 7/3
    expect(corpusStats(docs).avgDocLength).toBeCloseTo(7 / 3, 10);
  });

  it('compte la frequence de document, pas la frequence brute du terme', () => {
    // "chat" apparait deux fois dans b mais ne compte qu'une fois par document.
    expect(corpusStats(docs).documentFrequency.get('chat')).toBe(2);
    expect(corpusStats(docs).documentFrequency.get('noir')).toBe(1);
    expect(corpusStats(docs).documentFrequency.get('chien')).toBe(1);
  });
});

describe('idf', () => {
  const stats: CorpusStats = {
    docCount: 10,
    avgDocLength: 5,
    documentFrequency: new Map([
      ['rare', 1],
      ['frequent', 9],
      ['partout', 10],
    ]),
  };

  it('donne plus de poids a un terme rare qu a un terme frequent', () => {
    expect(idf('rare', stats)).toBeGreaterThan(idf('frequent', stats));
  });

  it('reste positif pour un terme present partout, mais tres faible', () => {
    const everywhere = idf('partout', stats);
    expect(everywhere).toBeGreaterThan(0);
    expect(everywhere).toBeLessThan(idf('frequent', stats));
  });
});

describe('bm25Score', () => {
  it('vaut zero quand aucun terme de la requete n est dans le document', () => {
    const stats: CorpusStats = {
      docCount: 3,
      avgDocLength: 3,
      documentFrequency: new Map([['absent', 1]]),
    };
    const d = doc('d', ['rien', 'a', 'voir'], []);
    expect(bm25Score(['absent'], d, stats, PARAMS)).toBe(0);
  });

  it('sature la frequence de terme : le gain marginal decroit', () => {
    // Documents de meme longueur pour isoler l effet de la frequence.
    const stats: CorpusStats = {
      docCount: 4,
      avgDocLength: 6,
      documentFrequency: new Map([['t', 1]]),
    };
    const score = (count: number): number => {
      const tokens = Array.from({ length: 6 }, (_, i) => (i < count ? 't' : `x${i}`));
      return bm25Score(['t'], doc('d', tokens, []), stats, PARAMS);
    };
    const gain1to2 = score(2) - score(1);
    const gain2to3 = score(3) - score(2);
    expect(score(2)).toBeGreaterThan(score(1));
    expect(gain1to2).toBeGreaterThan(gain2to3);
  });

  it('penalise un document plus long a frequence egale quand b > 0', () => {
    const stats: CorpusStats = {
      docCount: 4,
      avgDocLength: 6,
      documentFrequency: new Map([['t', 1]]),
    };
    const short = doc('s', ['t', 't', 'a'], []);
    const long = doc('l', ['t', 't', 'a', 'b', 'c', 'd', 'e', 'f'], []);
    expect(bm25Score(['t'], short, stats, PARAMS)).toBeGreaterThan(
      bm25Score(['t'], long, stats, PARAMS),
    );
  });

  it('ignore la longueur quand b = 0', () => {
    const stats: CorpusStats = {
      docCount: 4,
      avgDocLength: 6,
      documentFrequency: new Map([['t', 1]]),
    };
    const short = doc('s', ['t', 't', 'a'], []);
    const long = doc('l', ['t', 't', 'a', 'b', 'c', 'd'], []);
    const noLengthNorm = { k1: 1.5, b: 0 };
    expect(bm25Score(['t'], short, stats, noLengthNorm)).toBeCloseTo(
      bm25Score(['t'], long, stats, noLengthNorm),
      10,
    );
  });

  it('classe en tete le document portant le token exact rare', () => {
    const docs = [
      doc('facture', ['facture', 'fr', '2024', '8831'], [0.1, 0.9]),
      doc('paraphrase', ['note', 'de', 'reglement', 'annuel'], [0.9, 0.1]),
    ];
    const stats = corpusStats(docs);
    const exact = bm25Score(['8831'], docs[0] as Document, stats, PARAMS);
    const other = bm25Score(['8831'], docs[1] as Document, stats, PARAMS);
    expect(exact).toBeGreaterThan(other);
    expect(other).toBe(0);
  });
});

describe('cosineSimilarity', () => {
  it('vaut 1 pour deux vecteurs identiques', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
  });

  it('vaut 0 pour deux vecteurs orthogonaux', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });

  it('vaut 0 quand un vecteur est nul', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it('rapproche une paraphrase meme sans token commun', () => {
    // Deux vecteurs proches en direction = sens proche, independamment des mots.
    const query = [0.9, 0.1];
    const paraphrase = [0.85, 0.15];
    const offTopic = [0.1, 0.9];
    expect(cosineSimilarity(query, paraphrase)).toBeGreaterThan(
      cosineSimilarity(query, offTopic),
    );
  });
});

describe('rank', () => {
  it('classe par score decroissant avec un rang base sur 1', () => {
    const scored: ScoredDoc[] = [
      { id: 'a', score: 1 },
      { id: 'b', score: 5 },
      { id: 'c', score: 3 },
    ];
    const ranked = rank(scored);
    expect(ranked.map((r) => r.id)).toEqual(['b', 'c', 'a']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('departage les ex aequo par identifiant pour rester deterministe', () => {
    const scored: ScoredDoc[] = [
      { id: 'z', score: 2 },
      { id: 'a', score: 2 },
    ];
    expect(rank(scored).map((r) => r.id)).toEqual(['a', 'z']);
  });
});

describe('reciprocalRankFusion', () => {
  it('favorise un document bien classe dans les deux listes', () => {
    const lexical = rank([
      { id: 'a', score: 10 },
      { id: 'b', score: 5 },
      { id: 'c', score: 1 },
    ]);
    const semantic = rank([
      { id: 'a', score: 0.9 },
      { id: 'b', score: 0.2 },
      { id: 'c', score: 0.1 },
    ]);
    const fused = reciprocalRankFusion([lexical, semantic]);
    expect(fused[0]?.id).toBe('a');
  });

  it('est invariant a l echelle des scores : seul le rang compte', () => {
    const lexicalSmall = rank([
      { id: 'a', score: 0.9 },
      { id: 'b', score: 0.4 },
    ]);
    const lexicalHuge = rank([
      { id: 'a', score: 900 },
      { id: 'b', score: 400 },
    ]);
    const semantic = rank([
      { id: 'b', score: 0.8 },
      { id: 'a', score: 0.3 },
    ]);
    const fusedSmall = reciprocalRankFusion([lexicalSmall, semantic]);
    const fusedHuge = reciprocalRankFusion([lexicalHuge, semantic]);
    // Multiplier une echelle par 1000 ne change rien : le RRF ne lit que les rangs.
    expect(fusedHuge.map((r) => r.id)).toEqual(fusedSmall.map((r) => r.id));
    expect(fusedHuge.map((r) => r.score)).toEqual(fusedSmall.map((r) => r.score));
  });

  it('utilise une constante k de 60 par defaut', () => {
    const only = rank([{ id: 'a', score: 1 }]);
    // Un seul document, rang 1 : score RRF = 1/(60 + 1).
    expect(reciprocalRankFusion([only])[0]?.score).toBeCloseTo(1 / 61, 12);
  });
});

describe('naiveSumFusion contre RRF : le pivot du chapitre', () => {
  // Scenario : un document est meilleur en sens, l autre en lexical.
  // Les echelles sont incompatibles (cosinus ~ [0,1], BM25 ~ [0,15]).
  const semantic: ScoredDoc[] = [
    { id: 'sens', score: 0.9 },
    { id: 'lettre', score: 0.4 },
  ];
  const lexical: ScoredDoc[] = [
    { id: 'sens', score: 1.0 },
    { id: 'lettre', score: 14.0 },
  ];

  it('somme naive : la grande echelle ecrase la petite', () => {
    const fused = naiveSumFusion([semantic, lexical]);
    // 'lettre' gagne uniquement parce que BM25 a une magnitude plus grande,
    // pas parce qu il est globalement meilleur.
    expect(fused[0]?.id).toBe('lettre');
  });

  it('RRF : les deux signaux pesent a egalite', () => {
    const fused = reciprocalRankFusion([rank(semantic), rank(lexical)]);
    const scoreOf = (id: string): number => fused.find((r) => r.id === id)?.score ?? 0;
    // 'sens' est rang 1 en semantique et rang 2 en lexical ;
    // 'lettre' est rang 2 en semantique et rang 1 en lexical : parfaitement symetrique.
    expect(scoreOf('sens')).toBeCloseTo(scoreOf('lettre'), 12);
  });
});
