/**
 * Moteur pur de la recherche hybride : versant lexical (BM25) + versant
 * semantique (cosinus), puis fusion des deux.
 *
 * Le chapitre precedent nous a donne un index durable et verifie. Mais toute la
 * recherche batie jusqu ici repose sur le SENS, capte par les vecteurs. Or le
 * sens est aveugle a la LETTRE : un numero de facture, un nom propre rare, un
 * mot-cle qui doit apparaitre tel quel echappent a la proximite vectorielle. Ce
 * module met en scene trois idees :
 *
 *  1. BM25, le score lexical de reference. Il recompense un terme present (la
 *     frequence de terme), mais avec un rendement DECROISSANT (saturation par k1),
 *     pondere chaque terme par sa rarete (la frequence inverse de document, IDF),
 *     et corrige le biais des documents longs (normalisation par longueur, b).
 *
 *  2. Le cosinus, deja vu au chapitre 1, qui mesure la proximite de sens entre le
 *     vecteur de la requete et celui d un document, meme sans aucun mot commun.
 *
 *  3. LA FUSION. On ne peut PAS additionner naivement un cosinus (dans [0, 1]) et
 *     un BM25 (non borne, souvent 0 a 15) : la grande echelle ecrase la petite.
 *     La fusion reciproque des rangs (RRF) contourne le probleme en ne lisant que
 *     les RANGS, jamais les scores bruts : elle est invariante a l echelle par
 *     construction. naiveSumFusion sert de contre-exemple deliberement casse.
 *
 * Aucun texte de langue ici : tout le naturel (FR / EN) reste dans le composant.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Un document du corpus : un identifiant, ses tokens lexicaux, son vecteur de sens. */
export interface Document {
  /** Identifiant stable du document. */
  id: string;
  /** Le contenu decoupe en tokens (deja normalises : minuscules, sans ponctuation). */
  tokens: string[];
  /** Le vecteur d embedding qui capte le sens. */
  vector: number[];
}

/** Les deux hyperparametres de BM25. */
export interface BM25Params {
  /** Saturation de la frequence de terme : plus k1 est grand, moins on sature vite. */
  k1: number;
  /** Force de la normalisation par longueur : 0 = aucune, 1 = pleine correction. */
  b: number;
}

/** Statistiques globales du corpus, necessaires a IDF et a la normalisation. */
export interface CorpusStats {
  /** Nombre total de documents (le N de la formule IDF). */
  docCount: number;
  /** Longueur moyenne d un document en tokens (le avgdl de la normalisation). */
  avgDocLength: number;
  /** Pour chaque terme : dans combien de documents distincts il apparait. */
  documentFrequency: Map<string, number>;
}

/** Un document associe a un score brut. */
export interface ScoredDoc {
  /** Identifiant du document. */
  id: string;
  /** Score brut (BM25, cosinus ou score fusionne). */
  score: number;
}

/** Un document classe : son score et son rang base sur 1. */
export interface RankedDoc {
  /** Identifiant du document. */
  id: string;
  /** Score ayant servi au classement. */
  score: number;
  /** Rang dans le classement, le meilleur valant 1. */
  rank: number;
}

// ---------------------------------------------------------------------------
// Statistiques de corpus et IDF
// ---------------------------------------------------------------------------

/**
 * Calcule les statistiques globales du corpus en une passe : nombre de documents,
 * longueur moyenne, et frequence DE DOCUMENT de chaque terme (le nombre de
 * documents distincts ou il apparait, jamais le nombre brut d occurrences).
 */
export function corpusStats(docs: Document[]): CorpusStats {
  const documentFrequency = new Map<string, number>();
  let totalLength = 0;
  for (const d of docs) {
    totalLength += d.tokens.length;
    for (const term of new Set(d.tokens)) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }
  return {
    docCount: docs.length,
    avgDocLength: docs.length === 0 ? 0 : totalLength / docs.length,
    documentFrequency,
  };
}

/**
 * Frequence inverse de document (variante BM25, toujours positive) :
 *
 *   idf(t) = ln(1 + (N - df + 0.5) / (df + 0.5))
 *
 * Un terme rare (petit df) recoit un grand poids ; un terme present partout
 * (df proche de N) recoit un poids tres faible.
 */
