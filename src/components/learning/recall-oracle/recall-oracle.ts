/**
 * Moteur pur de l'oracle differentiel.
 *
 * Le chapitre precedent mesurait sans cesse le rappel d'un index approche "contre
 * l'oracle exact". Ce module construit ce juge et montre POURQUOI il est
 * indispensable : un algorithme approche peut satisfaire toutes ses proprietes
 * locales (renvoie k resultats, tries, distincts) et passer ses revues, tout en
 * s'effondrant en qualite globale (le rappel). Seule une comparaison a une
 * reference lente-mais-exacte revele l'effondrement.
 *
 * Pour le rendre tangible, la recherche par faisceau est VOLONTAIREMENT buggable.
 * Deux vrais bugs, rencontres en construisant un moteur HNSW, sont activables :
 *  - invertedHeap : a la saturation du faisceau, on evince le MEILLEUR candidat au
 *    lieu du pire (le tas dans le mauvais sens). On garde les mauvais, le rappel chute.
 *  - halvedConnectivity : le graphe est bati avec moitie moins de voisins par noeud
 *    (un .min() de trop), il se fragmente, la recherche atteint moins de bonnes zones.
 *
 * Dans les deux cas les controles LOCAUX restent verts ; seul l'oracle differentiel
 * vire au rouge. C'est tout le propos du chapitre.
 *
 * Aucun texte de langue ici : tout le naturel (FR / EN) reste dans le composant.
 */

import { euclideanDistance } from '../similarity/similarity';
import { exactNeighbors, recallAtK } from '../ann-landscape/ann-landscape';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Un graphe de proximite : pour chaque noeud, la liste de ses voisins. */
export interface ProximityGraph {
  /** adjacency[i] = identifiants des voisins du noeud i (tries par identifiant). */
  adjacency: number[][];
  /** Le degre effectif utilise a la construction (voisins vises par noeud). */
  degree: number;
}

/** Configuration d'une recherche par faisceau, avec ses interrupteurs de bug. */
export interface BeamSearchConfig {
  /** Largeur de faisceau : nombre de candidats retenus pendant l'exploration. */
  ef: number;
  /** Nombre de voisins a renvoyer. */
  k: number;
  /** Bug 1 : a saturation, evincer le meilleur au lieu du pire (tas inverse). */
  invertedHeap?: boolean;
  /** Identifiant du noeud de depart (par defaut 0). */
  entryPoint?: number;
}

/** Le resultat d'une recherche par faisceau. */
export interface BeamSearchResult {
  /** Les k identifiants renvoyes, du plus proche au plus eloigne. */
  ids: number[];
  /** Les identifiants visites dans l'ordre de visite (le chemin parcouru). */
  visitedOrder: number[];
}

/** Les controles LOCAUX (tests unitaires structurels) d'un resultat. */
export interface LocalChecks {
  /** Le resultat contient bien le nombre attendu d'identifiants. */
  returnsK: boolean;
  /** Les identifiants sont tries par distance croissante a la requete. */
  sortedByDistance: boolean;
  /** Les identifiants sont tous distincts. */
  idsDistinct: boolean;
}

/** Le rapport de l'oracle differentiel sur un jeu de requetes. */
export interface OracleEvaluation {
  /** Rappel@k moyen contre l'oracle exact, dans [0, 1]. */
  recall: number;
  /** Vrai si tous les controles locaux passent sur toutes les requetes. */
  localChecksAllPass: boolean;
  /** Nombre moyen de noeuds visites par requete (proxy de cout). */
  meanVisited: number;
}

// ---------------------------------------------------------------------------
// Construction du graphe de proximite
// ---------------------------------------------------------------------------

/**
 * Construit un graphe de proximite : chaque noeud est relie a ses `degree` plus
 * proches voisins, les aretes etant rendues symetriques. Si `halvedConnectivity`
 * est vrai, le degre effectif est divise par deux (au moins un), ce qui fragmente
 * le graphe : c'est le second bug du chapitre, qui degrade le rappel sans casser
 * la moindre propriete locale.
 */
