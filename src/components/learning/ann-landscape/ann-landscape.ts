/**
 * Moteur pur du paysage des index ANN (Approximate Nearest Neighbor).
 *
 * Le chapitre precedent a construit HNSW. Mais HNSW n'est ni la seule facon
 * d'eviter le balayage complet, ni une solution gratuite. Ce module implemente
 * pour de vrai les quatre grandes familles d'index et les MESURE sur un meme jeu
 * de donnees, afin de rendre tangible le triangle des compromis : rappel, latence
 * et memoire ne se maximisent jamais tous les trois a la fois.
 *
 * Les quatre familles :
 *  - Flat   : balayage exact, l'oracle. Rappel parfait, mais touche les n vecteurs.
 *  - IVF    : partitionne l'espace en cellules, ne sonde que les nprobe plus proches.
 *             Gagne la latence, garde la memoire pleine.
 *  - HNSW   : navigue un graphe hierarchique (reutilise le moteur du chapitre 3).
 *             Gagne fortement la latence, paie des aretes en memoire.
 *  - PQ     : quantification produit, compresse chaque vecteur en quelques octets.
 *             Gagne la memoire, mais scanne toujours ~n codes et perd du rappel.
 *
 * La latence est mesuree par un proxy deterministe et reproductible : le nombre de
 * vecteurs candidats compares (distanceComputations). Mesurer un temps en
 * millisecondes serait bruite ; compter les comparaisons est exact et fidele a
 * l'ordre de grandeur. La memoire est estimee en octets (reel float32 = 4 octets).
 *
 * Aucun texte de langue ici : tout le naturel (FR / EN) reste dans le composant.
 */

import { euclideanDistance } from '../similarity/similarity';
import { buildHnsw, searchLayer, type HnswGraph } from '../hnsw/hnsw';

// ---------------------------------------------------------------------------
// Types partages
// ---------------------------------------------------------------------------

/** Les quatre familles d'index comparees. */
export type IndexFamily = 'flat' | 'ivf' | 'hnsw' | 'pq';

/** Un jeu de donnees : la base a indexer et les requetes pour la mesurer. */
export interface Dataset {
  /** Les vecteurs de la base, tous de meme dimension. */
  points: number[][];
  /** Les vecteurs de requete servant a mesurer rappel et latence moyens. */
  queries: number[][];
}

/** Parametres de generation d'un jeu de donnees groupe (clusters gaussiens). */
export interface DatasetOptions {
  /** Nombre de vecteurs de base. */
  pointCount: number;
  /** Dimension de chaque vecteur. */
  dimension: number;
  /** Nombre de requetes de mesure. */
  queryCount: number;
  /** Nombre de clusters (les embeddings reels se regroupent ; IVF en depend). */
  clusterCount: number;
  /** Ecart-type du bruit gaussien autour de chaque centre de cluster. */
  spread: number;
}

/** Le resultat brut d'une recherche : les voisins trouves et le cout paye. */
export interface SearchTrace {
  /** Identifiants des k voisins trouves, du plus proche au plus eloigne. */
  ids: number[];
  /** Nombre de vecteurs candidats compares (proxy de latence). */
  distanceComputations: number;
}

/** Le profil mesure d'un index : sa position dans le triangle des compromis. */
export interface IndexProfile {
  /** La famille mesuree. */
  family: IndexFamily;
  /** Rappel@k moyen sur les requetes, dans [0, 1] (1 = parfait). */
  recall: number;
  /** Nombre moyen de comparaisons par requete (proxy de latence). */
  distanceComputations: number;
  /** Memoire de l'index, en octets. */
  memoryBytes: number;
}

/** Taille en octets d'un reel simple precision (float32). */
export const BYTES_PER_FLOAT = 4;

// ---------------------------------------------------------------------------
// Jeu de donnees et oracle exact
// ---------------------------------------------------------------------------

/**
 * Tire un reel selon une loi normale centree reduite par Box-Muller.
 * Garde-fou identique a gaussianSample de dimension-curse.ts.
 */
