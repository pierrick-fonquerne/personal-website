import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../dimension-curse/dimension-curse';
import {
  makeClusteredDataset,
  exactNeighbors,
  recallAtK,
  kMeans,
  buildIvf,
  searchIvf,
  buildProductQuantizer,
  searchPq,
  searchHnswTopK,
  flatMemoryBytes,
  ivfMemoryBytes,
  hnswMemoryBytes,
  pqMemoryBytes,
  profileFlat,
  profileIvf,
  profileHnsw,
  profilePq,
  BYTES_PER_FLOAT,
  type Dataset,
  type DatasetOptions,
} from './ann-landscape';
import { buildHnsw } from '../hnsw/hnsw';

const DATASET_OPTIONS: DatasetOptions = {
  pointCount: 300,
  dimension: 16,
  queryCount: 20,
  clusterCount: 8,
  spread: 0.05,
};

function makeFixture(seed = 7): Dataset {
  return makeClusteredDataset(DATASET_OPTIONS, mulberry32(seed));
}

describe('makeClusteredDataset', () => {
  it('produces the requested number of points and queries with the right dimension', () => {
    const data = makeFixture();
    expect(data.points).toHaveLength(DATASET_OPTIONS.pointCount);
    expect(data.queries).toHaveLength(DATASET_OPTIONS.queryCount);
    expect(data.points[0]).toHaveLength(DATASET_OPTIONS.dimension);
    expect(data.queries[0]).toHaveLength(DATASET_OPTIONS.dimension);
  });

  it('is reproducible for a given seed and differs across seeds', () => {
    expect(makeFixture(7)).toEqual(makeFixture(7));
    expect(makeFixture(7)).not.toEqual(makeFixture(9));
  });
});

describe('exactNeighbors', () => {
  const line = [[0], [1], [2], [3], [4]];

  it('returns the k nearest ids sorted from closest to farthest', () => {
    expect(exactNeighbors(line, [3.4], 1)).toEqual([3]);
    expect(exactNeighbors(line, [3.4], 3)).toEqual([3, 4, 2]);
  });

  it('never returns more ids than points', () => {
    expect(exactNeighbors(line, [0], 99)).toHaveLength(line.length);
  });
});

describe('recallAtK', () => {
  it('is 1 when every true neighbor is retrieved, regardless of order', () => {
    expect(recallAtK([4, 2, 7], [7, 4, 2])).toBe(1);
  });

  it('is 0 when no true neighbor is retrieved', () => {
    expect(recallAtK([1, 2, 3], [4, 5, 6])).toBe(0);
  });

  it('counts the fraction of true neighbors found', () => {
    expect(recallAtK([1, 2, 9], [1, 2, 3, 4])).toBeCloseTo(0.5, 10);
  });
});

describe('kMeans', () => {
  const twoBlobs = [
    [0, 0],
    [0.1, 0.1],
    [0, 0.1],
    [10, 10],
    [10.1, 10],
    [10, 10.1],
  ];

  it('separates two far-apart blobs into two clusters', () => {
    const { assignments } = kMeans(twoBlobs, 2, mulberry32(1));
    expect(assignments[0]).toBe(assignments[1]);
    expect(assignments[1]).toBe(assignments[2]);
    expect(assignments[3]).toBe(assignments[4]);
    expect(assignments[4]).toBe(assignments[5]);
    expect(assignments[0]).not.toBe(assignments[3]);
  });

  it('returns k centroids of the input dimension and is reproducible', () => {
    const a = kMeans(twoBlobs, 2, mulberry32(1));
    const b = kMeans(twoBlobs, 2, mulberry32(1));
    expect(a.centroids).toHaveLength(2);
    expect(a.centroids[0]).toHaveLength(2);
    expect(a).toEqual(b);
  });
});

describe('buildIvf', () => {
  it('creates cellCount centroids and partitions every point exactly once', () => {
    const data = makeFixture();
    const index = buildIvf(data.points, 16, mulberry32(3));
    expect(index.centroids).toHaveLength(16);
    const members = index.cells.flat().sort((a, b) => a - b);
    expect(members).toEqual([...Array(data.points.length).keys()]);
  });
});

describe('searchIvf', () => {
  it('matches the exact answer and scans everything when nprobe = cellCount', () => {
    const data = makeFixture();
    const cellCount = 16;
    const index = buildIvf(data.points, cellCount, mulberry32(3));
    const query = data.queries[0] as number[];
    const trace = searchIvf(index, data.points, query, 5, cellCount);
    expect(new Set(trace.ids)).toEqual(new Set(exactNeighbors(data.points, query, 5)));
    expect(trace.distanceComputations).toBe(cellCount + data.points.length);
  });

  it('scans fewer vectors with a small nprobe, and more as nprobe grows', () => {
    const data = makeFixture();
    const index = buildIvf(data.points, 16, mulberry32(3));
    const query = data.queries[0] as number[];
    const narrow = searchIvf(index, data.points, query, 5, 1);
    const wide = searchIvf(index, data.points, query, 5, 4);
    expect(narrow.distanceComputations).toBeLessThan(data.points.length);
    expect(wide.distanceComputations).toBeGreaterThan(narrow.distanceComputations);
  });
});

describe('buildProductQuantizer', () => {
  it('throws when the dimension is not divisible by the number of subquantizers', () => {
    const data = makeFixture();
    expect(() => buildProductQuantizer(data.points, 5, 16, mulberry32(2))).toThrow();
  });

  it('encodes every point into one code per subspace within the codebook range', () => {
    const data = makeFixture();
    const pq = buildProductQuantizer(data.points, 4, 32, mulberry32(2));
    expect(pq.subDimension).toBe(DATASET_OPTIONS.dimension / 4);
    expect(pq.codebooks).toHaveLength(4);
    expect(pq.codebooks[0]).toHaveLength(32);
    expect(pq.codes).toHaveLength(data.points.length);
    expect(pq.codes[0]).toHaveLength(4);
    for (const row of pq.codes) {
      for (const code of row) {
        expect(code).toBeGreaterThanOrEqual(0);
        expect(code).toBeLessThan(32);
      }
    }
  });
});

