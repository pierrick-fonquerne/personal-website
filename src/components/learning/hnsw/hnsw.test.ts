import { describe, it, expect } from 'vitest';
import {
  assignLevel,
  randomPoints,
  buildHnsw,
  searchLayer,
  searchHnsw,
  exhaustiveNearest,
} from './hnsw';

describe('assignLevel', () => {
  it('renvoie toujours un entier positif ou nul', () => {
    const rng = (() => {
      const values = [0.001, 0.5, 0.9999, 0.2, 0.7];
      let i = 0;
      return () => values[i++ % values.length] as number;
    })();
    for (let k = 0; k < 20; k += 1) {
      const level = assignLevel(rng, 1 / Math.log(8));
      expect(Number.isInteger(level)).toBe(true);
      expect(level).toBeGreaterThanOrEqual(0);
    }
  });

  it('suit la formule floor(-ln(u) * mL)', () => {
    const mL = 1 / Math.log(8);
    expect(assignLevel(() => 0.5, mL)).toBe(Math.floor(-Math.log(0.5) * mL));
    expect(assignLevel(() => 0.01, mL)).toBe(Math.floor(-Math.log(0.01) * mL));
  });

  it('ecarte un tirage nul (log(0) infini) et prend le suivant', () => {
    const values = [0, 0.5];
    let i = 0;
    const rng = () => values[i++] as number;
    const mL = 1 / Math.log(8);
    expect(assignLevel(rng, mL)).toBe(Math.floor(-Math.log(0.5) * mL));
  });

  it('donne surtout des niveaux zero avec un petit multiplicateur', () => {
    const rng = (() => {
      let state = 7;
      return () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
      };
    })();
    const mL = 1 / Math.log(16);
    let zeros = 0;
    const total = 1000;
    for (let k = 0; k < total; k += 1) {
      if (assignLevel(rng, mL) === 0) zeros += 1;
    }
    expect(zeros / total).toBeGreaterThan(0.5);
  });
});

describe('randomPoints', () => {
  it('produit le bon nombre de points a la bonne dimension', () => {
    const points = randomPoints(12, 2, () => 0.5);
    expect(points).toHaveLength(12);
    expect(points.every((p) => p.length === 2)).toBe(true);
  });

  it('garde chaque coordonnee dans [0, 1)', () => {
    let i = 0;
    const values = [0, 0.25, 0.5, 0.75, 0.999];
    const rng = () => values[i++ % values.length] as number;
    const points = randomPoints(5, 2, rng);
    for (const point of points) {
      for (const coord of point) {
        expect(coord).toBeGreaterThanOrEqual(0);
        expect(coord).toBeLessThan(1);
      }
    }
  });

  it('est reproductible a graine egale', () => {
    const a = randomPoints(8, 2, mulberryLike(42));
    const b = randomPoints(8, 2, mulberryLike(42));
    expect(a).toEqual(b);
  });
});

describe('exhaustiveNearest', () => {
  it('renvoie l index du point le plus proche', () => {
    const points = [
      [0, 0],
      [10, 10],
      [1, 1],
    ];
    expect(exhaustiveNearest(points, [0.9, 0.9])).toBe(2);
    expect(exhaustiveNearest(points, [9, 9])).toBe(1);
    expect(exhaustiveNearest(points, [-1, -1])).toBe(0);
  });

  it('leve une erreur sur un nuage vide', () => {
    expect(() => exhaustiveNearest([], [0, 0])).toThrow();
  });
});