function gaussianSample(rng: () => number): number {
  let u = rng();
  while (u <= 1e-12) {
    u = rng();
  }
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Fabrique un jeu de donnees groupe en clusters gaussiens, de facon reproductible
 * (RNG seede). Chaque point est tire autour d'un centre de cluster, avec un bruit
 * gaussien d'ecart-type `spread`. Les requetes sont generees de la meme loi. Des
 * donnees groupees rendent le partitionnement IVF reellement pertinent, comme le
 * sont les embeddings reels qui se regroupent par sens.
 */
export function makeClusteredDataset(options: DatasetOptions, rng: () => number): Dataset {
  const { pointCount, dimension, queryCount, clusterCount, spread } = options;

  // Tire clusterCount centres dans [0, 1)^dimension
  const centers: number[][] = [];
  for (let c = 0; c < clusterCount; c += 1) {
    const center: number[] = [];
    for (let d = 0; d < dimension; d += 1) {
      center.push(rng());
    }
    centers.push(center);
  }

  // Tire les points de base : centre au hasard + bruit gaussien * spread
  const points: number[][] = [];
  for (let i = 0; i < pointCount; i += 1) {
    const clusterIndex = Math.floor(rng() * clusterCount);
    const center = centers[clusterIndex] as number[];
    const point: number[] = [];
    for (let d = 0; d < dimension; d += 1) {
      point.push((center[d] as number) + gaussianSample(rng) * spread);
    }
    points.push(point);
  }

  // Tire les requetes de la meme loi
  const queries: number[][] = [];
  for (let i = 0; i < queryCount; i += 1) {
    const clusterIndex = Math.floor(rng() * clusterCount);
    const center = centers[clusterIndex] as number[];
    const query: number[] = [];
    for (let d = 0; d < dimension; d += 1) {
      query.push((center[d] as number) + gaussianSample(rng) * spread);
    }
    queries.push(query);
  }

  return { points, queries };
}

/**
 * Les k plus proches voisins exacts d'une requete, par balayage complet : l'oracle
 * de verite contre lequel on mesure le rappel des index approches. Renvoie les
 * identifiants tries du plus proche au plus eloigne.
 */
export function exactNeighbors(points: number[][], query: number[], k: number): number[] {
  const scored = points.map((point, id) => ({
    id,
    d: euclideanDistance(point as number[], query),
  }));
  scored.sort((a, b) => (a.d !== b.d ? a.d - b.d : a.id - b.id));
  return scored.slice(0, Math.min(k, points.length)).map((entry) => entry.id);
}

/**
 * Rappel@k : fraction des vrais voisins (`truth`) effectivement retrouves dans la
 * liste `retrieved`. Vaut 1 quand tous les vrais voisins sont retrouves, 0 quand
 * aucun ne l'est. L'ordre n'importe pas, seule compte la presence.
 */
export function recallAtK(retrieved: number[], truth: number[]): number {
  if (truth.length === 0) return 0;
  const truthSet = new Set(truth);
  let hits = 0;
  for (const id of retrieved) {
    if (truthSet.has(id)) {
      hits += 1;
    }
  }
  return hits / truth.length;
}

// ---------------------------------------------------------------------------
// k-means (partage par IVF et PQ)
// ---------------------------------------------------------------------------

/** Le resultat d'un k-means : les centroides et l'affectation de chaque vecteur. */
export interface KMeansResult {
  /** Les `k` centroides, chacun de la dimension des vecteurs. */
  centroids: number[][];
  /** Pour chaque vecteur d'entree, l'indice du centroide le plus proche. */
  assignments: number[];
}

/**
 * Retourne l'indice du centroide le plus proche d'un vecteur (tie-break : plus petit indice).
 */
function nearestCentroid(vector: number[], centroids: number[][]): number {
  let best = 0;
  let bestDist = euclideanDistance(vector, centroids[0] as number[]);
  for (let c = 1; c < centroids.length; c += 1) {
    const dist = euclideanDistance(vector, centroids[c] as number[]);
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

/**
 * Partitionne des vecteurs en `k` groupes par l'algorithme de Lloyd, de facon
 * reproductible : initialisation par tirage seede de `k` vecteurs distincts, puis
 * iterations d'affectation au centroide le plus proche et de recentrage. Un cluster
 * vide conserve son centroide precedent. Sert a la fois aux cellules d'IVF et aux
 * codebooks de la quantification produit.
 */
export function kMeans(
  vectors: number[][],
  k: number,
  rng: () => number,
  iterations = 10,
): KMeansResult {
  const dim = (vectors[0] as number[]).length;

  // Init k-means++ : premier centre tire au hasard, suivants proportionnels a D^2
  const centroidIndices: number[] = [];
  const firstIndex = Math.floor(rng() * vectors.length);
  centroidIndices.push(firstIndex);

  for (let c = 1; c < k; c += 1) {
    // Calcule la distance au carre de chaque vecteur au centre le plus proche deja choisi
    const distances: number[] = vectors.map((vector) => {
      let minDist = Infinity;
      for (const idx of centroidIndices) {
        const d = euclideanDistance(vector, vectors[idx] as number[]);
        if (d < minDist) minDist = d;
      }
      return minDist * minDist;
    });

    // Tirage proportionnel a D^2
    const total = distances.reduce((sum, d) => sum + d, 0);
    let threshold = rng() * total;
    let chosen = vectors.length - 1;
    for (let i = 0; i < distances.length; i += 1) {
      threshold -= distances[i] as number;
      if (threshold <= 0) {
        chosen = i;
        break;
      }
    }
    centroidIndices.push(chosen);
  }

  // Centroides initiaux : copies des vecteurs choisis
  let centroids: number[][] = centroidIndices.map((idx) => [...(vectors[idx] as number[])]);

  // Iterations de Lloyd
  let assignments: number[] = new Array(vectors.length).fill(0) as number[];
  for (let iter = 0; iter < iterations; iter += 1) {
    // Affectation
    assignments = vectors.map((vector) => nearestCentroid(vector, centroids));

    // Recentrage
    const sums: number[][] = Array.from({ length: k }, () => new Array(dim).fill(0) as number[]);
    const counts: number[] = new Array(k).fill(0) as number[];
    for (let i = 0; i < vectors.length; i += 1) {
      const c = assignments[i] as number;
      counts[c] = (counts[c] as number) + 1;
      const sum = sums[c] as number[];
      const vec = vectors[i] as number[];
      for (let d = 0; d < dim; d += 1) {
        sum[d] = (sum[d] as number) + (vec[d] as number);
      }
    }

    // Nouveaux centroides (cluster vide : garde l'ancien centroide)
    const newCentroids: number[][] = [];
    for (let c = 0; c < k; c += 1) {
      const count = counts[c] as number;
      if (count === 0) {
        newCentroids.push([...(centroids[c] as number[])]);
      } else {
        const sum = sums[c] as number[];
        newCentroids.push(sum.map((s) => s / count));
      }
    }
    centroids = newCentroids;
  }

  return { centroids, assignments };
}

// ---------------------------------------------------------------------------
// IVF : fichier inverse (partitionnement de l'espace)
// ---------------------------------------------------------------------------

/** Un index IVF : des cellules (centroides) et la liste des membres de chacune. */
export interface IvfIndex {
  /** Les centroides des cellules. */
  centroids: number[][];
  /** Pour chaque cellule, les identifiants des points qui lui sont affectes. */
  cells: number[][];
}

/**
 * Construit un index IVF : un k-means decoupe l'espace en `cellCount` cellules, et
 * chaque point est range dans la cellule de son centroide le plus proche. A la
 * recherche, on ne visitera que les cellules les plus proches de la requete.
 */
export function buildIvf(points: number[][], cellCount: number, rng: () => number): IvfIndex {
  const { centroids, assignments } = kMeans(points, cellCount, rng);

  const cells: number[][] = Array.from({ length: cellCount }, () => []);
  for (let i = 0; i < assignments.length; i += 1) {
    const c = assignments[i] as number;
    (cells[c] as number[]).push(i);
  }

  return { centroids, cells };
}

/**
 * Recherche IVF : on compare la requete aux `cellCount` centroides, on retient les
 * `nprobe` cellules les plus proches, puis on ne scanne que leurs membres pour en
 * extraire les k plus proches. Le cout total compte les centroides plus les membres
 * scannes : c'est la ou IVF gagne en latence quand `nprobe` reste petit. A
 * `nprobe = cellCount`, on rescanne tout et le rappel redevient parfait.
 */
export function searchIvf(
  index: IvfIndex,
  points: number[][],
  query: number[],
  k: number,
  nprobe: number,
): SearchTrace {
  const cellCount = index.centroids.length;

  // Compare aux cellCount centroides
  const cellDistances = index.centroids.map((centroid, c) => ({
    c,
    d: euclideanDistance(centroid as number[], query),
  }));
  cellDistances.sort((a, b) => a.d - b.d);

  // Retient les nprobe cellules les plus proches et scanne leurs membres
  const probed = cellDistances.slice(0, nprobe);
  const candidates: { id: number; d: number }[] = [];
  let membersScanned = 0;

  for (const { c } of probed) {
    const cell = index.cells[c] as number[];
    for (const pointId of cell) {
      candidates.push({
        id: pointId,
        d: euclideanDistance(points[pointId] as number[], query),
      });
      membersScanned += 1;
    }
  }

  candidates.sort((a, b) => (a.d !== b.d ? a.d - b.d : a.id - b.id));
  const ids = candidates.slice(0, k).map((entry) => entry.id);

  return {
    ids,
    distanceComputations: cellCount + membersScanned,
  };
}

// ---------------------------------------------------------------------------
// PQ : quantification produit (compression des vecteurs)
// ---------------------------------------------------------------------------

/**
 * Un quantificateur produit : la dimension est decoupee en `subquantizers`
 * sous-espaces, chacun avec son propre codebook de `codesPerSubquantizer` centroides.
 * Chaque vecteur de base devient une suite de codes (un par sous-espace), et n'est
 * plus jamais stocke en clair : c'est la source de l'economie memoire.
 */
export interface ProductQuantizer {
  /** Nombre de sous-espaces (sous-quantificateurs). */
  subquantizers: number;
  /** Nombre de centroides par sous-espace (la taille de chaque codebook). */
  codesPerSubquantizer: number;
  /** Dimension d'un sous-vecteur (dimension totale / subquantizers). */
  subDimension: number;
  /** Pour chaque sous-espace, son codebook (codesPerSubquantizer centroides). */
  codebooks: number[][][];
  /** Pour chaque point de base, ses codes (un indice de centroide par sous-espace). */
  codes: number[][];
}

/**
 * Apprend un quantificateur produit sur un nuage de points : on decoupe chaque
 * vecteur en `subquantizers` tranches de dimension egale, on apprend un codebook par
 * tranche (k-means a `codesPerSubquantizer` centroides), puis on encode chaque point
 * par l'indice du centroide le plus proche dans chaque tranche. La dimension doit
 * etre divisible par `subquantizers`.
 */
export function buildProductQuantizer(
  points: number[][],
  subquantizers: number,
  codesPerSubquantizer: number,
  rng: () => number,
): ProductQuantizer {
  const dimension = (points[0] as number[]).length;
  if (dimension % subquantizers !== 0) {
    throw new Error(
      `dimension (${dimension}) must be divisible by subquantizers (${subquantizers})`,
    );
  }

  const subDimension = dimension / subquantizers;
  const codebooks: number[][][] = [];
  const subVectorsPerSlice: number[][][] = Array.from({ length: subquantizers }, () => []);

  // Decoupe chaque point en tranches
  for (const point of points) {
    for (let s = 0; s < subquantizers; s += 1) {
      const start = s * subDimension;
      const slice = (point as number[]).slice(start, start + subDimension);
      (subVectorsPerSlice[s] as number[][]).push(slice);
    }
  }

  // Apprend un codebook par tranche
  for (let s = 0; s < subquantizers; s += 1) {
    const { centroids } = kMeans(subVectorsPerSlice[s] as number[][], codesPerSubquantizer, rng);
    codebooks.push(centroids);
  }

  // Encode chaque point
  const codes: number[][] = [];
  for (const point of points) {
    const code: number[] = [];
    for (let s = 0; s < subquantizers; s += 1) {
      const start = s * subDimension;
      const slice = (point as number[]).slice(start, start + subDimension);
      const codebook = codebooks[s] as number[][];
      let bestCode = 0;
      let bestDist = euclideanDistance(slice, codebook[0] as number[]);
      for (let c = 1; c < codebook.length; c += 1) {
        const dist = euclideanDistance(slice, codebook[c] as number[]);
        if (dist < bestDist) {
          bestDist = dist;
          bestCode = c;
        }
      }
      code.push(bestCode);
    }
    codes.push(code);
  }

  return { subquantizers, codesPerSubquantizer, subDimension, codebooks, codes };
}

/**
 * Recherche PQ asymetrique : pour chaque sous-espace on precalcule la distance de la
 * tranche de requete a chacun des centroides du codebook (une petite table), puis on
 * estime la distance a chaque point de base en sommant les entrees de table designees
 * par ses codes. On scanne ainsi les n points, mais chaque comparaison est une simple
 * somme de valeurs precalculees. Le cout en comparaisons reste de l'ordre de n :
 * c'est pourquoi la PQ seule gagne la memoire, pas la latence.
 */
export function searchPq(
  pq: ProductQuantizer,
  query: number[],
  k: number,
): SearchTrace {
  const { subquantizers, codesPerSubquantizer, subDimension, codebooks, codes } = pq;

  // Precalcule les tables de distance au carre pour chaque tranche de requete
  const tables: number[][] = [];
  for (let s = 0; s < subquantizers; s += 1) {
    const start = s * subDimension;
    const querySlice = query.slice(start, start + subDimension);
    const codebook = codebooks[s] as number[][];
    const table: number[] = [];
    for (let c = 0; c < codesPerSubquantizer; c += 1) {
      const d = euclideanDistance(querySlice, codebook[c] as number[]);
      table.push(d * d);
    }
    tables.push(table);
  }

  // Estime la distance de chaque point via ses codes
  const scored: { id: number; dist: number }[] = [];
  for (let i = 0; i < codes.length; i += 1) {
    const code = codes[i] as number[];
    let distSquared = 0;
    for (let s = 0; s < subquantizers; s += 1) {
      const codeIdx = code[s] as number;
      distSquared += (tables[s] as number[])[codeIdx] as number;
    }
    scored.push({ id: i, dist: distSquared });
  }

  scored.sort((a, b) => (a.dist !== b.dist ? a.dist - b.dist : a.id - b.id));
  const ids = scored.slice(0, k).map((entry) => entry.id);

  return {
    ids,
    distanceComputations: codes.length,
  };
}

// ---------------------------------------------------------------------------
// HNSW : enveloppe top-k au-dessus du moteur du chapitre 3
// ---------------------------------------------------------------------------

/**
 * Recherche HNSW renvoyant les k plus proches voisins et le nombre de noeuds
 * visites (le proxy de latence). Reutilise la descente hierarchique du chapitre 3 :
 * navigation gloutonne dans les couches hautes, faisceau de largeur `ef` a la base.
 * Chaque noeud visite compte pour une comparaison.
 */
export function searchHnswTopK(
  graph: HnswGraph,
  points: number[][],
  query: number[],
  k: number,
  ef: number,
): SearchTrace {
  let totalVisited = 0;
  let entry = [graph.entryPoint];

  // Couches hautes : faisceau glouton de largeur 1
  for (let level = graph.maxLevel; level >= 1; level -= 1) {
    const layerResult = searchLayer(
      graph.layers[level] as Map<number, number[]>,
      points,
      query,
      entry,
      1,
    );
    totalVisited += layerResult.visitedOrder.length;
    entry = [layerResult.results[0] as number];
  }

  // Couche de base : faisceau de largeur ef
  const baseResult = searchLayer(
    graph.layers[0] as Map<number, number[]>,
    points,
    query,
    entry,
    ef,
  );
  totalVisited += baseResult.visitedOrder.length;

  // Top-k parmi les resultats de la couche de base
  const ids = baseResult.results.slice(0, k);

  return {
    ids,
    distanceComputations: totalVisited,
  };
}

// ---------------------------------------------------------------------------
// Estimateurs de memoire
// ---------------------------------------------------------------------------

/** Memoire d'un index plat : les n vecteurs stockes en clair. */
export function flatMemoryBytes(pointCount: number, dimension: number): number {
  return pointCount * dimension * BYTES_PER_FLOAT;
}

/** Memoire d'un index IVF : les vecteurs en clair, plus les centroides, plus l'affectation. */
export function ivfMemoryBytes(index: IvfIndex, pointCount: number, dimension: number): number {
  const vectorsBytes = pointCount * dimension * BYTES_PER_FLOAT;
  const centroidsBytes = index.centroids.length * dimension * BYTES_PER_FLOAT;
  const assignmentBytes = pointCount * BYTES_PER_FLOAT;
  return vectorsBytes + centroidsBytes + assignmentBytes;
}

/** Memoire d'un index HNSW : les vecteurs en clair, plus toutes les aretes du graphe. */
export function hnswMemoryBytes(graph: HnswGraph, pointCount: number, dimension: number): number {
  const vectorsBytes = pointCount * dimension * BYTES_PER_FLOAT;

  // Somme des longueurs de toutes les listes de voisins sur toutes les couches
  let totalEdges = 0;
  for (const layer of graph.layers) {
    for (const neighbors of layer.values()) {
      totalEdges += neighbors.length;
    }
  }
  const edgesBytes = totalEdges * BYTES_PER_FLOAT;

  return vectorsBytes + edgesBytes;
}

/** Memoire d'un index PQ : les codebooks, plus un octet de code par sous-espace et par point. */
export function pqMemoryBytes(pq: ProductQuantizer, pointCount: number): number {
  const codebooksBytes =
    pq.subquantizers * pq.codesPerSubquantizer * pq.subDimension * BYTES_PER_FLOAT;
  // 1 octet par code (uint8 suffisant pour jusqu'a 256 centroides)
  const codesBytes = pointCount * pq.subquantizers * 1;
  return codebooksBytes + codesBytes;
}

// ---------------------------------------------------------------------------
// Profileurs : mesurent une famille sur tout le jeu de donnees
// ---------------------------------------------------------------------------

/** Profil de l'index plat : rappel parfait, n comparaisons, memoire pleine. */
export function profileFlat(dataset: Dataset, k: number): IndexProfile {
  const { points, queries } = dataset;
  const n = points.length;
  const dim = (points[0] as number[]).length;

  let totalRecall = 0;
  for (const query of queries) {
    const truth = exactNeighbors(points, query as number[], k);
    totalRecall += recallAtK(truth, truth);
  }

  return {
    family: 'flat',
    recall: totalRecall / queries.length,
    distanceComputations: n,
    memoryBytes: flatMemoryBytes(n, dim),
  };
}

/** Profil d'un index IVF pour une configuration (cellCount, nprobe) donnee. */
export function profileIvf(
  dataset: Dataset,
  k: number,
  config: { cellCount: number; nprobe: number },
  rng: () => number,
): IndexProfile {
  const { points, queries } = dataset;
  const n = points.length;
  const dim = (points[0] as number[]).length;

  const index = buildIvf(points, config.cellCount, rng);

  let totalRecall = 0;
  let totalComputations = 0;
  for (const query of queries) {
    const truth = exactNeighbors(points, query as number[], k);
    const trace = searchIvf(index, points, query as number[], k, config.nprobe);
    totalRecall += recallAtK(trace.ids, truth);
    totalComputations += trace.distanceComputations;
  }

  return {
    family: 'ivf',
    recall: totalRecall / queries.length,
    distanceComputations: totalComputations / queries.length,
    memoryBytes: ivfMemoryBytes(index, n, dim),
  };
}

/** Profil d'un index HNSW pour une configuration (m, ef) donnee. */
export function profileHnsw(
  dataset: Dataset,
  k: number,
  config: { m: number; ef: number },
  rng: () => number,
): IndexProfile {
  const { points, queries } = dataset;
  const n = points.length;
  const dim = (points[0] as number[]).length;

  const graph = buildHnsw(points, config.m, rng);

  let totalRecall = 0;
  let totalComputations = 0;
  for (const query of queries) {
    const truth = exactNeighbors(points, query as number[], k);
    const trace = searchHnswTopK(graph, points, query as number[], k, config.ef);
    totalRecall += recallAtK(trace.ids, truth);
    totalComputations += trace.distanceComputations;
  }

  return {
    family: 'hnsw',
    recall: totalRecall / queries.length,
    distanceComputations: totalComputations / queries.length,
    memoryBytes: hnswMemoryBytes(graph, n, dim),
  };
}

/** Profil d'un index PQ pour une configuration (subquantizers, codesPerSubquantizer) donnee. */
export function profilePq(
  dataset: Dataset,
  k: number,
  config: { subquantizers: number; codesPerSubquantizer: number },
  rng: () => number,
): IndexProfile {
  const { points, queries } = dataset;
  const n = points.length;

  const pq = buildProductQuantizer(points, config.subquantizers, config.codesPerSubquantizer, rng);

  let totalRecall = 0;
  let totalComputations = 0;
  for (const query of queries) {
    const truth = exactNeighbors(points, query as number[], k);
    const trace = searchPq(pq, query as number[], k);
    totalRecall += recallAtK(trace.ids, truth);
    totalComputations += trace.distanceComputations;
  }

  return {
    family: 'pq',
    recall: totalRecall / queries.length,
    distanceComputations: totalComputations / queries.length,
    memoryBytes: pqMemoryBytes(pq, n),
  };
}
