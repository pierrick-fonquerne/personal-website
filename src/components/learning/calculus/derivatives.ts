/** A scalar function of one real variable. */
export type ScalarFn = (x: number) => number;

/** Squares its argument. */
export function square(x: number): number {
  return x * x;
}

/** Analytic derivative of {@link square}: 2x. */
export function squareDeriv(x: number): number {
  return 2 * x;
}

/** Logistic sigmoid. */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Analytic derivative of {@link sigmoid}: s(1 - s). */
export function sigmoidDeriv(x: number): number {
  const s = sigmoid(x);
  return s * (1 - s);
}

/**
 * Central-difference approximation of the derivative of `f` at `x`.
 * Central difference is second-order accurate, far better than forward difference.
 */
export function numericalDerivative(f: ScalarFn, x: number, h = 1e-5): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

/**
 * Chain rule for a scalar composition: given the outer derivative evaluated at
 * the inner value and the inner derivative, returns the derivative of the composite.
 */
export function chainRule(outerDeriv: number, innerDeriv: number): number {
  return outerDeriv * innerDeriv;
}

/** A scalar function of several real variables. */
export type MultiFn = (xs: readonly number[]) => number;

/** Central-difference partial derivative of `f` with respect to coordinate `i`. */
export function partialDerivative(f: MultiFn, xs: readonly number[], i: number, h = 1e-5): number {
  const plus = xs.slice();
  const minus = xs.slice();
  plus[i] = (plus[i] ?? 0) + h;
  minus[i] = (minus[i] ?? 0) - h;
  return (f(plus) - f(minus)) / (2 * h);
}

/** Gradient of `f` at `xs`: the vector of partial derivatives. */
export function gradient(f: MultiFn, xs: readonly number[], h = 1e-5): number[] {
  return xs.map((_, i) => partialDerivative(f, xs, i, h));
}

/** Squared-error loss of a single sigmoid neuron: L = (sigmoid(wx + b) - y)^2. */
export function neuronLoss(w: number, b: number, x: number, y: number): number {
  const a = sigmoid(w * x + b);
  return (a - y) ** 2;
}

/**
 * Analytic gradient of {@link neuronLoss} via the chain rule.
 * dL/dz = 2(a - y) * a(1 - a), then dL/dw = dL/dz * x and dL/db = dL/dz.
 */
export function neuronLossGradient(
  w: number,
  b: number,
  x: number,
  y: number,
): { dW: number; dB: number } {
  const z = w * x + b;
  const a = sigmoid(z);
  const dLdz = 2 * (a - y) * a * (1 - a);
  return { dW: dLdz * x, dB: dLdz };
}
