import { describe, it, expect } from 'vitest';
import {
  parabolaLoss,
  parabolaStep,
  parabolaTrajectory,
  classifyRegime,
  ravineLoss,
  ravineGradient,
  ravineTrajectory,
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
