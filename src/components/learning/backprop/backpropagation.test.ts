import { describe, expect, it } from 'vitest';
import { sigmoid } from '../calculus/derivatives';
import {
  type Network221,
  forwardPass,
  backwardPass,
  loss,
  numericalParameterGradient,
  sigmoidDerivChain,
} from './backpropagation';

/** A fixed 2-2-1 network with clean weights, used across the suite. */
const net: Network221 = {
  w1: [
    [0.1, 0.2],
    [0.3, 0.4],
  ],
  b1: [0, 0],
  w2: [0.5, 0.6],
  b2: 0.1,
};
const x = [1, 2] as const;
const y = 1;

describe('forwardPass', () => {
  it('computes the hidden pre-activations and activations', () => {
    const fwd = forwardPass(net, [...x]);
    // z1[0] = 0.1 * 1 + 0.2 * 2 + 0 = 0.5
    // z1[1] = 0.3 * 1 + 0.4 * 2 + 0 = 1.1
    expect(fwd.z1[0]).toBeCloseTo(0.5, 12);
    expect(fwd.z1[1]).toBeCloseTo(1.1, 12);
    expect(fwd.a1[0]).toBeCloseTo(sigmoid(0.5), 12);
    expect(fwd.a1[1]).toBeCloseTo(sigmoid(1.1), 12);
  });

  it('computes the output pre-activation and activation', () => {
    const fwd = forwardPass(net, [...x]);
    const expectedZ2 = 0.5 * fwd.a1[0] + 0.6 * fwd.a1[1] + 0.1;
    expect(fwd.z2).toBeCloseTo(expectedZ2, 12);
    expect(fwd.a2).toBeCloseTo(sigmoid(expectedZ2), 12);
  });
});

describe('loss', () => {
  it('is the squared error of the output', () => {
    const fwd = forwardPass(net, [...x]);
    expect(loss(net, [...x], y)).toBeCloseTo((fwd.a2 - y) ** 2, 12);
  });

  it('is zero when the output equals the target', () => {
    const fwd = forwardPass(net, [...x]);
    expect(loss(net, [...x], fwd.a2)).toBeCloseTo(0, 12);
  });
});

describe('backwardPass output layer', () => {
  it('output delta follows 2(a - y) * a(1 - a)', () => {
    const fwd = forwardPass(net, [...x]);
    const back = backwardPass(net, fwd, y);
    const expected = 2 * (fwd.a2 - y) * fwd.a2 * (1 - fwd.a2);
    expect(back.deltaOut).toBeCloseTo(expected, 12);
  });

  it('output-weight gradient is deltaOut times the upstream activation', () => {
    const fwd = forwardPass(net, [...x]);
    const back = backwardPass(net, fwd, y);
    expect(back.gradW2[0]).toBeCloseTo(back.deltaOut * fwd.a1[0], 12);
    expect(back.gradW2[1]).toBeCloseTo(back.deltaOut * fwd.a1[1], 12);
    expect(back.gradB2).toBeCloseTo(back.deltaOut, 12);
  });
});

describe('backwardPass hidden layer', () => {
  it('hidden delta is the downstream delta weighted by w2, times sigmoid prime', () => {
    const fwd = forwardPass(net, [...x]);
    const back = backwardPass(net, fwd, y);
    for (let j = 0; j < 2; j++) {
      const expected = net.w2[j] * back.deltaOut * fwd.a1[j] * (1 - fwd.a1[j]);
      expect(back.deltaHidden[j]).toBeCloseTo(expected, 12);
    }
  });

  it('hidden-weight gradient is the hidden delta times the input', () => {
    const fwd = forwardPass(net, [...x]);
    const back = backwardPass(net, fwd, y);
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        expect(back.gradW1[j][i]).toBeCloseTo(back.deltaHidden[j] * x[i], 12);
      }
      expect(back.gradB1[j]).toBeCloseTo(back.deltaHidden[j], 12);
    }
  });
});

describe('backpropagation matches the numerical gradient', () => {
  it('every parameter gradient agrees with a finite difference of the loss', () => {
    const fwd = forwardPass(net, [...x]);
    const back = backwardPass(net, fwd, y);
    const numeric = numericalParameterGradient(net, [...x], y);

    expect(back.gradB2).toBeCloseTo(numeric.gradB2, 6);
    for (let i = 0; i < 2; i++) {
      expect(back.gradW2[i]).toBeCloseTo(numeric.gradW2[i], 6);
    }
    for (let j = 0; j < 2; j++) {
      expect(back.gradB1[j]).toBeCloseTo(numeric.gradB1[j], 6);
      for (let i = 0; i < 2; i++) {
        expect(back.gradW1[j][i]).toBeCloseTo(numeric.gradW1[j][i], 6);
      }
    }
  });
});

describe('sigmoidDerivChain', () => {
  it('a product of sigmoid derivatives never exceeds 0.25 per factor', () => {
    // Each sigmoid'(z) <= 0.25, so the product over a deep chain collapses.
    const product = sigmoidDerivChain([0, 0, 0]);
    expect(product).toBeCloseTo(0.25 ** 3, 12);
  });

  it('the product shrinks as the chain grows', () => {
    const two = sigmoidDerivChain([0.4, -0.3]);
    const four = sigmoidDerivChain([0.4, -0.3, 1.2, -0.8]);
    expect(four).toBeLessThan(two);
  });
});
