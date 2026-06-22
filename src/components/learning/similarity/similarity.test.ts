import { describe, expect, it } from 'vitest';
import {
  cosineSimilarity,
  dotProduct,
  euclideanDistance,
  norm,
  normalize,
  rankCandidates,
  type Candidate,
} from './similarity';

// ---------------------------------------------------------------------------
// dotProduct
// ---------------------------------------------------------------------------

describe('dotProduct', () => {
  it('multiplies coordinate by coordinate and sums', () => {
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(1 * 4 + 2 * 5 + 3 * 6);
  });

  it('is zero for perpendicular vectors', () => {
    expect(dotProduct([1, 0], [0, 1])).toBe(0);
  });

  it('throws when dimensions differ', () => {
    expect(() => dotProduct([1, 2], [1, 2, 3])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// norm
// ---------------------------------------------------------------------------

describe('norm', () => {
  it('returns the euclidean length', () => {
    expect(norm([3, 4])).toBe(5);
  });

  it('is zero for the zero vector', () => {
    expect(norm([0, 0])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// normalize
// ---------------------------------------------------------------------------

describe('normalize', () => {
  it('returns a unit-length vector in the same direction', () => {
    const u = normalize([3, 4]);
    expect(norm(u)).toBeCloseTo(1, 10);
    expect(u[0]).toBeCloseTo(0.6, 10);
    expect(u[1]).toBeCloseTo(0.8, 10);
  });

  it('leaves the zero vector unchanged', () => {
    expect(normalize([0, 0])).toEqual([0, 0]);
  });
});

// ---------------------------------------------------------------------------
// cosineSimilarity
// ---------------------------------------------------------------------------

describe('cosineSimilarity', () => {
  it('is one for vectors in the same direction', () => {
    expect(cosineSimilarity([1, 1], [2, 2])).toBeCloseTo(1, 10);
  });

  it('is zero for perpendicular vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 5])).toBeCloseTo(0, 10);
  });

  it('is minus one for opposite vectors', () => {
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1, 10);
  });

  it('ignores magnitude: scaling a vector does not change the cosine', () => {
    const base = cosineSimilarity([1, 3], [2, 1]);
    const scaled = cosineSimilarity([10, 30], [2, 1]);
    expect(scaled).toBeCloseTo(base, 10);
  });

  it('is zero when one vector is the zero vector', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// euclideanDistance
// ---------------------------------------------------------------------------

describe('euclideanDistance', () => {
  it('is the length of the segment between the two points', () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5);
  });

  it('is zero between identical vectors', () => {
    expect(euclideanDistance([2, -1], [2, -1])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// rankCandidates
// ---------------------------------------------------------------------------

const candidates: Candidate[] = [
  { id: 'a', vector: [1, 0] },
  { id: 'b', vector: [0, 1] },
  { id: 'c', vector: [1, 1] },
];

describe('rankCandidates', () => {
  it('ranks by cosine from closest to furthest', () => {
    const ranked = rankCandidates([1, 0.1], candidates, 'cosine');
    expect(ranked.map((c) => c.id)).toEqual(['a', 'c', 'b']);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[2].rank).toBe(3);
  });

  it('ranks by euclidean distance from closest to furthest', () => {
    const ranked = rankCandidates([1, 0], candidates, 'euclidean');
    expect(ranked[0].id).toBe('a');
    expect(ranked[0].score).toBeCloseTo(0, 10);
    // 'a' is identical to the query, so distance zero and rank one.
    expect(ranked[0].rank).toBe(1);
  });

  it('carries the raw score for cosine', () => {
    const ranked = rankCandidates([1, 0], [{ id: 'a', vector: [1, 0] }], 'cosine');
    expect(ranked[0].score).toBeCloseTo(1, 10);
  });

  // The query points along x. 'aligned-far' is perfectly aligned but far from the
  // query tip ; 'tilted-near' sits close to the tip but at an angle. Cosine cares
  // only about the angle and prefers 'aligned-far' ; euclidean cares about position
  // and prefers 'tilted-near'. They disagree.
  const query = [1, 0];
  const angleVsPosition: Candidate[] = [
    { id: 'aligned-far', vector: [5, 0] },
    { id: 'tilted-near', vector: [1, 0.5] },
  ];

  it('cosine and euclidean can disagree on order without normalization', () => {
    const byCosine = rankCandidates(query, angleVsPosition, 'cosine').map((c) => c.id);
    const byEuclidean = rankCandidates(query, angleVsPosition, 'euclidean').map((c) => c.id);
    expect(byCosine).toEqual(['aligned-far', 'tilted-near']);
    expect(byEuclidean).toEqual(['tilted-near', 'aligned-far']);
  });

  it('after normalization, cosine and euclidean rankings agree', () => {
    const byCosine = rankCandidates(query, angleVsPosition, 'cosine', { normalized: true }).map(
      (c) => c.id,
    );
    const byEuclidean = rankCandidates(query, angleVsPosition, 'euclidean', {
      normalized: true,
    }).map((c) => c.id);
    expect(byEuclidean).toEqual(byCosine);
  });

  it('keeps input order on ties (stable sort)', () => {
    const tie: Candidate[] = [
      { id: 'first', vector: [1, 0] },
      { id: 'second', vector: [1, 0] },
    ];
    const ranked = rankCandidates([1, 0], tie, 'cosine');
    expect(ranked.map((c) => c.id)).toEqual(['first', 'second']);
  });
});
