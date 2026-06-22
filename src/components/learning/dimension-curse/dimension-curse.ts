/**
 * Moteur pur de la malediction de la dimension.
 *
 * En grande dimension, deux phenomenes contre-intuitifs s'installent : les
 * distances entre points tires au hasard se concentrent (le plus proche et le
 * plus lointain deviennent presque indiscernables), et deux vecteurs aleatoires
 * sont presque toujours quasi perpendiculaires. Ce module fabrique des nuages de
 * points reproductibles (RNG seede) et mesure ces deux effets, plus le rappel@k
 * qui sert a juger une recherche approchee face a la recherche exacte (l'oracle).
 *
 * Aucun texte de langue ici : tout le naturel (FR / EN) reste dans le composant.
 */

import { cosineSimilarity, euclideanDistance } from '../similarity/similarity';

/** Un intervalle d'histogramme : ses bornes et le nombre de valeurs qu'il contient. */
export interface HistogramBin {
  /** Borne basse de l'intervalle (incluse). */
  start: number;
  /** Borne haute de l'intervalle (incluse pour le dernier intervalle). */
  end: number;
  /** Nombre de valeurs tombant dans l'intervalle. */
  count: number;
}

/** La moyenne et l'ecart-type (population) d'un echantillon. */
export interface Stats {
  /** Moyenne arithmetique. */
  mean: number;
  /** Ecart-type de population (racine de la variance moyenne). */
  std: number;
}

// ---------------------------------------------------------------------------
// Aleatoire reproductible
// ---------------------------------------------------------------------------

/**
 * Generateur pseudo-aleatoire mulberry32 : rapide, deterministe, sans etat global.
 * Une meme graine produit toujours la meme suite, ce qui rend les nuages de
 * points (et donc les tests et l'affichage) parfaitement reproductibles.
 * Renvoie une fonction qui, a chaque appel, donne un reel dans [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Tire un reel selon une loi normale centree reduite (moyenne zero, ecart-type un),
 * par la transformation de Box-Muller appliquee a deux tirages uniformes.
 */
export function gaussianSample(rng: () => number): number {
  let u = rng();
  // log(0) est infini : on ecarte la valeur nulle, impossible apres ce garde-fou.
  while (u <= 1e-12) {
    u = rng();
  }
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Fabrique `count` vecteurs de dimension `dim`, chaque coordonnee tiree selon une
 * loi normale centree reduite. Un nuage gaussien est isotrope : aucune direction
 * n'est privilegiee, ce qui est le cadre propre pour observer la malediction.
 */
export function randomVectors(count: number, dim: number, rng: () => number): number[][] {
  const vectors: number[][] = [];
  for (let i = 0; i < count; i += 1) {
    const vector: number[] = [];
    for (let j = 0; j < dim; j += 1) {
      vector.push(gaussianSample(rng));
    }
    vectors.push(vector);
  }
  return vectors;
}

// ---------------------------------------------------------------------------
// Mesures de concentration
// ---------------------------------------------------------------------------

/** Distance euclidienne de la requete a chacun des vecteurs. */
export function distancesToQuery(query: number[], vectors: number[][]): number[] {
  return vectors.map((vector) => euclideanDistance(query, vector));
}

/**
 * Contraste relatif des distances : (max - min) / min. C'est l'indicateur de
 * Beyer et al. (1999). Il vaut beaucoup quand le plus proche est franchement plus
 * pres que le plus lointain, et tend vers zero quand toutes les distances se
 * ressemblent, c'est-a-dire quand la dimension explose.
 */
export function distanceContrast(distances: number[]): number {
  if (distances.length === 0) {
    throw new Error('distanceContrast requires at least one distance');
  }
  let min = distances[0] as number;
  let max = distances[0] as number;
  for (const distance of distances) {
    if (distance < min) min = distance;
    if (distance > max) max = distance;
  }
  if (min < 1e-12) {
    return max < 1e-12 ? 0 : Number.POSITIVE_INFINITY;
  }
  return (max - min) / min;
}

/** Moyenne et ecart-type de population d'un echantillon. */
export function meanAndStd(values: number[]): Stats {
  if (values.length === 0) {
    throw new Error('meanAndStd requires at least one value');
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Repartit les valeurs en `binCount` intervalles de largeur egale, de la plus
 * petite a la plus grande valeur. Quand toutes les valeurs sont egales, un seul
 * intervalle de largeur nulle les recueille toutes. La somme des comptes vaut
 * toujours le nombre de valeurs.
 */
export function histogram(values: number[], binCount: number): HistogramBin[] {
  if (binCount < 1) {
    throw new Error('histogram requires at least one bin');
  }
  if (values.length === 0) {
    return [];
  }
  let min = values[0] as number;
  let max = values[0] as number;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const span = max - min;
  const width = span / binCount;

  const bins: HistogramBin[] = [];
  for (let i = 0; i < binCount; i += 1) {
    bins.push({
      start: span === 0 ? min : min + i * width,
      end: span === 0 ? max : min + (i + 1) * width,
      count: 0,
    });
  }

  for (const value of values) {
    if (span === 0) {
      (bins[0] as HistogramBin).count += 1;
      continue;
    }
    let index = Math.floor((value - min) / width);
    if (index >= binCount) index = binCount - 1;
    if (index < 0) index = 0;
    (bins[index] as HistogramBin).count += 1;
  }
  return bins;
}

/**
 * Cosinus de chaque paire non ordonnee de vecteurs. Pour n vecteurs, renvoie
 * n(n-1)/2 valeurs. Quand la dimension grandit, ces cosinus se serrent autour de
 * zero : les directions deviennent presque toutes perpendiculaires.
 */
export function pairwiseCosines(vectors: number[][]): number[] {
  const cosines: number[] = [];
  for (let i = 0; i < vectors.length; i += 1) {
    for (let j = i + 1; j < vectors.length; j += 1) {
      cosines.push(cosineSimilarity(vectors[i] as number[], vectors[j] as number[]));
    }
  }
  return cosines;
}

// ---------------------------------------------------------------------------
// Qualite d'une recherche approchee
// ---------------------------------------------------------------------------

/**
 * Rappel@k : fraction des k plus proches voisins exacts qu'une liste approchee
 * retrouve dans ses k premiers. Un rappel de un signifie que l'approximatif n'a
 * rien manque ; un rappel de 0,8 signifie qu'un voisin exact sur cinq lui echappe.
 * On ne regarde que les k premiers de chaque liste.
 */
export function recallAtK(exactIds: string[], approxIds: string[], k: number): number {
  if (k < 1) {
    throw new Error('recallAtK requires k >= 1');
  }
  const exactTopK = new Set(exactIds.slice(0, k));
  const approxTopK = new Set(approxIds.slice(0, k));
  let found = 0;
  for (const id of exactTopK) {
    if (approxTopK.has(id)) {
      found += 1;
    }
  }
  return found / exactTopK.size;
}