export function idf(term: string, stats: CorpusStats): number {
  const df = stats.documentFrequency.get(term) ?? 0;
  return Math.log(1 + (stats.docCount - df + 0.5) / (df + 0.5));
}

// ---------------------------------------------------------------------------
// BM25
// ---------------------------------------------------------------------------

function termFrequency(term: string, tokens: string[]): number {
  let count = 0;
  for (const t of tokens) {
    if (t === term) count += 1;
  }
  return count;
}

/**
 * Score BM25 d un document pour une requete (un sac de tokens). On somme, sur
 * chaque terme de la requete, sa contribution :
 *
 *   idf(t) * (f * (k1 + 1)) / (f + k1 * (1 - b + b * dl / avgdl))
 *
 * ou f est la frequence du terme dans le document, dl sa longueur en tokens, et
 * avgdl la longueur moyenne du corpus. Un terme absent du document apporte zero.
 */
export function bm25Score(
  queryTokens: string[],
  doc: Document,
  stats: CorpusStats,
  params: BM25Params,
): number {
  const dl = doc.tokens.length;
  const avgdl = stats.avgDocLength || 1;
  const { k1, b } = params;
  let score = 0;
  for (const term of new Set(queryTokens)) {
    const f = termFrequency(term, doc.tokens);
    if (f === 0) continue;
    const numerator = f * (k1 + 1);
    const denominator = f + k1 * (1 - b + (b * dl) / avgdl);
    score += idf(term, stats) * (numerator / denominator);
  }
  return score;
}

// ---------------------------------------------------------------------------
// Cosinus
// ---------------------------------------------------------------------------

/**
 * Similarite cosinus de deux vecteurs : le cosinus de l angle qui les separe,
 * dans [-1, 1] (et dans [0, 1] pour des embeddings positifs). Vaut 0 si l un des
 * vecteurs est nul. C est exactement la mesure de proximite de sens du chapitre 1.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const ai = a[i] as number;
    const bi = b[i] as number;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ---------------------------------------------------------------------------
// Classement et fusion
// ---------------------------------------------------------------------------

/**
 * Transforme une liste de scores en classement : tri par score decroissant, puis
 * attribution d un rang base sur 1. Les ex aequo sont departages par identifiant
 * croissant, pour que le classement soit deterministe.
 */
export function rank(scored: ScoredDoc[]): RankedDoc[] {
  return [...scored]
    .sort((x, y) => (y.score === x.score ? (x.id < y.id ? -1 : 1) : y.score - x.score))
    .map((entry, index) => ({ id: entry.id, score: entry.score, rank: index + 1 }));
}

/**
 * Fusion reciproque des rangs (Reciprocal Rank Fusion). Pour chaque document, on
 * somme sur tous les classements la quantite 1 / (k + rang). Le score fusionne ne
 * depend QUE des rangs : il est donc invariant a l echelle des scores d origine,
 * ce qui resout proprement l incompatibilite cosinus / BM25. k amortit le poids
 * des premieres places (60 est la valeur classique de Cormack et al. 2009).
 */
export function reciprocalRankFusion(rankings: RankedDoc[][], k = 60): RankedDoc[] {
  const fused = new Map<string, number>();
  for (const ranking of rankings) {
    for (const entry of ranking) {
      fused.set(entry.id, (fused.get(entry.id) ?? 0) + 1 / (k + entry.rank));
    }
  }
  const scored: ScoredDoc[] = [...fused.entries()].map(([id, score]) => ({ id, score }));
  return rank(scored);
}

/**
 * Contre-exemple deliberement casse : on additionne les scores BRUTS de plusieurs
 * classements, puis on classe. Quand les echelles different (cosinus dans [0, 1],
 * BM25 non borne), la grande echelle ecrase la petite et le resultat est dicte par
 * un seul signal. C est precisement ce que la fusion par rang evite.
 */
export function naiveSumFusion(scoredLists: ScoredDoc[][]): RankedDoc[] {
  const summed = new Map<string, number>();
  for (const list of scoredLists) {
    for (const entry of list) {
      summed.set(entry.id, (summed.get(entry.id) ?? 0) + entry.score);
    }
  }
  const scored: ScoredDoc[] = [...summed.entries()].map(([id, score]) => ({ id, score }));
  return rank(scored);
}
