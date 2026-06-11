import { describe, expect, it } from 'vitest';
import {
  numericalDerivative,
  square,
  squareDeriv,
  sigmoid,
  sigmoidDeriv,
  chainRule,
  partialDerivative,
  gradient,
  quadraticBowl,
  neuronLoss,
  neuronLossGradient,
} from './derivatives';

describe('analytic primitives', () => {
  it('square and its derivative', () => {
    expect(square(3)).toBe(9);
    expect(squareDeriv(3)).toBe(6);
    expect(squareDeriv(0)).toBe(0);
    expect(squareDeriv(-1)).toBe(-2);
  });

  it('sigmoid and its derivative', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 10);
    expect(sigmoidDeriv(0)).toBeCloseTo(0.25, 10);
  });
});

describe('numericalDerivative', () => {
  it('matches the analytic slope of x^2', () => {
    expect(numericalDerivative(square, 3)).toBeCloseTo(6, 4);
    expect(numericalDerivative(square, 0)).toBeCloseTo(0, 6);
  });

  it('matches the analytic slope of sigmoid at 0', () => {
    expect(numericalDerivative(sigmoid, 0)).toBeCloseTo(0.25, 6);
  });
});

describe('chainRule', () => {
  it('multiplies outer and inner local derivatives', () => {
    expect(chainRule(8, 3)).toBe(24);
  });

  it('agrees with the numerical derivative of the composite', () => {
    const composite = (x: number) => square(3 * x + 1);
    expect(numericalDerivative(composite, 1)).toBeCloseTo(24, 4);
  });
});

describe('gradient', () => {
  it('partial derivatives along each axis', () => {
    expect(partialDerivative(quadraticBowl, [1, 1], 0)).toBeCloseTo(2, 4);
    expect(partialDerivative(quadraticBowl, [1, 1], 1)).toBeCloseTo(4, 4);
  });

  it('assembles partials into the gradient vector', () => {
    const g = gradient(quadraticBowl, [1, 1]);
    expect(g[0]).toBeCloseTo(2, 4);
    expect(g[1]).toBeCloseTo(4, 4);
  });
});

describe('neuron loss', () => {
  it('analytic gradient matches the numerical one', () => {
    const w = 0.5;
    const b = -0.2;
    const x = 1.5;
    const y = 1;
    const { dW, dB } = neuronLossGradient(w, b, x, y);
    expect(dW).toBeCloseTo(
      numericalDerivative((wv) => neuronLoss(wv, b, x, y), w),
      4,
    );
    expect(dB).toBeCloseTo(
      numericalDerivative((bv) => neuronLoss(w, bv, x, y), b),
      4,
    );
  });
});
