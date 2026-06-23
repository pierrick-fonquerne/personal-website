/**
 * Moteur pur de HNSW (Hierarchical Navigable Small World).
 *
 * Plutot que comparer la requete a tous les vecteurs (la recherche exhaustive du
 * chapitre 2), HNSW relie les points par un graphe de proximite et s'y deplace de
 * proche en proche : a chaque pas, on saute vers le voisin le plus proche de la
 * requete. Une regle aussi simple suffit a arriver pres du but en quelques sauts,
 * a deux conditions : que le graphe contienne des raccourcis longue portee (petit
 * monde), et qu'il soit empile en couches de plus en plus fines (la hierarchie, le
 * H de HNSW). Ce module construit cette structure de facon reproductible (RNG
 * seede) et y cherche le plus proche voisin, avec une largeur de faisceau reglable.
 *
 * Aucun texte de langue ici : tout le naturel (FR / EN) reste dans le composant.
 */

import { euclideanDistance } from '../similarity/similarity';

/** La structure HNSW complete : niveaux des points, couches, point d'entree. */
export interface HnswGraph {
  /** Niveau (couche maximale atteinte) de chaque point, indexe par identifiant. */
  levels: number[];
  /** Pour chaque couche L (0 = base, dense), l'adjacence : noeud -> voisins dans cette couche. */
  layers: Map<number, number[]>[];
  /** Identifiant du point d'entree : un point de niveau maximal, ou commence toute recherche. */
  entryPoint: number;
  /** Indice de la couche la plus haute existante. */
  maxLevel: number;
}

/** Le resultat d'une recherche dans une seule couche. */
export interface LayerSearchResult {
  /** Les identifiants visites, dans l'ordre de visite (le chemin parcouru). */
  visitedOrder: number[];
  /** Les meilleurs identifiants trouves, du plus proche au plus eloigne (au plus ef). */
  results: number[];
}

/** Le resultat d'une recherche HNSW complete, du sommet de la hierarchie a la base. */
export interface HnswSearchResult {
  /** L'identifiant du plus proche voisin trouve. */
  resultId: number;
  /** Le chemin complet visite, toutes couches confondues. */
  path: number[];
  /** Le chemin visite couche par couche, indexe par niveau (0 = base). */
  perLayerPath: number[][];
}

// ---------------------------------------------------------------------------
// Construction de la hierarchie
// ---------------------------------------------------------------------------

/**
 * Tire le niveau d'un nouveau point selon la loi exponentielle de HNSW :
 * `floor(-ln(u) * mL)`, ou `u` est uniforme dans (0, 1) et `mL` un multiplicateur.
 * La plupart des tirages donnent zero (le point ne vit que dans la couche dense de
 * base) ; de rares tirages donnent un niveau eleve, ces points devenant les rares
 * relais des couches hautes. C'est ce desequilibre qui fait de HNSW une skip-list
 * spatiale. Un tirage nul est ecarte (le logarithme de zero est infini).
 */
export function assignLevel(rng: () => number, levelMultiplier: number): number {
  let u = rng();
  while (u <= 1e-12) {
    u = rng();
  }
  return Math.floor(-Math.log(u) * levelMultiplier);
}

/**
 * Fabrique `count` points de dimension `dim`, chaque coordonnee uniforme dans
 * [0, 1). Le composant les dessine en dimension deux, mais le moteur ne suppose
 * aucune dimension particuliere.
 */
export function randomPoints(count: number, dim: number, rng: () => number): number[][] {
  const points: number[][] = [];
  for (let i = 0; i < count; i += 1) {
    const point: number[] = [];
    for (let j = 0; j < dim; j += 1) {
      point.push(rng());
    }
    points.push(point);
  }
  return points;
}

/**
 * Construit le graphe de proximite d'une couche : chaque noeud se relie a ses `M`
 * plus proches voisins parmi les noeuds presents, puis les aretes sont rendues
 * symetriques (si a pointe vers b, b pointe vers a). Les listes de voisins sont
 * triees par identifiant pour une adjacence parfaitement reproductible.
 */
function buildLayerGraph(
  points: number[][],
  nodeIds: number[],
  m: number,
): Map<number, number[]> {
  const sets = new Map<number, Set<number>>();
  for (const id of nodeIds) {
    sets.set(id, new Set<number>());
  }

  for (const a of nodeIds) {
    const neighbors = nodeIds
      .filter((b) => b !== a)
      .map((b) => ({ b, d: euclideanDistance(points[a] as number[], points[b] as number[]) }))
      .sort((left, right) => (left.d !== right.d ? left.d - right.d : left.b - right.b))
      .slice(0, m);
    for (const { b } of neighbors) {
      (sets.get(a) as Set<number>).add(b);
      (sets.get(b) as Set<number>).add(a);
    }
  }

  const layer = new Map<number, number[]>();
  for (const id of nodeIds) {
    layer.set(id, [...(sets.get(id) as Set<number>)].sort((x, y) => x - y));
  }
  return layer;
}

/**
 * Construit la structure HNSW complete a partir d'un nuage de points. Chaque point
 * recoit un niveau (loi exponentielle), puis chaque couche L est un graphe de
 * proximite parmi les points de niveau au moins L. La couche de base contient tous
 * les points ; les couches hautes, de plus en plus rares, servent de raccourcis. Le
 * point d'entree est un point de niveau maximal.
 */
