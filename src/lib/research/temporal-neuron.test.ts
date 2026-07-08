import { describe, expect, it } from 'vitest';
import {
  checkRefutation,
  createLifNeuron,
  createStatelessUnit,
  DEFAULT_SIMULATION,
  evaluate,
  expectedLabel,
  generateStimuli,
  TASK_META,
  TUNED_LIF,
  type LifConfig,
  type RawStimulus,
  type TaskResult,
} from './temporal-neuron';

function stimulusOf(a: readonly number[], b: readonly number[], label = true): RawStimulus {
  return { a, b, label };
}

describe('createLifNeuron', () => {
  it('stays at zero as long as no current has been injected', () => {
    const config: LifConfig = {
      tauMs: 10,
      threshold: 0.5,
      weightA: 0.6,
      weightB: 0,
      delayAMs: 0,
      delayBMs: 0,
    };
    const neuron = createLifNeuron(config);
    const stimulus = stimulusOf([5], []);
    const trace = neuron.run(stimulus, 0.5, 4);
    expect(trace.potential?.slice(0, 9)).toEqual(new Array(9).fill(0));
  });

  it('raises the potential when the current arrives then fires as soon as the threshold is reached', () => {
    const config: LifConfig = {
      tauMs: 10,
      threshold: 0.5,
      weightA: 0.6,
      weightB: 0,
      delayAMs: 0,
      delayBMs: 0,
    };
    const neuron = createLifNeuron(config);
    const stimulus = stimulusOf([5], []);
    const trace = neuron.run(stimulus, 0.5, 20);
    expect(trace.fired).toBe(true);
    // t=5ms at step dt=0.5 corresponds to index 10.
    expect(trace.potential?.[10]).toBeCloseTo(0, 10);
  });

  it('resets the potential to 0 immediately after a spike (reset)', () => {
    const config: LifConfig = {
      tauMs: 10,
      threshold: 0.3,
      weightA: 1,
      weightB: 0,
      delayAMs: 0,
      delayBMs: 0,
    };
    const neuron = createLifNeuron(config);
    const stimulus = stimulusOf([5], []);
    const trace = neuron.run(stimulus, 0.5, 20);
    expect(trace.fired).toBe(true);
    expect(trace.potential?.[10]).toBe(0);
    // Without new current, the potential stays at 0 after the reset.
    expect(trace.potential?.[11]).toBe(0);
  });

  it('leaks the potential exponentially in the absence of a new stimulus', () => {
    const config: LifConfig = {
      tauMs: 10,
      threshold: 100,
      weightA: 1,
      weightB: 0,
      delayAMs: 0,
      delayBMs: 0,
    };
    const neuron = createLifNeuron(config);
    const stimulus = stimulusOf([5], []);
    const trace = neuron.run(stimulus, 0.5, 20);
    const decay = Math.exp(-0.5 / 10);
    expect(trace.potential?.[10]).toBeCloseTo(1, 10);
    expect(trace.potential?.[11]).toBeCloseTo(decay, 10);
    expect(trace.potential?.[12]).toBeCloseTo(decay * decay, 10);
    expect(trace.fired).toBe(false);
  });

  it('applies an independent delay per line (delayAMs)', () => {
    const config: LifConfig = {
      tauMs: 1000,
      threshold: 100,
      weightA: 1,
      weightB: 0,
      delayAMs: 3,
      delayBMs: 0,
    };
    const neuron = createLifNeuron(config);
    const stimulus = stimulusOf([5], []);
    const trace = neuron.run(stimulus, 0.5, 20);
    // t=5ms + delay 3ms = 8ms, i.e. index 16 at step 0.5.
    expect(trace.potential?.slice(0, 16)).toEqual(new Array(16).fill(0));
    expect(trace.potential?.[16]).toBeCloseTo(1, 10);
  });

  it('applies an independent delay per line (delayBMs)', () => {
    const config: LifConfig = {
      tauMs: 1000,
      threshold: 100,
      weightA: 0,
      weightB: 1,
      delayAMs: 0,
      delayBMs: 4,
    };
    const neuron = createLifNeuron(config);
    const stimulus = stimulusOf([], [5]);
    const trace = neuron.run(stimulus, 0.5, 20);
    // t=5ms + delay 4ms = 9ms, i.e. index 18 at step 0.5.
    expect(trace.potential?.slice(0, 18)).toEqual(new Array(18).fill(0));
    expect(trace.potential?.[18]).toBeCloseTo(1, 10);
  });

  it('sums the currents of both lines when they coincide (integration)', () => {
    const config: LifConfig = {
      tauMs: 1000,
      threshold: 100,
      weightA: 0.4,
      weightB: 0.4,
      delayAMs: 0,
      delayBMs: 0,
    };
    const neuron = createLifNeuron(config);
    const stimulus = stimulusOf([5, 15], [5]);
    const trace = neuron.run(stimulus, 0.5, 20);
    expect(trace.potential?.[10]).toBeCloseTo(0.8, 10);
  });

  it('sums two pulses on the same line landing in the same discretized step', () => {
    const config: LifConfig = {
      tauMs: 1000,
      threshold: 100,
      weightA: 0.3,
      weightB: 0,
      delayAMs: 0,
      delayBMs: 0,
    };
    const neuron = createLifNeuron(config);
    // With dt=2, stepOf(5.9)=stepOf(6.1)=3: both pulses land in the same step.
    const stimulus = stimulusOf([5.9, 6.1], []);
    const trace = neuron.run(stimulus, 2, 20);
    expect(trace.potential?.[3]).toBeCloseTo(0.6, 10);
  });

  it('never fires on an empty stimulus', () => {
    const neuron = createLifNeuron(TUNED_LIF.T1);
    const trace = neuron.run(stimulusOf([], []), DEFAULT_SIMULATION.dtMs, DEFAULT_SIMULATION.durationMs);
    expect(trace.fired).toBe(false);
    expect(trace.potential?.every((v) => v === 0)).toBe(true);
  });

  it('returns a potential trace of length steps + 1', () => {
    const neuron = createLifNeuron(TUNED_LIF.T0);
    const trace = neuron.run(stimulusOf([10], [11]), 0.5, 50);
    expect(trace.potential).toHaveLength(101);
  });

  it('can fire multiple times over the simulation duration (fired stays true)', () => {
    const config: LifConfig = {
      tauMs: 1,
      threshold: 0.5,
      weightA: 1,
      weightB: 0,
      delayAMs: 0,
      delayBMs: 0,
    };
    const neuron = createLifNeuron(config);
    const stimulus = stimulusOf([5, 30], []);
    const trace = neuron.run(stimulus, 0.5, 40);
    expect(trace.fired).toBe(true);
    // Each pulse triggers its own reset to 0.
    expect(trace.potential?.[10]).toBe(0);
    expect(trace.potential?.[60]).toBe(0);
  });
});