describe('searchLayer', () => {
  // Graphe chaine deterministe, points sur une ligne.
  const linePoints = [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ];
  const lineLayer = new Map<number, number[]>([
    [0, [1]],
    [1, [0, 2]],
    [2, [1, 3]],
    [3, [2]],
  ]);

  it('descend la chaine jusqu au plus proche en glouton (ef = 1)', () => {
    const result = searchLayer(lineLayer, linePoints, [3.1, 0], [0], 1);
    expect(result.results[0]).toBe(3);
    expect(result.visitedOrder[0]).toBe(0);
    expect(result.visitedOrder).toContain(3);
  });

  // Graphe piege : un minimum local entre l entree et le vrai voisin.
  const trapPoints = [
    [3, 0],
    [2, 0],
    [1, 2],
    [1, 0],
    [0.2, 0],
  ];
  const trapLayer = new Map<number, number[]>([
    [0, [1]],
    [1, [0, 2]],
    [2, [1, 3]],
    [3, [2, 4]],
    [4, [3]],
  ]);
  const query = [0, 0];

  it('reste coince dans le minimum local avec ef = 1', () => {
    const result = searchLayer(trapLayer, trapPoints, query, [0], 1);
    expect(result.results[0]).toBe(1);
  });

  it('s extrait du piege et trouve le vrai voisin avec ef = 2', () => {
    const result = searchLayer(trapLayer, trapPoints, query, [0], 2);
    expect(result.results[0]).toBe(4);
  });

  it('renvoie au plus ef resultats, tries du plus proche au plus loin', () => {
    const result = searchLayer(trapLayer, trapPoints, query, [0], 2);
    expect(result.results.length).toBeLessThanOrEqual(2);
    const distances = result.results.map((id) => trapPoints[id] as number[]).map((p) => p[0] as number);
    for (let i = 1; i < distances.length; i += 1) {
      expect(Math.abs(distances[i] as number)).toBeGreaterThanOrEqual(Math.abs(distances[i - 1] as number));
    }
  });
});

describe('buildHnsw', () => {
  const points = randomPoints(40, 2, mulberryLike(2024));

  it('place tous les points dans la couche de base', () => {
    const graph = buildHnsw(points, 6, mulberryLike(7));
    const base = graph.layers[0] as Map<number, number[]>;
    expect(base.size).toBe(points.length);
    expect(graph.levels).toHaveLength(points.length);
  });

  it('a un point d entree de niveau maximal', () => {
    const graph = buildHnsw(points, 6, mulberryLike(7));
    expect(graph.levels[graph.entryPoint]).toBe(graph.maxLevel);
    expect(graph.layers).toHaveLength(graph.maxLevel + 1);
  });

  it('ne fait participer a la couche L que des noeuds de niveau au moins L', () => {
    const graph = buildHnsw(points, 6, mulberryLike(7));
    graph.layers.forEach((layer, level) => {
      for (const node of layer.keys()) {
        expect(graph.levels[node]).toBeGreaterThanOrEqual(level);
      }
    });
  });

  it('construit une adjacence symetrique dans chaque couche', () => {
    const graph = buildHnsw(points, 6, mulberryLike(7));
    for (const layer of graph.layers) {
      for (const [node, neighbors] of layer.entries()) {
        for (const neighbor of neighbors) {
          expect(layer.get(neighbor)).toContain(node);
        }
      }
    }
  });

  it('est reproductible a graine egale', () => {
    const a = buildHnsw(points, 6, mulberryLike(7));
    const b = buildHnsw(points, 6, mulberryLike(7));
    expect(a.levels).toEqual(b.levels);
    expect(a.entryPoint).toBe(b.entryPoint);
  });
});

describe('searchHnsw', () => {
  const points = randomPoints(60, 2, mulberryLike(99));
  const graph = buildHnsw(points, 8, mulberryLike(11));

  it('demarre la descente au point d entree', () => {
    const result = searchHnsw(graph, points, [0.5, 0.5], 8);
    expect(result.path[0]).toBe(graph.entryPoint);
    expect(result.perLayerPath).toHaveLength(graph.maxLevel + 1);
  });

  it('retrouve le vrai plus proche voisin avec un faisceau assez large', () => {
    let hits = 0;
    const queries = [
      [0.1, 0.1],
      [0.5, 0.5],
      [0.9, 0.2],
      [0.3, 0.8],
      [0.7, 0.7],
    ];
    for (const query of queries) {
      const oracle = exhaustiveNearest(points, query);
      const found = searchHnsw(graph, points, query, 32).resultId;
      if (found === oracle) hits += 1;
    }
    expect(hits).toBe(queries.length);
  });

  it('ne fait pas mieux avec un faisceau plus large qu un faisceau etroit (monotonie du rappel)', () => {
    const query = [0.42, 0.58];
    const oracle = exhaustiveNearest(points, query);
    const wide = searchHnsw(graph, points, query, 32).resultId;
    // Un faisceau large doit au moins egaler l oracle ici.
    expect(wide).toBe(oracle);
  });
});

// Un petit generateur reproductible local aux tests, independant du moteur.
function mulberryLike(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
