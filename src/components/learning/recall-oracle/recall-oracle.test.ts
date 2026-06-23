import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../dimension-curse/dimension-curse';
import { makeClusteredDataset, exactNeighbors } from '../ann-landscape/ann-landscape';
import {
  buildProximityGraph,
  beamSearchKnn,
  localChecks,
  recallForQuery,
  evaluateAgainstOracle,
  type BeamSearchResult,
} from './recall-oracle';

const DATA = makeClusteredDataset(
  { pointCount: 300, dimension: 2, queryCount: 30, clusterCount: 5, spread: 0.14 },
  mulberry32(11),
);
const DEGREE = 10;
const EF = 16;
const K = 5;

const fullGraph = buildProximityGraph(DATA.points, DEGREE);
const halvedGraph = buildProximityGraph(DATA.points, DEGREE, true);

function countEdges(adjacency: number[][]): number {
  return adjacency.reduce((sum, neighbors) => sum + neighbors.length, 0);
}

describe('buildProximityGraph', () => {
  it('has one adjacency list per point and no self-loops', () => {
    expect(fullGraph.adjacency).toHaveLength(DATA.points.length);
    fullGraph.adjacency.forEach((neighbors, i) => {
      expect(neighbors).not.toContain(i);
      for (const j of neighbors) {
        expect(j).toBeGreaterThanOrEqual(0);
        expect(j).toBeLessThan(DATA.points.length);
      }
    });
  });

  it('is symmetric: an edge i-j appears on both endpoints', () => {
    fullGraph.adjacency.forEach((neighbors, i) => {
      for (const j of neighbors) {
        expect(fullGraph.adjacency[j]).toContain(i);
      }
    });
  });

  it('halves the effective degree and therefore the edge count', () => {
    expect(halvedGraph.degree).toBe(Math.floor(DEGREE / 2));
    expect(fullGraph.degree).toBe(DEGREE);
    expect(countEdges(halvedGraph.adjacency)).toBeLessThan(countEdges(fullGraph.adjacency));
  });
});

describe('beamSearchKnn (correct)', () => {
  const query = DATA.queries[0] as number[];
  const result = beamSearchKnn(fullGraph, DATA.points, query, { ef: EF, k: K });

  it('returns k distinct ids, sorted from closest to farthest', () => {
    const checks = localChecks(result, DATA.points, query, K);
    expect(checks.returnsK).toBe(true);
    expect(checks.sortedByDistance).toBe(true);
    expect(checks.idsDistinct).toBe(true);
  });

  it('starts its visit at the entry point and explores several nodes', () => {
    expect(result.visitedOrder[0]).toBe(0);
    expect(result.visitedOrder.length).toBeGreaterThan(K);
  });
});

describe('localChecks actually verifies the structure', () => {
  it('flags an unsorted result as not sorted', () => {
    const query = DATA.queries[0] as number[];
    const good = beamSearchKnn(fullGraph, DATA.points, query, { ef: EF, k: K });
    const scrambled: BeamSearchResult = {
      ids: [...good.ids].reverse(),
      visitedOrder: good.visitedOrder,
    };
    // The true neighbors are not in reverse-distance order, so the check must fail.
    expect(localChecks(scrambled, DATA.points, query, K).sortedByDistance).toBe(false);
  });
});

describe('recallForQuery', () => {
  const query = DATA.queries[0] as number[];

  it('is 1 when the result equals the exact neighbors', () => {
    const truth = exactNeighbors(DATA.points, query, K);
    const perfect: BeamSearchResult = { ids: truth, visitedOrder: truth };
    expect(recallForQuery(perfect, DATA.points, query, K)).toBeCloseTo(1, 10);
  });

  it('is 0 when the result shares no neighbor with the truth', () => {
    const truth = new Set(exactNeighbors(DATA.points, query, K));
    const wrong: number[] = [];
    for (let i = 0; wrong.length < K; i += 1) {
      if (!truth.has(i)) wrong.push(i);
    }
    expect(recallForQuery({ ids: wrong, visitedOrder: wrong }, DATA.points, query, K)).toBe(0);
  });
});

describe('the differential oracle: local checks stay green while recall collapses', () => {
  const correct = evaluateAgainstOracle(fullGraph, DATA.points, DATA.queries, K, { ef: EF });
  const invertedHeap = evaluateAgainstOracle(fullGraph, DATA.points, DATA.queries, K, {
    ef: EF,
    invertedHeap: true,
  });
  const halved = evaluateAgainstOracle(halvedGraph, DATA.points, DATA.queries, K, { ef: EF });

  it('a correct search reaches a high recall', () => {
    expect(correct.recall).toBeGreaterThanOrEqual(0.75);
    expect(correct.localChecksAllPass).toBe(true);
  });

  it('the inverted-heap bug tanks recall, yet every local check still passes', () => {
    expect(invertedHeap.localChecksAllPass).toBe(true);
    expect(invertedHeap.recall).toBeLessThan(correct.recall - 0.2);
  });

  it('the halved-connectivity bug lowers recall, yet every local check still passes', () => {
    expect(halved.localChecksAllPass).toBe(true);
    expect(halved.recall).toBeLessThanOrEqual(correct.recall);
    expect(halved.meanVisited).toBeLessThan(correct.meanVisited);
  });

  it('no bug breaks a single local property: the tests are blind to the failure', () => {
    expect(correct.localChecksAllPass && invertedHeap.localChecksAllPass && halved.localChecksAllPass).toBe(
      true,
    );
  });
});