describe('evaluate', () => {
  it('computes accuracy over a battery of stimuli', () => {
    const stateless = createStatelessUnit({ threshold: 2 });
    const result = evaluate(stateless, 'T0', 20, 0.8);
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.accuracy).toBeLessThanOrEqual(1);
    expect(result.unit).toBe('stateless');
    expect(result.task).toBe('T0');
  });

  it('marks solved as true when accuracy reaches the criterion', () => {
    const stateless = createStatelessUnit({ threshold: 2 });
    const result = evaluate(stateless, 'T0', 50, 0.8);
    expect(result.solved).toBe(result.accuracy >= 0.8);
  });

  it('never returns NaN when the trial count is 0', () => {
    const stateless = createStatelessUnit({ threshold: 2 });
    const result = evaluate(stateless, 'T0', 0, 0.8);
    expect(result.accuracy).not.toBeNaN();
    expect(result.accuracy).toBe(0);
    expect(result.solved).toBe(false);
  });
});

describe('checkRefutation', () => {
  function resultOf(unit: string, task: 'T0' | 'T1' | 'T2', solved: boolean): TaskResult {
    return { task, unit, accuracy: solved ? 0.95 : 0.5, solved };
  }

  it('holds H1 when the stateful neuron solves T1 and T2 and the stateless unit solves neither', () => {
    const verdict = checkRefutation([
      resultOf('stateless', 'T1', false),
      resultOf('stateless', 'T2', false),
      resultOf('lif', 'T1', true),
      resultOf('lif', 'T2', true),
    ]);
    expect(verdict.h1Holds).toBe(true);
  });

  it('refutes H1 as soon as a stateless unit solves T1', () => {
    const verdict = checkRefutation([
      resultOf('stateless', 'T1', true),
      resultOf('stateless', 'T2', false),
      resultOf('lif', 'T1', true),
      resultOf('lif', 'T2', true),
    ]);
    expect(verdict.h1Holds).toBe(false);
    expect(verdict.reason).toContain('T1');
  });

  it('refutes H1 as soon as a stateless unit solves T2', () => {
    const verdict = checkRefutation([
      resultOf('stateless', 'T1', false),
      resultOf('stateless', 'T2', true),
      resultOf('lif', 'T1', true),
      resultOf('lif', 'T2', true),
    ]);
    expect(verdict.h1Holds).toBe(false);
    expect(verdict.reason).toContain('T2');
  });

  it('does not hold H1 if the stateful unit does not solve both temporal tasks', () => {
    const verdict = checkRefutation([
      resultOf('stateless', 'T1', false),
      resultOf('stateless', 'T2', false),
      resultOf('lif', 'T1', true),
      resultOf('lif', 'T2', false),
    ]);
    expect(verdict.h1Holds).toBe(false);
  });

  it('does not hold H1 on an empty result list', () => {
    const verdict = checkRefutation([]);
    expect(verdict.h1Holds).toBe(false);
  });
});

