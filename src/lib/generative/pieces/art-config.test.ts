import { describe, expect, it } from 'vitest';
import {
  clampToSpec,
  decodeConfig,
  defaultConfig,
  encodeConfig,
  randomConfig,
  randomSeed,
} from './art-config';
import type { ParamSpec } from './piece';

const params: ParamSpec[] = [
  { key: 'count', labelFr: 'c', labelEn: 'c', min: 10, max: 100, step: 5, structural: true },
  { key: 'speed', labelFr: 's', labelEn: 's', min: 0.2, max: 3, step: 0.1 },
];
const defaults = { count: 50, speed: 1.2 };

describe('defaultConfig', () => {
  it('uses the defaults and the given seed', () => {
    expect(defaultConfig(params, defaults, 20260615)).toEqual({ seed: 20260615, count: 50, speed: 1.2 });
  });
});

describe('clampToSpec', () => {
  it('clamps within the spec bounds', () => {
    expect(clampToSpec(5, params[0])).toBe(10);
    expect(clampToSpec(200, params[0])).toBe(100);
    expect(clampToSpec(40, params[0])).toBe(40);
  });
});

describe('encodeConfig and decodeConfig', () => {
  it('round trips a configuration', () => {
    const config = { seed: 20260615, count: 35, speed: 1.5 };
    const decoded = decodeConfig(encodeConfig(config, params), params, defaults, 1);
    expect(decoded).toEqual(config);
  });

  it('falls back to defaults for missing params', () => {
    expect(decodeConfig('seed=42', params, defaults, 1)).toEqual({ seed: 42, count: 50, speed: 1.2 });
  });

  it('falls back to the given seed when seed is absent or invalid', () => {
    expect(decodeConfig('count=20', params, defaults, 777).seed).toBe(777);
    expect(decodeConfig('seed=abc', params, defaults, 777).seed).toBe(777);
  });

  it('clamps out of range values', () => {
    const decoded = decodeConfig('seed=1&count=9999&speed=-5', params, defaults, 1);
    expect(decoded.count).toBe(100);
    expect(decoded.speed).toBe(0.2);
  });
});

describe('randomConfig', () => {
  it('keeps every value within the spec bounds and preserves the seed', () => {
    const sequence = [0, 0.5, 1, 0.25, 0.999];
    let calls = 0;
    const random = (): number => sequence[calls++ % sequence.length];
    for (let i = 0; i < 20; i++) {
      const config = randomConfig(params, random, 5);
      expect(config.seed).toBe(5);
      for (const param of params) {
        expect(config[param.key]).toBeGreaterThanOrEqual(param.min);
        expect(config[param.key]).toBeLessThanOrEqual(param.max);
      }
    }
  });
});

describe('randomSeed', () => {
  it('returns a non negative integer below 1e8', () => {
    expect(randomSeed(() => 0)).toBe(0);
    expect(randomSeed(() => 0.999999)).toBeLessThan(100000000);
    expect(Number.isInteger(randomSeed(() => 0.5))).toBe(true);
  });
});