export function buildProximityGraph(
  points: number[][],
  degree: number,
  halvedConnectivity = false,
): ProximityGraph {
  const eff = halvedConnectivity ? Math.max(1, Math.floor(degree / 2)) : degree;
  const n = points.length;

  // Build initial neighbor sets (directed).
  const sets: Set<number>[] = Array.from({ length: n }, () => new Set<number>());

  for (let i = 0; i < n; i += 1) {
    const scored = [];
    for (let j = 0; j < n; j += 1) {
      if (j === i) continue;
      const d = euclideanDistance(points[i] as number[], points[j] as number[]);
      scored.push({ j, d });
    }
    scored.sort((a, b) => (a.d !== b.d ? a.d - b.d : a.j - b.j));
    for (let r = 0; r < Math.min(eff, scored.length); r += 1) {
      const { j } = scored[r] as { j: number; d: number };
      (sets[i] as Set<number>).add(j);
    }
  }

  // Make edges symmetric.
  for (let i = 0; i < n; i += 1) {
    for (const j of sets[i] as Set<number>) {
      (sets[j] as Set<number>).add(i);
    }
  }

  // Build sorted adjacency lists (no duplicates, no self-loops guaranteed by construction).
  const adjacency: number[][] = sets.map((s) => Array.from(s).sort((a, b) => a - b));

  return { adjacency, degree: eff };
}

// ---------------------------------------------------------------------------
// Recherche par faisceau (buggable)
// ---------------------------------------------------------------------------

/**
 * Recherche par faisceau des k plus proches voisins dans le graphe de proximite.
 *
 * Exploration toujours du plus proche au plus eloigne. On entretient un faisceau
 * des `ef` meilleurs candidats vus. A SATURATION du faisceau, le comportement
 * correct evince le candidat le PLUS ELOIGNE ; le bug `invertedHeap` evince le plus
 * proche, gardant les mauvais candidats (le tas dans le mauvais sens). On renvoie
 * les `k` plus proches du faisceau final, tries, ainsi que l'ordre de visite.
 *
 * Quel que soit le bug, le resultat reste STRUCTURELLEMENT bien forme (k ids tries
 * et distincts) : c'est ce qui rend les bugs invisibles aux controles locaux.
 */
export function beamSearchKnn(
  graph: ProximityGraph,
  points: number[][],
  query: number[],
  config: BeamSearchConfig,
): BeamSearchResult {
  const { ef, k, invertedHeap = false, entryPoint = 0 } = config;

  const distanceTo = (id: number): number =>
    euclideanDistance(points[id] as number[], query);

  const visited = new Set<number>([entryPoint]);
  const visitedOrder: number[] = [entryPoint];

  // Each entry: { id, d } where d = distance to query.
  type Entry = { id: number; d: number };

  const startD = distanceTo(entryPoint);
  // candidates: frontier to explore, sorted closest-first.
  const candidates: Entry[] = [{ id: entryPoint, d: startD }];
  // results: best ef candidates seen so far.
  const results: Entry[] = [{ id: entryPoint, d: startD }];

  const farthestInResults = (): number =>
    results.reduce((max, e) => (e.d > max ? e.d : max), -Infinity);

  while (candidates.length > 0) {
    // Take the closest candidate to the query.
    candidates.sort((a, b) => a.d - b.d);
    const closest = candidates.shift() as Entry;

    // Standard termination: if results is full and this candidate is farther than our worst result, stop.
    if (results.length >= ef && closest.d > farthestInResults()) {
      break;
    }

    // Expand neighbors.
    for (const neighbor of graph.adjacency[closest.id] ?? []) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      visitedOrder.push(neighbor);

      const nd = distanceTo(neighbor);
      const farthest = farthestInResults();

      // Add to results and candidates if it improves the beam.
      if (results.length < ef || nd < farthest) {
        candidates.push({ id: neighbor, d: nd });
        results.push({ id: neighbor, d: nd });

        // Evict if over capacity.
        if (results.length > ef) {
          if (invertedHeap) {
            // Bug: evict the CLOSEST (keep bad candidates).
            results.sort((a, b) => a.d - b.d);
            results.shift();
          } else {
            // Correct: evict the FARTHEST.
            results.sort((a, b) => a.d - b.d);
            results.pop();
          }
        }
      }
    }
  }

  // Return the k closest from results, sorted by distance then id for tie-break.
  results.sort((a, b) => (a.d !== b.d ? a.d - b.d : a.id - b.id));
  let chosen = results.slice(0, k);

  // Guarantee k well-formed ids even when the beam stayed too small (narrow ef, or
  // a graph fragmented by the connectivity bug isolating a tiny component): complete
  // from the visited nodes, closest first, then re-sort. This only triggers in those
  // degenerate cases ; in the normal case results already holds at least k entries
  // and the buggy retention is preserved untouched. It keeps the structural contract
  // (returns k, sorted, distinct) green in every mode, which is exactly what the
  // local checks must keep observing.
  if (chosen.length < k) {
    const present = new Set(chosen.map((e) => e.id));
    const extra = visitedOrder
      .filter((id) => !present.has(id))
      .map((id) => ({ id, d: distanceTo(id) }))
      .sort((a, b) => (a.d !== b.d ? a.d - b.d : a.id - b.id))
      .slice(0, k - chosen.length);
    chosen = chosen.concat(extra).sort((a, b) => (a.d !== b.d ? a.d - b.d : a.id - b.id));
  }

  const ids = chosen.map((e) => e.id);

  return { ids, visitedOrder };
}

