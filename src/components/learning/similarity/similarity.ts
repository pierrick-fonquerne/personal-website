/**
 * Moteur pur de la geometrie de la similarite entre vecteurs.
 *
 * Un embedding est un point dans un espace vectoriel : comparer deux sens revient
 * a mesurer une distance ou un angle entre deux vecteurs. Le moteur calcule les
 * trois mesures du chapitre (produit scalaire, distance euclidienne, similarite
 * cosinus) et classe des candidats face a une requete. Aucun texte de langue ici :
 * tout le naturel (FR / EN) reste dans le MDX via les labels du composant.
 *
 * Les vecteurs sont des tableaux de reels de meme dimension. Le composant les
 * utilise en dimension deux pour le dessin, mais le moteur ne suppose aucune
 * dimension particuliere : il est fidele aux embeddings reels (768, 1536...).
 */

/** Une mesure de proximite entre deux vecteurs. */
export type Metric = 'cosine' | 'euclidean' | 'dot';

/** Un candidat a classer : un identifiant et son vecteur. */
export interface Candidate {
  /** Identifiant stable, sert d'etiquette et de cle d'affichage. */
  id: string;
  /** Le vecteur du candidat, de meme dimension que la requete. */
  vector: number[];
}

/** Un candidat apres classement : son score brut et son rang (1 = plus proche). */
export interface RankedCandidate extends Candidate {
  /** Le score brut selon la metrique : similarite (cosine/dot) ou distance (euclidean). */
  score: number;
  /** Le rang dans le classement, de 1 (plus proche) a n. */
  rank: number;
}

/** Options de classement. */
export interface RankOptions {
  /** Si vrai, normalise la requete et chaque candidat avant de mesurer. */
  normalized?: boolean;
}

// ---------------------------------------------------------------------------
// Mesures elementaires
// ---------------------------------------------------------------------------

/** Verifie que deux vecteurs ont la meme dimension, sinon leve une erreur. */
function assertSameDimension(a: number[], b: number[]): void {
  if (a.length !== b.length) {
    throw new Error(`dimension mismatch: ${a.length} vs ${b.length}`);
  }
}

/** Produit scalaire de deux vecteurs de meme dimension. */
export function dotProduct(a: number[], b: number[]): number {
  assertSameDimension(a, b);
  return a.reduce((sum, value, index) => sum + value * (b[index] as number), 0);
}

/** Norme euclidienne (longueur) d'un vecteur. */
export function norm(a: number[]): number {
  return Math.sqrt(dotProduct(a, a));
}

/**
 * Vecteur normalise (de norme un, meme direction). Un vecteur nul est renvoye
 * inchange : on ne peut pas orienter une fleche de longueur zero.
 */
export function normalize(a: number[]): number[] {
  const length = norm(a);
  if (length < 1e-12) {
    return [...a];
  }
  return a.map((value) => value / length);
}

/**
 * Similarite cosinus dans [-1, 1] : le cosinus de l'angle entre les deux vecteurs.
 * Vaut un quand ils pointent dans la meme direction, zero quand ils sont
 * perpendiculaires, moins un quand ils sont opposes. Insensible a la longueur.
 * Si l'un des deux est nul, vaut zero (angle indefini).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const denominator = norm(a) * norm(b);
  if (denominator < 1e-12) {
    return 0;
  }
  return dotProduct(a, b) / denominator;
}

/** Distance euclidienne (L2) entre deux vecteurs : la longueur du segment qui les separe. */
export function euclideanDistance(a: number[], b: number[]): number {
  assertSameDimension(a, b);
  const sumOfSquares = a.reduce(
    (sum, value, index) => sum + (value - (b[index] as number)) ** 2,
    0,
  );
  return Math.sqrt(sumOfSquares);
}

// ---------------------------------------------------------------------------
// Classement de candidats
// ---------------------------------------------------------------------------

/**
 * Classe des candidats du plus proche au plus eloigne d'une requete, selon la metrique.
 *
 * Pour cosine et dot, un score eleve signifie proche : tri decroissant. Pour
 * euclidean, un score (une distance) faible signifie proche : tri croissant. Le
 * resultat porte le score brut et un rang de 1 (plus proche) a n. Le tri est stable :
 * a egalite de score, l'ordre d'entree est conserve.
 */
export function rankCandidates(
  query: number[],
  candidates: Candidate[],
  metric: Metric,
  options: RankOptions = {},
): RankedCandidate[] {
  const preparedQuery = options.normalized ? normalize(query) : query;
  const lowerIsCloser = metric === 'euclidean';

  const scored = candidates.map((candidate, index) => {
    const vector = options.normalized ? normalize(candidate.vector) : candidate.vector;
    const score =
      metric === 'cosine'
        ? cosineSimilarity(preparedQuery, vector)
        : metric === 'dot'
          ? dotProduct(preparedQuery, vector)
          : euclideanDistance(preparedQuery, vector);
    return { candidate, score, index };
  });

  scored.sort((left, right) => {
    if (left.score !== right.score) {
      return lowerIsCloser ? left.score - right.score : right.score - left.score;
    }
    return left.index - right.index;
  });

  return scored.map((entry, position) => ({
    id: entry.candidate.id,
    vector: entry.candidate.vector,
    score: entry.score,
    rank: position + 1,
  }));
}
