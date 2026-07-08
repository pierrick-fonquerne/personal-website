/**
 * Pure simulation core for the "stateful neuron" concept page.
 *
 * Two competing unit families receive the exact same raw two line stimulus.
 * Only the leaky integrate and fire unit owns an internal state. The module
 * exposes the three graded tasks (T0 simultaneity, T1 coincidence, T2 order)
 * and a refutation engine that encodes hypothesis H1.
 */

/** Spike times in milliseconds on a single input line. */
export type SpikeTrain = readonly number[];

/** Raw two line stimulus plus the ground truth label for a given task. */
export interface RawStimulus {
  readonly a: SpikeTrain;
  readonly b: SpikeTrain;
  readonly label: boolean;
}

export type TaskId = 'T0' | 'T1' | 'T2';

/** Membrane trace and outcome of running one unit over one stimulus. */
export interface UnitTrace {
  readonly fired: boolean;
  /** Membrane potential sampled per step. Undefined for a memoryless unit. */
  readonly potential?: readonly number[];
}

/** A competing unit. Same RawStimulus for everyone, only the rich one remembers. */
export interface Unit {
  readonly name: string;
  run(stimulus: RawStimulus, dtMs: number, durationMs: number): UnitTrace;
}

/** Memoryless unit: a threshold on the instantaneous count of active lines. */
export interface StatelessConfig {
  readonly threshold: number;
}

/** Leaky integrate and fire unit with internal state and per line delays. */
export interface LifConfig {
  readonly tauMs: number;
  readonly threshold: number;
  readonly weightA: number;
  readonly weightB: number;
  readonly delayAMs: number;
  readonly delayBMs: number;
}

export interface SimulationConfig {
  readonly dtMs: number;
  readonly durationMs: number;
}

export const DEFAULT_SIMULATION: SimulationConfig = { dtMs: 0.5, durationMs: 50 };

export interface TaskResult {
  readonly task: TaskId;
  readonly unit: string;
  readonly accuracy: number;
  readonly solved: boolean;
}

export interface RefutationVerdict {
  readonly h1Holds: boolean;
  readonly reason: string;
}

function stepOf(timeMs: number, dtMs: number): number {
  return Math.round(timeMs / dtMs);
}

function activeLinesAt(stimulus: RawStimulus, step: number, dtMs: number): number {
  const a = stimulus.a.some((t) => stepOf(t, dtMs) === step) ? 1 : 0;
  const b = stimulus.b.some((t) => stepOf(t, dtMs) === step) ? 1 : 0;
  return a + b;
}

function injectedCurrent(
  stimulus: RawStimulus,
  step: number,
  dtMs: number,
  config: LifConfig,
): number {
  let current = 0;
  for (const t of stimulus.a) {
    if (stepOf(t + config.delayAMs, dtMs) === step) current += config.weightA;
  }
  for (const t of stimulus.b) {
    if (stepOf(t + config.delayBMs, dtMs) === step) current += config.weightB;
  }
  return current;
}

export function createStatelessUnit(config: StatelessConfig): Unit {
  return {
    name: 'stateless',
    run(stimulus, dtMs, durationMs) {
      const steps = Math.round(durationMs / dtMs);
      for (let i = 0; i <= steps; i += 1) {
        if (activeLinesAt(stimulus, i, dtMs) >= config.threshold) {
          return { fired: true };
        }
      }
      return { fired: false };
    },
  };
}

export function createLifNeuron(config: LifConfig): Unit {
  return {
    name: 'lif',
    run(stimulus, dtMs, durationMs) {
      const steps = Math.round(durationMs / dtMs);
      const decay = Math.exp(-dtMs / config.tauMs);
      const potential: number[] = [];
      let v = 0;
      let fired = false;
      for (let i = 0; i <= steps; i += 1) {
        v = v * decay + injectedCurrent(stimulus, i, dtMs, config);
        if (v >= config.threshold) {
          fired = true;
          v = 0;
        }
        potential.push(v);
      }
      return { fired, potential };
    },
  };
}