// ---------------------------------------------------------------------------
// Controles locaux et oracle differentiel
// ---------------------------------------------------------------------------

/**
 * Verifie les proprietes LOCALES d'un resultat : bon nombre d'identifiants, tries
 * par distance croissante, tous distincts. Ces controles passent que la recherche
 * soit correcte ou buggee, car le resultat est toujours bien forme. C'est
 * exactement le piege : ils ne disent rien de la QUALITE (le rappel).
 */
export function localChecks(
  result: BeamSearchResult,
  points: number[][],
  query: number[],
  k: number,
): LocalChecks {
  const { ids } = result;

  const returnsK = ids.length === k;

  // Check that distances are non-decreasing.
  let sortedByDistance = true;
  for (let i = 1; i < ids.length; i += 1) {
    const dPrev = euclideanDistance(points[ids[i - 1] as number] as number[], query);
    const dCurr = euclideanDistance(points[ids[i] as number] as number[], query);
    if (dCurr < dPrev) {
      sortedByDistance = false;
      break;
    }
  }

  const idsDistinct = new Set(ids).size === ids.length;

  return { returnsK, sortedByDistance, idsDistinct };
}

/**
 * Rappel@k d'un resultat pour une requete : fraction des vrais k plus proches
 * (donnes par l'oracle exact) effectivement retrouves. Delegue a l'oracle exact
 * du chapitre 4 et a la mesure de rappel.
 */
export function recallForQuery(
  result: BeamSearchResult,
  points: number[][],
  query: number[],
  k: number,
): number {
  const truth = exactNeighbors(points, query, k);
  return recallAtK(result.ids, truth);
}

/**
 * L'oracle differentiel : fait tourner la recherche par faisceau (avec la config
 * et ses eventuels bugs) sur tout un jeu de requetes, et confronte chaque resultat
 * a l'oracle exact. Renvoie le rappel moyen, le verdict global des controles locaux
 * (vrai meme quand un bug est actif), et le cout moyen. Le coeur du chapitre : le
 * rappel chute pendant que les controles locaux restent verts.
 */
export function evaluateAgainstOracle(
  graph: ProximityGraph,
  points: number[][],
  queries: number[][],
  k: number,
  config: Omit<BeamSearchConfig, 'k'>,
): OracleEvaluation {
  let totalRecall = 0;
  let localChecksAllPass = true;
  let totalVisited = 0;

  for (const query of queries) {
    const q = query as number[];
    const searchResult = beamSearchKnn(graph, points, q, { ...config, k });
    const recall = recallForQuery(searchResult, points, q, k);
    const checks = localChecks(searchResult, points, q, k);

    totalRecall += recall;
    totalVisited += searchResult.visitedOrder.length;

    if (!checks.returnsK || !checks.sortedByDistance || !checks.idsDistinct) {
      localChecksAllPass = false;
    }
  }

  const n = queries.length;
  return {
    recall: n > 0 ? totalRecall / n : 0,
    localChecksAllPass,
    meanVisited: n > 0 ? totalVisited / n : 0,
  };
}
