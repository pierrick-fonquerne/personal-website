/**
 * The passive membrane as an RC circuit. A neuron membrane stores charge like a
 * capacitor (capacitance C) and lets it leak through its ion channels like a
 * resistor (resistance R). Cut the input and the potential decays exponentially
 * with a single time constant tau = R * C.
 *
 * This module is the physical origin of the leak factor lambda posed by hand in
 * chapter 1: sampling the continuous decay every dt yields exactly the discrete
 * recurrence v(k+1) = lambda * v(k) with lambda = exp(-dt / tau). The full
 * differential equation with threshold and reset (the LIF model) comes in
 * chapter 3.
 */
export interface RcParams {
  /** Membrane resistance R (how readily the channels let charge leak out). */
  readonly resistance: number;
  /** Membrane capacitance C (how much charge the membrane stores). */
  readonly capacitance: number;
}

/** The membrane time constant tau = R * C: the natural timescale of the decay. */
export function timeConstant(params: RcParams): number {
  return params.resistance * params.capacitance;
}

/**
 * Continuous decay of the potential: V(t) = v0 * exp(-t / tau).
 * At t = tau the potential has fallen to 1/e (about 37%) of its initial value,
 * meaning roughly 63% of the charge has leaked away.
 */
export function decay(v0: number, t: number, tau: number): number {
  return v0 * Math.exp(-t / tau);
}

/**
 * The leak factor of chapter 1 read off the physics: lambda = exp(-dt / tau).
 * It is the fraction of the potential kept after one sampling step of length dt.
 */
export function lambdaFromStep(dt: number, tau: number): number {
  return Math.exp(-dt / tau);
}

/**
 * Discrete potential of the chapter-1 recurrence with no input:
 * v(0) = v0, v(k+1) = lambda * v(k), i.e. v(k) = v0 * lambda^k.
 * Returns `count` successive values starting at v0.
 */
export function sampleRecurrence(v0: number, lambda: number, count: number): number[] {
  const points: number[] = [];
  let value = v0;
  for (let step = 0; step < count; step += 1) {
    points.push(value);
    value *= lambda;
  }
  return points;
}

/**
 * Time needed for the decay to leave a given fraction of the initial charge:
 * solving exp(-t / tau) = fraction gives t = -tau * ln(fraction).
 * With fraction = 1/e the result is exactly tau (63% lost, 37% left).
 */
export function timeToRemainingFraction(tau: number, fraction: number): number {
  return -tau * Math.log(fraction);
}
