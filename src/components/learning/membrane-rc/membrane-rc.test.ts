import { describe, expect, it } from 'vitest';
import {
  timeConstant,
  decay,
  lambdaFromStep,
  sampleRecurrence,
  timeToRemainingFraction,
  type RcParams,
} from './membrane-rc';

const params: RcParams = { resistance: 4, capacitance: 0.5 };

describe('timeConstant', () => {
  it('is the product of resistance and capacitance', () => {
    expect(timeConstant(params)).toBeCloseTo(2, 10);
    expect(timeConstant({ resistance: 10, capacitance: 1 })).toBeCloseTo(10, 10);
  });
});

describe('decay', () => {
  it('returns the initial value at t = 0', () => {
    expect(decay(1, 0, 2)).toBeCloseTo(1, 10);
  });

  it('falls to 1/e of the initial value after one time constant', () => {
    // At t = tau the membrane has lost about 63% of its charge.
    expect(decay(1, 2, 2)).toBeCloseTo(Math.exp(-1), 10);
  });

  it('keeps decreasing over time', () => {
    expect(decay(1, 4, 2)).toBeCloseTo(Math.exp(-2), 10);
    expect(decay(1, 4, 2)).toBeLessThan(decay(1, 2, 2));
  });
});

describe('lambdaFromStep', () => {
  it('equals exp(-dt / tau)', () => {
    expect(lambdaFromStep(1, 2)).toBeCloseTo(Math.exp(-0.5), 10);
  });

  it('is 1 when the step is zero (nothing leaks)', () => {
    expect(lambdaFromStep(0, 2)).toBeCloseTo(1, 10);
  });

  it('approaches 0 for a step much larger than tau', () => {
    expect(lambdaFromStep(100, 1)).toBeLessThan(1e-9);
  });
});

describe('sampleRecurrence', () => {
  it('starts at v0 and multiplies by lambda at each step', () => {
    const points = sampleRecurrence(1, 0.5, 4);
    expect(points).toHaveLength(4);
    expect(points[0]).toBeCloseTo(1, 10);
    expect(points[1]).toBeCloseTo(0.5, 10);
    expect(points[2]).toBeCloseTo(0.25, 10);
    expect(points[3]).toBeCloseTo(0.125, 10);
  });
});

describe('timeToRemainingFraction', () => {
  it('returns exactly tau to reach 1/e of the initial charge', () => {
    expect(timeToRemainingFraction(2, Math.exp(-1))).toBeCloseTo(2, 10);
  });

  it('returns 0 when the remaining fraction is 1', () => {
    expect(timeToRemainingFraction(2, 1)).toBeCloseTo(0, 10);
  });
});

describe('discrete sampling equals the continuous decay', () => {
  it('matches the continuous curve at every multiple of dt when lambda = exp(-dt/tau)', () => {
    // This is the central claim of the chapter: the chapter-1 recurrence
    // v(k+1) = lambda * v(k) is not an approximation but the exact sampling
    // of the RC decay, provided lambda = exp(-dt/tau).
    const tau = timeConstant(params); // 2
    const dt = 0.5;
    const v0 = 1;
    const lambda = lambdaFromStep(dt, tau);
    const discrete = sampleRecurrence(v0, lambda, 6);
    discrete.forEach((v, k) => {
      expect(v).toBeCloseTo(decay(v0, k * dt, tau), 10);
    });
  });
});
