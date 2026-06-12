import { describe, expect, it } from 'vitest';
import {
  simulate,
  buildTwoPulseInput,
  peakOfTwoPulses,
  firesOnTwoPulses,
  coincidenceWindow,
  type MembraneParams,
} from './coincidence';

const params: MembraneParams = { leak: 0.7, threshold: 0.9 };
const charge = 0.6;

describe('simulate', () => {
  it('leaks the potential toward zero with no input', () => {
    const input = [1, 0, 0, 0];
    const { potential } = simulate({ leak: 0.5, threshold: 10 }, input);
    expect(potential[0]).toBeCloseTo(1, 10);
    expect(potential[1]).toBeCloseTo(0.5, 10);
    expect(potential[2]).toBeCloseTo(0.25, 10);
    expect(potential[3]).toBeCloseTo(0.125, 10);
  });

  it('records no spike when the potential never reaches the threshold', () => {
    const input = [0.6, 0, 0, 0];
    const { spikeSteps } = simulate(params, input);
    expect(spikeSteps).toEqual([]);
  });

  it('fires and resets to zero when the threshold is crossed', () => {
    const input = [1, 0, 0];
    const { potential, spikeSteps } = simulate({ leak: 0.5, threshold: 0.9 }, input);
    // step 0: v = 1 >= 0.9 -> spike, peak recorded as 1, carry resets to 0
    expect(spikeSteps).toEqual([0]);
    expect(potential[0]).toBeCloseTo(1, 10);
    // step 1 leaks from the reset (0), so it stays at 0
    expect(potential[1]).toBeCloseTo(0, 10);
  });
});

describe('buildTwoPulseInput', () => {
  it('places two pulses of equal charge at the right steps', () => {
    const input = buildTwoPulseInput(6, 1, 2, 0.6);
    expect(input).toHaveLength(6);
    expect(input[1]).toBeCloseTo(0.6, 10);
    expect(input[3]).toBeCloseTo(0.6, 10);
    expect(input[0]).toBe(0);
    expect(input[2]).toBe(0);
  });

  it('superposes the charges when the delay is zero', () => {
    const input = buildTwoPulseInput(4, 1, 0, 0.6);
    expect(input[1]).toBeCloseTo(1.2, 10);
  });
});

describe('peakOfTwoPulses', () => {
  it('equals charge times (1 + leak^delay)', () => {
    expect(peakOfTwoPulses(params, charge, 0)).toBeCloseTo(1.2, 10);
    expect(peakOfTwoPulses(params, charge, 1)).toBeCloseTo(0.6 * 1.7, 10);
    expect(peakOfTwoPulses(params, charge, 2)).toBeCloseTo(0.6 * (1 + 0.49), 10);
  });
});

describe('firesOnTwoPulses', () => {
  it('fires when the two pulses are close, stays silent when far apart', () => {
    expect(firesOnTwoPulses(params, charge, 0)).toBe(true);
    expect(firesOnTwoPulses(params, charge, 1)).toBe(true);
    expect(firesOnTwoPulses(params, charge, 2)).toBe(false);
    expect(firesOnTwoPulses(params, charge, 5)).toBe(false);
  });

  it('a single pulse below threshold never fires on its own', () => {
    const input = buildTwoPulseInput(8, 1, 99, charge);
    const { spikeSteps } = simulate(params, input.slice(0, 5));
    expect(spikeSteps).toEqual([]);
  });
});

describe('coincidenceWindow', () => {
  it('returns the largest delay that still triggers a spike', () => {
    expect(coincidenceWindow(params, charge)).toBe(1);
  });

  it('returns -1 when even simultaneous pulses cannot reach the threshold', () => {
    // charge well below half the threshold: 2 * 0.3 = 0.6 < 0.9
    expect(coincidenceWindow(params, 0.3)).toBe(-1);
  });

  it('returns Infinity when a single pulse already reaches the threshold', () => {
    expect(coincidenceWindow(params, 1.0)).toBe(Infinity);
  });
});