describe('published refutation scenario (page /research/neurone-a-etat)', () => {
  it('reproduces the verdict shown by TemporalIntegrationLab: H1 holds', () => {
    const trials = 100;
    const criterion = 0.8;
    const stateless = createStatelessUnit({ threshold: 2 });

    const results: TaskResult[] = [
      evaluate(stateless, 'T1', trials, criterion),
      evaluate(stateless, 'T2', trials, criterion),
      evaluate(createLifNeuron(TUNED_LIF.T1), 'T1', trials, criterion),
      evaluate(createLifNeuron(TUNED_LIF.T2), 'T2', trials, criterion),
    ];

    expect(results.find((r) => r.unit === 'stateless' && r.task === 'T1')?.solved).toBe(false);
    expect(results.find((r) => r.unit === 'stateless' && r.task === 'T2')?.solved).toBe(false);
    expect(results.find((r) => r.unit === 'lif' && r.task === 'T1')?.solved).toBe(true);
    expect(results.find((r) => r.unit === 'lif' && r.task === 'T2')?.solved).toBe(true);

    const verdict = checkRefutation(results);
    expect(verdict.h1Holds).toBe(true);
  });

  it('the stateless neuron succeeds at T0, the simultaneity control task', () => {
    const stateless = createStatelessUnit({ threshold: 2 });
    const result = evaluate(stateless, 'T0', 100, 0.8);
    expect(result.solved).toBe(true);
  });

  it('expectedLabel and generateStimuli remain consistent with the TASK_META windows', () => {
    const stimuli = generateStimuli('T1', 40, 12345);
    for (const stimulus of stimuli) {
      const label = expectedLabel('T1', stimulus);
      expect(label).toBe(stimulus.label);
      expect(Math.abs(stimulus.a[0] - stimulus.b[0]) <= TASK_META.T1.windowMs).toBe(label);
    }
  });
});