function rng(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function between(next: () => number, lo: number, hi: number): number {
  return lo + next() * (hi - lo);
}

/** Generates `count` balanced stimuli (half positive, half negative) for a task. */
export function generateStimuli(task: TaskId, count: number, seed: number): RawStimulus[] {
  const next = rng(seed);
  const stimuli: RawStimulus[] = [];
  for (let i = 0; i < count; i += 1) {
    const positive = i % 2 === 0;
    const tA = between(next, 10, 28);
    let tB: number;
    if (task === 'T0') {
      tB = positive ? tA : tA + (next() < 0.5 ? -1 : 1) * between(next, 5, 14);
    } else if (task === 'T1') {
      tB = positive
        ? tA + (next() < 0.5 ? -1 : 1) * between(next, 0, 7)
        : tA + (next() < 0.5 ? -1 : 1) * between(next, 12, 20);
    } else {
      const lead = between(next, 3, 9);
      tB = positive ? tA + lead : tA - lead;
    }
    stimuli.push({ a: [tA], b: [tB], label: positive });
  }
  return stimuli;
}

/** Tuned stateful configuration that solves each task. One detector per task. */
export const TUNED_LIF: Record<TaskId, LifConfig> = {
  T0: { tauMs: 8, threshold: 1.0, weightA: 0.6, weightB: 0.6, delayAMs: 0, delayBMs: 0 },
  T1: { tauMs: 12, threshold: 0.9, weightA: 0.65, weightB: 0.65, delayAMs: 0, delayBMs: 0 },
  T2: { tauMs: 4, threshold: 0.85, weightA: 0.6, weightB: 0.6, delayAMs: 6, delayBMs: 0 },
};

export interface TaskMeta {
  readonly id: TaskId;
  readonly windowMs: number;
}

export const TASK_META: Record<TaskId, TaskMeta> = {
  T0: { id: 'T0', windowMs: 2 },
  T1: { id: 'T1', windowMs: 8 },
  T2: { id: 'T2', windowMs: 9 },
};

/** Ground truth oracle for a single stimulus, used by the interactive demo. */
export function expectedLabel(task: TaskId, stimulus: { a: SpikeTrain; b: SpikeTrain }): boolean {
  const a = stimulus.a[0] ?? 0;
  const b = stimulus.b[0] ?? 0;
  if (task === 'T0') return Math.abs(a - b) <= TASK_META.T0.windowMs;
  if (task === 'T1') return Math.abs(a - b) <= TASK_META.T1.windowMs;
  return b - a >= 3 && b - a <= 9;
}

export function evaluate(
  unit: Unit,
  task: TaskId,
  trials: number,
  criterion: number,
  sim: SimulationConfig = DEFAULT_SIMULATION,
  seed = 12345,
): TaskResult {
  const stimuli = generateStimuli(task, trials, seed);
  let correct = 0;
  for (const stimulus of stimuli) {
    const predicted = unit.run(stimulus, sim.dtMs, sim.durationMs).fired;
    if (predicted === stimulus.label) correct += 1;
  }
  const accuracy = stimuli.length === 0 ? 0 : correct / stimuli.length;
  return { task, unit: unit.name, accuracy, solved: accuracy >= criterion };
}

/**
 * H1 holds when no stateless unit solves the temporal tasks T1 or T2 while a
 * stateful unit solves both. A stateless success on T1 or T2 would refute it.
 */
export function checkRefutation(results: readonly TaskResult[]): RefutationVerdict {
  const statelessBreakthrough = results.find(
    (r) => r.unit === 'stateless' && (r.task === 'T1' || r.task === 'T2') && r.solved,
  );
  if (statelessBreakthrough) {
    return {
      h1Holds: false,
      reason: `A stateless unit solved ${statelessBreakthrough.task}, which refutes H1.`,
    };
  }
  const richT1 = results.some((r) => r.unit === 'lif' && r.task === 'T1' && r.solved);
  const richT2 = results.some((r) => r.unit === 'lif' && r.task === 'T2' && r.solved);
  if (richT1 && richT2) {
    return { h1Holds: true, reason: 'Stateful unit solves T1 and T2, stateless solves neither.' };
  }
  return { h1Holds: false, reason: 'Stateful unit did not solve both temporal tasks.' };
}