describe('searchPq', () => {
  it('returns k ids and scans all n codes (latency stays of order n)', () => {
    const data = makeFixture();
    const pq = buildProductQuantizer(data.points, 4, 32, mulberry32(2));
    const trace = searchPq(pq, data.queries[0] as number[], 5);
    expect(trace.ids).toHaveLength(5);
    expect(trace.distanceComputations).toBe(data.points.length);
  });

  it('recovers more of the true neighbors with a finer codebook', () => {
    const data = makeFixture();
    const query = data.queries[0] as number[];
    const truth = exactNeighbors(data.points, query, 5);
    const coarse = buildProductQuantizer(data.points, 4, 2, mulberry32(2));
    const fine = buildProductQuantizer(data.points, 4, 64, mulberry32(2));
    const coarseRecall = recallAtK(searchPq(coarse, query, 5).ids, truth);
    const fineRecall = recallAtK(searchPq(fine, query, 5).ids, truth);
    expect(fineRecall).toBeGreaterThanOrEqual(coarseRecall);
  });
});

describe('searchHnswTopK', () => {
  it('returns k ids and improves recall as ef grows, at the cost of more visits', () => {
    const data = makeFixture();
    const graph = buildHnsw(data.points, 8, mulberry32(5));
    const query = data.queries[0] as number[];
    const truth = exactNeighbors(data.points, query, 5);
    const narrow = searchHnswTopK(graph, data.points, query, 5, 1);
    const wide = searchHnswTopK(graph, data.points, query, 5, 32);
    expect(wide.ids).toHaveLength(5);
    expect(recallAtK(wide.ids, truth)).toBeGreaterThanOrEqual(recallAtK(narrow.ids, truth));
    expect(wide.distanceComputations).toBeGreaterThanOrEqual(narrow.distanceComputations);
    expect(wide.distanceComputations).toBeLessThan(data.points.length);
  });
});

describe('memory estimators', () => {
  it('flat memory is n times dimension times the float size', () => {
    expect(flatMemoryBytes(300, 16)).toBe(300 * 16 * BYTES_PER_FLOAT);
  });

  it('IVF needs at least as much as flat (vectors plus centroids)', () => {
    const data = makeFixture();
    const index = buildIvf(data.points, 16, mulberry32(3));
    expect(ivfMemoryBytes(index, data.points.length, DATASET_OPTIONS.dimension)).toBeGreaterThan(
      flatMemoryBytes(data.points.length, DATASET_OPTIONS.dimension),
    );
  });

  it('HNSW needs more than flat (vectors plus edges)', () => {
    const data = makeFixture();
    const graph = buildHnsw(data.points, 8, mulberry32(5));
    expect(hnswMemoryBytes(graph, data.points.length, DATASET_OPTIONS.dimension)).toBeGreaterThan(
      flatMemoryBytes(data.points.length, DATASET_OPTIONS.dimension),
    );
  });

  it('PQ needs far less than flat (compressed codes instead of raw vectors)', () => {
    const data = makeFixture();
    const pq = buildProductQuantizer(data.points, 4, 32, mulberry32(2));
    expect(pqMemoryBytes(pq, data.points.length)).toBeLessThan(
      flatMemoryBytes(data.points.length, DATASET_OPTIONS.dimension),
    );
  });
});

describe('the trade-off triangle: each approximate family beats flat on exactly one axis', () => {
  const data = makeFixture();
  const k = 5;
  const flat = profileFlat(data, k);

  it('flat is the exact oracle: perfect recall, n comparisons, full memory', () => {
    expect(flat.recall).toBe(1);
    expect(flat.distanceComputations).toBe(data.points.length);
    expect(flat.memoryBytes).toBe(
      flatMemoryBytes(data.points.length, DATASET_OPTIONS.dimension),
    );
  });

  it('IVF wins latency (fewer comparisons) without saving memory', () => {
    const ivf = profileIvf(data, k, { cellCount: 16, nprobe: 2 }, mulberry32(3));
    expect(ivf.distanceComputations).toBeLessThan(flat.distanceComputations);
    expect(ivf.memoryBytes).toBeGreaterThanOrEqual(flat.memoryBytes);
    expect(ivf.recall).toBeGreaterThan(0);
    expect(ivf.recall).toBeLessThanOrEqual(1);
  });

  it('IVF recovers exact recall when it probes every cell', () => {
    const ivf = profileIvf(data, k, { cellCount: 16, nprobe: 16 }, mulberry32(3));
    expect(ivf.recall).toBe(1);
  });

  it('HNSW wins latency strongly but costs memory', () => {
    const hnsw = profileHnsw(data, k, { m: 8, ef: 16 }, mulberry32(5));
    expect(hnsw.distanceComputations).toBeLessThan(flat.distanceComputations);
    expect(hnsw.memoryBytes).toBeGreaterThan(flat.memoryBytes);
  });

  it('PQ wins memory while latency stays of order n', () => {
    const pq = profilePq(data, k, { subquantizers: 4, codesPerSubquantizer: 32 }, mulberry32(2));
    expect(pq.memoryBytes).toBeLessThan(flat.memoryBytes);
    expect(pq.distanceComputations).toBe(flat.distanceComputations);
    expect(pq.recall).toBeGreaterThan(0);
    expect(pq.recall).toBeLessThanOrEqual(1);
  });
});
