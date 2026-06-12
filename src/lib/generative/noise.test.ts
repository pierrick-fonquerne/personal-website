import { describe, expect, it } from 'vitest';
import { valueNoise } from './noise';

describe('valueNoise', () => {
  it('returns the same value for the same inputs and seed', () => {
    expect(valueNoise(12.34, 56.78, 42)).toBe(valueNoise(12.34, 56.78, 42));
  });

  it('returns different fields for different seeds', () => {
    const samples = [0.3, 1.7, 4.2, 9.9];
    const differs = samples.some(
      (x) => valueNoise(x, x * 2, 1) !== valueNoise(x, x * 2, 2),
    );
    expect(differs).toBe(true);
  });

  it('stays within [0, 1]', () => {
    for (let i = 0; i < 500; i++) {
      const value = valueNoise(i * 0.37, i * 0.91, 7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('is continuous: close inputs give close outputs', () => {
    for (let i = 0; i < 200; i++) {
      const x = i * 0.83;
      const y = i * 0.41;
      const delta = Math.abs(valueNoise(x + 0.01, y, 5) - valueNoise(x, y, 5));
      expect(delta).toBeLessThan(0.05);
    }
  });
});
