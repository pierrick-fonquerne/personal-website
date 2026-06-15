import { sigmoid, sigmoidDeriv } from '../calculus/derivatives';

/**
 * A tiny fully connected network with two inputs, two sigmoid hidden units and
 * one sigmoid output. It is the running example of the backpropagation chapter:
 * small enough to differentiate by hand, rich enough to show a hidden unit
 * receiving the summed error signal of every unit it feeds.
 */
export interface Network221 {
  /** Hidden weights, `w1[j][i]` from input `i` to hidden unit `j` (2 by 2). */
  w1: number[][];
  /** Hidden biases, one per hidden unit (length 2). */
  b1: number[];
  /** Output weights, `w2[j]` from hidden unit `j` to the output (length 2). */
  w2: number[];
  /** Output bias. */
  b2: number;
}

/** Everything the forward pass computes and stores for the backward pass. */
export interface ForwardResult {
  /** The input that was fed in, kept for the weight gradients. */
  x: number[];
  /** Hidden pre-activations `z1[j] = sum_i w1[j][i] x[i] + b1[j]`. */
  z1: number[];
  /** Hidden activations `a1[j] = sigmoid(z1[j])`. */
  a1: number[];
  /** Output pre-activation `z2 = sum_j w2[j] a1[j] + b2`. */
  z2: number;
  /** Output activation `a2 = sigmoid(z2)`. */
  a2: number;
}

/** Error signals and parameter gradients produced by the backward pass. */
export interface BackwardResult {
  /** Output error signal `deltaOut = dL/dz2`. */
  deltaOut: number;
  /** Hidden error signals `deltaHidden[j] = dL/dz1[j]`. */
  deltaHidden: number[];
  /** Gradient of the loss w.r.t. each output weight. */
  gradW2: number[];
  /** Gradient of the loss w.r.t. the output bias. */
  gradB2: number;
  /** Gradient of the loss w.r.t. each hidden weight, same shape as `w1`. */
  gradW1: number[][];
  /** Gradient of the loss w.r.t. each hidden bias. */
  gradB1: number[];
}

/** Gradients of every parameter, used to cross-check the backward pass. */
export interface ParameterGradient {
  gradW1: number[][];
  gradB1: number[];
  gradW2: number[];
  gradB2: number;
}

/**
 * Forward pass: propagates the input through the hidden layer to the output,
 * returning every intermediate value. The backward pass reads these instead of
 * recomputing them, which is the whole point of storing the activations.
 */
export function forwardPass(net: Network221, x: number[]): ForwardResult {
  const z1 = net.w1.map((row, j) => row.reduce((sum, w, i) => sum + w * x[i], 0) + net.b1[j]);
  const a1 = z1.map(sigmoid);
  const z2 = net.w2.reduce((sum, w, j) => sum + w * a1[j], 0) + net.b2;
  const a2 = sigmoid(z2);
  return { x: x.slice(), z1, a1, z2, a2 };
}

/** Squared-error loss of the network on a single example: `L = (a2 - y)^2`. */
export function loss(net: Network221, x: number[], y: number): number {
  return (forwardPass(net, x).a2 - y) ** 2;
}

/**
 * Backward pass: starts from the output error signal and propagates it back
 * through the network, assembling every parameter gradient on the way.
 *
 * Output unit: `deltaOut = dL/da2 * sigmoid'(z2) = 2(a2 - y) a2 (1 - a2)`.
 * Hidden unit `j`: `deltaHidden[j] = (w2[j] deltaOut) sigmoid'(z1[j])`, the
 * downstream error weighted by the connection, scaled by the local slope.
 * Weight gradient: `dL/dw = (delta of the downstream unit) * (activation of the
 * upstream unit)`, the master rule of backpropagation.
 */
export function backwardPass(net: Network221, fwd: ForwardResult, y: number): BackwardResult {
  const deltaOut = 2 * (fwd.a2 - y) * fwd.a2 * (1 - fwd.a2);
  const gradW2 = fwd.a1.map((a) => deltaOut * a);
  const gradB2 = deltaOut;

  const deltaHidden = fwd.a1.map((a, j) => net.w2[j] * deltaOut * a * (1 - a));
  const gradW1 = deltaHidden.map((d) => fwd.x.map((xi) => d * xi));
  const gradB1 = deltaHidden.slice();

  return { deltaOut, deltaHidden, gradW2, gradB2, gradW1, gradB1 };
}

/** Deep copy of a network, so a perturbation never mutates the original. */
function cloneNetwork(net: Network221): Network221 {
  return {
    w1: net.w1.map((row) => row.slice()),
    b1: net.b1.slice(),
    w2: net.w2.slice(),
    b2: net.b2,
  };
}

/**
 * Numerical gradient of the loss w.r.t. every parameter, by central difference.
 * This is the independent oracle: a correct backward pass must match it. It is
 * far too slow for real training (one forward pass per parameter), which is
 * exactly why backpropagation exists.
 */
export function numericalParameterGradient(
  net: Network221,
  x: number[],
  y: number,
  h = 1e-5,
): ParameterGradient {
  const slope = (assign: (n: Network221, value: number) => void, current: number): number => {
    const plus = cloneNetwork(net);
    assign(plus, current + h);
    const minus = cloneNetwork(net);
    assign(minus, current - h);
    return (loss(plus, x, y) - loss(minus, x, y)) / (2 * h);
  };

  const gradW1 = net.w1.map((row, j) =>
    row.map((w, i) =>
      slope((n, v) => {
        n.w1[j][i] = v;
      }, w),
    ),
  );
  const gradB1 = net.b1.map((b, j) =>
    slope((n, v) => {
      n.b1[j] = v;
    }, b),
  );
  const gradW2 = net.w2.map((w, j) =>
    slope((n, v) => {
      n.w2[j] = v;
    }, w),
  );
  const gradB2 = slope((n, v) => {
    n.b2 = v;
  }, net.b2);

  return { gradW1, gradB1, gradW2, gradB2 };
}

/**
 * Product of sigmoid derivatives along a chain of pre-activations. Each factor
 * is at most 0.25, so the product collapses geometrically with depth: the
 * vanishing-gradient effect that makes deep sigmoid stacks hard to train.
 */
export function sigmoidDerivChain(zs: number[]): number {
  return zs.reduce((product, z) => product * sigmoidDeriv(z), 1);
}
