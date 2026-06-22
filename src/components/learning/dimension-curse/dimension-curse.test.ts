import { describe, expect, it } from 'vitest';
import {
  distanceContrast,
  distancesToQuery,
  gaussianSample,
  histogram,
  meanAndStd,
  mulberry32,
  pairwiseCosines,
  randomVectors,
  recallAtK,
} from './dimension-curse';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const sequenceA = [a(), a(), a(), a()];
    const sequenceB = [b(), b(), b(), b()];
    expect(sequenceA).toEqual(sequenceB);
  });

  it('produces a different sequence for a different seed', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('returns values in [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('gaussianSample', () => {
  it('is deterministic when fed a deterministic generator', () => {
    const first = gaussianSample(mulberry32(3));
    const second = gaussianSample(mulberry32(3));
    expect(first).toBe(second);
  });

  it('approximates a standard normal over many draws', () => {
    const rng = mulberry32(123);
    const values: number[] = [];
    for (let i = 0; i < 20000; i += 1) {
      values.push(gaussianSample(rng));
    }
    const { mean, std } = meanAndStd(values);
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(std - 1)).toBeLessThan(0.05);
  });
});

describe('randomVectors', () => {
  it('produces the requested count and dimension', () => {
    const vectors = randomVectors(5, 8, mulberry32(0));
    expect(vectors).toHaveLength(5);
    for (const vector of vectors) {
      expect(vector).toHaveLength(8);
    }
  });

  it('is reproducible for a given seed', () => {
    const a = randomVectors(4, 3, mulberry32(99));
    const b = randomVectors(4, 3, mulberry32(99));
    expect(a).toEqual(b);
  });
});

describe('distancesToQuery', () => {
  it('computes the euclidean distance to each vector', () => {
    const distances = distancesToQuery(
      [0, 0],
      [
        [3, 4],
        [0, 0],
        [1, 0],
      ],
    );
    expect(distances).toEqual([5, 0, 1]);
  });
});

describe('distanceContrast', () => {
  it('is the relative spread (max - min) / min', () => {
    expect(distanceContrast([2, 4, 8])).toBeCloseTo(3, 10);
  });

  it('is zero when every distance is equal', () => {
    expect(distanceContrast([4, 4, 4])).toBe(0);
  });

  it('throws on an empty input', () => {
    expect(() => distanceContrast([])).toThrow();
  });
});

describe('meanAndStd', () => {
  it('computes the mean and the population standard deviation', () => {
    const { mean, std } = meanAndStd([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(mean).toBeCloseTo(5, 10);
    expect(std).toBeCloseTo(2, 10);
  });
});

describe('histogram', () => {
  it('splits the range into the requested number of bins', () => {
    const bins = histogram([0, 1, 2, 3, 4], 2);
    expect(bins).toHaveLength(2);
  });

  it('preserves the total count across all bins', () => {
    const values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const bins = histogram(values, 4);
    const total = bins.reduce((sum, bin) => sum + bin.count, 0);
    expect(total).toBe(values.length);
  });

  it('puts every value in a single bin when they are all equal', () => {
    const bins = histogram([3, 3, 3], 4);
    const total = bins.reduce((sum, bin) => sum + bin.count, 0);
    expect(total).toBe(3);
  });
});

describe('pairwiseCosines', () => {
  it('returns one cosine per unordered pair', () => {
    const cosines = pairwiseCosines([
      [1, 0],
      [0, 1],
      [1, 0],
    ]);
    expect(cosines).toHaveLength(3);
    expect(cosines[0]).toBeCloseTo(0, 10);
    expect(cosines[1]).toBeCloseTo(1, 10);
    expect(cosines[2]).toBeCloseTo(0, 10);
  });
});

describe('recallAtK', () => {
  it('is the fraction of the exact top-k found in the approximate top-k', () => {
    const exact = ['a', 'b', 'c', 'd'];
    const approx = ['a', 'x', 'c', 'y'];
    expect(recallAtK(exact, approx, 4)).toBeCloseTo(0.5, 10);
  });

  it('only looks at the first k of each list', () => {
    const exact = ['a', 'b', 'c', 'd'];
    const approx = ['a', 'x', 'b', 'y'];
    expect(recallAtK(exact, approx, 2)).toBeCloseTo(0.5, 10);
  });

  it('is one when the approximate list recovers the exact neighbours', () => {
    expect(recallAtK(['a', 'b'], ['b', 'a'], 2)).toBe(1);
  });
});

describe('the curse of dimensionality (integration)', () => {
  it('concentrates distances as the dimension grows', () => {
    const query = (dim: number) => new Array<number>(dim).fill(0);

    const lowDim = randomVectors(400, 2, mulberry32(2024));
    const highDim = randomVectors(400, 512, mulberry32(2024));

    const lowContrast = distanceContrast(distancesToQuery(query(2), lowDim));
    const highContrast = distanceContrast(distancesToQuery(query(512), highDim));

    expect(highContrast).toBeLessThan(lowContrast);
  });

  it('drives random pairs toward orthogonality as the dimension grows', () => {
    const lowDim = randomVectors(60, 2, mulberry32(7));
    const highDim = randomVectors(60, 512, mulberry32(7));

    const lowSpread = meanAndStd(pairwiseCosines(lowDim)).std;
    const highSpread = meanAndStd(pairwiseCosines(highDim)).std;

    expect(highSpread).toBeLessThan(lowSpread);
    expect(Math.abs(meanAndStd(pairwiseCosines(highDim)).mean)).toBeLessThan(0.1);
  });
});
