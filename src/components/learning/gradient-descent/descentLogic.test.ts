import { describe, it, expect } from 'vitest';
import {
  parabolaLoss,
  parabolaStep,
  parabolaTrajectory,
  classifyRegime,
  ravineLoss,
  ravineGradient,
  ravineTrajectory,
  classifyRavine,
  getInitialRate,
} from './descentLogic';

describe('parabola descent', () => {
  it('computes the loss a * w^2', () => {
    expect(parabolaLoss(3, 2)).toBe(12);
  });

  it('applies the update w <- (1 - 2 eta a) w', () => {
    expect(parabolaStep(1, 0.1, 2)).toBeCloseTo(1.6, 10);
    expect(parabolaStep(1, 0.75, 2)).toBeCloseTo(-1, 10);
    expect(parabolaStep(1, 1.1, 2)).toBeCloseTo(-2.4, 10);
  });

  it('reaches the minimum in one step when eta = 1 / (2a)', () => {
    expect(parabolaStep(2, 0.25, 5)).toBeCloseTo(0, 10);
  });

  it('builds a trajectory starting at the initial weight, with iterations + 1 points', () => {
    const trajectory = parabolaTrajectory(1, 0.1, 2, 2);
    expect(trajectory).toHaveLength(3);
    expect(trajectory[0]).toEqual({ iteration: 0, weight: 2, loss: 4 });
    expect(trajectory[1].weight).toBeCloseTo(1.6, 10);
    expect(trajectory[2].weight).toBeCloseTo(1.28, 10);
    expect(trajectory[2].loss).toBeCloseTo(1.6384, 10);
    expect(trajectory[2].iteration).toBe(2);
  });

  it('matches the exercise values for the diverging case', () => {
    const trajectory = parabolaTrajectory(1, 1.1, 2, 2);
    expect(trajectory[2].weight).toBeCloseTo(2.88, 10);
  });
});

describe('classifyRegime', () => {
  it.each([
    [1, 0.1, 'monotone'],
    [1, 0.5, 'one-step'],
    [1, 0.75, 'oscillating'],
    [1, 1, 'cycling'],
    [1, 1.1, 'diverging'],
    [3, 0.3, 'oscillating'],
    [3, 0.34, 'diverging'],
  ] as const)('a = %d, eta = %d gives %s', (curvature, learningRate, expected) => {
    expect(classifyRegime(curvature, learningRate)).toBe(expected);
  });
});

describe('ravine descent', () => {
  const shape = { curvatureX: 1, curvatureY: 10 };

  it('computes the loss ax x^2 + ay y^2', () => {
    expect(ravineLoss(shape, { x: 2, y: 1 })).toBe(14);
  });

  it('computes the gradient (2 ax x, 2 ay y)', () => {
    expect(ravineGradient(shape, { x: 2, y: 1 })).toEqual({ x: 4, y: 20 });
  });

  it('zigzags across the steep axis while crawling along the flat one', () => {
    const trajectory = ravineTrajectory(shape, 0.09, { x: 2, y: 1 }, 3);
    expect(trajectory).toHaveLength(4);
    const signsOfY = trajectory.map((point) => Math.sign(point.y));
    expect(signsOfY).toEqual([1, -1, 1, -1]);
    const xs = trajectory.map((point) => point.x);
    expect(xs[1]).toBeCloseTo(1.64, 10);
    expect(xs.every((x, index) => index === 0 || x < xs[index - 1])).toBe(true);
  });
});

describe('classifyRavine', () => {
  const shape = { curvatureX: 1, curvatureY: 10 };

  it('diverges above 0.1', () => {
    expect(classifyRavine(shape, 0.11)).toBe('diverging');
    expect(classifyRavine(shape, 0.12)).toBe('diverging');
  });

  it('bounces forever at exactly 0.1', () => {
    expect(classifyRavine(shape, 0.1)).toBe('cycling');
  });

  it('zigzags between 0.05 and 0.1', () => {
    expect(classifyRavine(shape, 0.09)).toBe('zigzag');
    expect(classifyRavine(shape, 0.06)).toBe('zigzag');
  });

  it('descends without zigzag at 0.05 and below', () => {
    expect(classifyRavine(shape, 0.05)).toBe('smooth');
    expect(classifyRavine(shape, 0.01)).toBe('smooth');
  });

  it('uses the steepest curvature whichever axis it is on', () => {
    expect(classifyRavine({ curvatureX: 10, curvatureY: 1 }, 0.09)).toBe('zigzag');
  });
});

describe('getInitialRate', () => {
  it('falls back to the default rate of the mode', () => {
    expect(getInitialRate('parabola', undefined)).toBe(0.1);
    expect(getInitialRate('ravine', undefined)).toBe(0.09);
  });

  it('keeps a requested rate inside the range of the mode', () => {
    expect(getInitialRate('parabola', 0.5)).toBe(0.5);
    expect(getInitialRate('ravine', 0.5)).toBe(0.12);
    expect(getInitialRate('parabola', 0)).toBe(0.01);
  });
});
