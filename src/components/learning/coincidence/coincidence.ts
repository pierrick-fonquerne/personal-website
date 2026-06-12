/**
 * A minimal leaky integrate-and-fire neuron, kept fully discrete so a beginner
 * can reproduce every step on paper. The membrane potential keeps a fraction of
 * its value at each step (the leak) and adds whatever charge arrives. When it
 * reaches the threshold it emits a spike and resets to zero.
 *
 * This is the stripped-down state machine behind coincidence detection: the
 * proper continuous-time equation (with a time constant tau) is introduced
 * later in the course.
 */
export interface MembraneParams {
  /** Fraction of the potential kept from one step to the next, in [0, 1). */
  readonly leak: number;
  /** Potential value that triggers a spike when reached. */
  readonly threshold: number;
}

/** Outcome of running the neuron over a sequence of input charges. */
export interface SimulationResult {
  /** Potential at each step, recorded at its peak (before any reset). */
  readonly potential: number[];
  /** Steps at which the neuron fired. */
  readonly spikeSteps: number[];
}

/**
 * Runs the neuron over a sequence of injected charges, one per time step.
 * At each step the carried potential leaks, the step's charge is added, and a
 * spike with reset occurs if the threshold is reached.
 */
export function simulate(params: MembraneParams, input: readonly number[]): SimulationResult {
  const potential: number[] = [];
  const spikeSteps: number[] = [];
  let carry = 0;
  for (let step = 0; step < input.length; step += 1) {
    const value = params.leak * carry + (input[step] ?? 0);
    potential.push(value);
    if (value >= params.threshold) {
      spikeSteps.push(step);
      carry = 0;
    } else {
      carry = value;
    }
  }
  return { potential, spikeSteps };
}

/**
 * Builds an input train of `steps` slots holding two pulses of equal `charge`:
 * one at step `firstAt`, the other `delay` steps later. A delay of zero makes
 * the two charges land on the same step and add up.
 */
export function buildTwoPulseInput(
  steps: number,
  firstAt: number,
  delay: number,
  charge: number,
): number[] {
  const input = new Array<number>(steps).fill(0);
  const addPulse = (at: number): void => {
    if (at >= 0 && at < steps) {
      input[at] = (input[at] ?? 0) + charge;
    }
  };
  addPulse(firstAt);
  addPulse(firstAt + delay);
  return input;
}

/**
 * Closed-form peak potential reached by two equal pulses separated by `delay`,
 * assuming the first pulse alone does not fire. The first pulse has decayed to
 * `charge * leak^delay` by the time the second pulse of size `charge` arrives.
 */
export function peakOfTwoPulses(params: MembraneParams, charge: number, delay: number): number {
  return charge * (1 + params.leak ** delay);
}

/** Whether two equal pulses separated by `delay` make the neuron fire. */
export function firesOnTwoPulses(params: MembraneParams, charge: number, delay: number): boolean {
  return peakOfTwoPulses(params, charge, delay) >= params.threshold;
}

/**
 * Largest integer delay for which two equal pulses still trigger a spike.
 * Returns `Infinity` when a single pulse already reaches the threshold, and
 * `-1` when even simultaneous pulses cannot reach it.
 */
export function coincidenceWindow(params: MembraneParams, charge: number): number {
  if (charge >= params.threshold) {
    return Infinity;
  }
  // Need charge * (1 + leak^delay) >= threshold, i.e. leak^delay >= ratio.
  const ratio = params.threshold / charge - 1;
  if (ratio > 1) {
    // Even delay 0 (leak^0 = 1) cannot reach the threshold.
    return -1;
  }
  if (params.leak <= 0) {
    // No memory: only a simultaneous arrival (delay 0) can stack.
    return ratio <= 1 ? 0 : -1;
  }
  const exact = Math.log(ratio) / Math.log(params.leak);
  return Math.floor(exact + 1e-9);
}