export function buildHnsw(points: number[][], m: number, rng: () => number): HnswGraph {
  if (points.length === 0) {
    throw new Error('buildHnsw requires at least one point');
  }
  const levelMultiplier = 1 / Math.log(Math.max(2, m));
  const levels = points.map(() => assignLevel(rng, levelMultiplier));

  let maxLevel = 0;
  let entryPoint = 0;
  for (let i = 0; i < levels.length; i += 1) {
    if ((levels[i] as number) > maxLevel) {
      maxLevel = levels[i] as number;
      entryPoint = i;
    }
  }

  const layers: Map<number, number[]>[] = [];
  for (let level = 0; level <= maxLevel; level += 1) {
    const nodeIds: number[] = [];
    for (let i = 0; i < levels.length; i += 1) {
      if ((levels[i] as number) >= level) {
        nodeIds.push(i);
      }
    }
    layers.push(buildLayerGraph(points, nodeIds, m));
  }

  return { levels, layers, entryPoint, maxLevel };
}

// ---------------------------------------------------------------------------
// Recherche
// ---------------------------------------------------------------------------

/** Plus proche voisin exact par balayage complet : l'oracle du chapitre 2. */
export function exhaustiveNearest(points: number[][], query: number[]): number {
  if (points.length === 0) {
    throw new Error('exhaustiveNearest requires at least one point');
  }
  let best = 0;
  let bestDistance = euclideanDistance(points[0] as number[], query);
  for (let i = 1; i < points.length; i += 1) {
    const distance = euclideanDistance(points[i] as number[], query);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

/**
 * Recherche dans une seule couche, par faisceau (beam search) de largeur `ef`.
 *
 * On part des `entryPoints` et on entretient deux ensembles : les candidats encore
 * a explorer et les `ef` meilleurs resultats trouves. A chaque pas, on prend le
 * candidat le plus proche de la requete et on examine ses voisins ; un voisin entre
 * dans les resultats s'il est plus proche que le plus lointain deja retenu, ou si on
 * n'a pas encore `ef` resultats. On s'arrete quand le meilleur candidat restant est
 * plus loin que le plus lointain resultat. Avec `ef = 1`, c'est la pure navigation
 * gloutonne, qui peut rester coincee dans un minimum local ; elargir `ef` garde
 * plusieurs pistes ouvertes et permet de s'en extraire.
 */
export function searchLayer(
  layer: Map<number, number[]>,
  points: number[][],
  query: number[],
  entryPoints: number[],
  ef: number,
): LayerSearchResult {
  const distanceTo = (id: number): number => euclideanDistance(points[id] as number[], query);

  const visited = new Set<number>(entryPoints);
  const visitedOrder: number[] = [...entryPoints];
  const candidates = entryPoints.map((id) => ({ id, d: distanceTo(id) }));
  const results = entryPoints.map((id) => ({ id, d: distanceTo(id) }));

  const farthestDistance = (): number =>
    results.reduce((max, entry) => (entry.d > max ? entry.d : max), -Infinity);

  while (candidates.length > 0) {
    candidates.sort((left, right) => left.d - right.d);
    const closest = candidates.shift() as { id: number; d: number };

    if (results.length >= ef && closest.d > farthestDistance()) {
      break;
    }

    for (const neighbor of layer.get(closest.id) ?? []) {
      if (visited.has(neighbor)) {
        continue;
      }
      visited.add(neighbor);
      visitedOrder.push(neighbor);
      const neighborDistance = distanceTo(neighbor);

      if (results.length < ef || neighborDistance < farthestDistance()) {
        candidates.push({ id: neighbor, d: neighborDistance });
        results.push({ id: neighbor, d: neighborDistance });
        if (results.length > ef) {
          let worstIndex = 0;
          for (let i = 1; i < results.length; i += 1) {
            if ((results[i] as { d: number }).d > (results[worstIndex] as { d: number }).d) {
              worstIndex = i;
            }
          }
          results.splice(worstIndex, 1);
        }
      }
    }
  }

  results.sort((left, right) => (left.d !== right.d ? left.d - right.d : left.id - right.id));
  return { visitedOrder, results: results.map((entry) => entry.id) };
}

/**
 * Recherche HNSW complete : on entre par le sommet de la hierarchie et on descend
 * couche par couche. Dans les couches hautes, une navigation gloutonne (faisceau de
 * largeur un) amene vite dans la bonne region ; le meilleur point trouve sert de
 * point d'entree a la couche suivante. Arrive a la couche de base, on elargit le
 * faisceau a `ef` pour affiner et limiter le risque de manquer le vrai voisin.
 */
export function searchHnsw(
  graph: HnswGraph,
  points: number[][],
  query: number[],
  ef: number,
): HnswSearchResult {
  const perLayerPath: number[][] = new Array(graph.maxLevel + 1);
  const path: number[] = [];
  let entry = [graph.entryPoint];

  for (let level = graph.maxLevel; level >= 1; level -= 1) {
    const layerResult = searchLayer(graph.layers[level] as Map<number, number[]>, points, query, entry, 1);
    perLayerPath[level] = layerResult.visitedOrder;
    path.push(...layerResult.visitedOrder);
    entry = [layerResult.results[0] as number];
  }

  const baseResult = searchLayer(graph.layers[0] as Map<number, number[]>, points, query, entry, ef);
  perLayerPath[0] = baseResult.visitedOrder;
  path.push(...baseResult.visitedOrder);

  return { resultId: baseResult.results[0] as number, path, perLayerPath };
}
