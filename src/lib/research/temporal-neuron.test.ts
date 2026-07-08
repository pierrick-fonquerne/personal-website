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
  it('reste a zero tant qu aucun courant n est injecte', () => {
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

  it('monte le potentiel a l arrivee du courant puis declenche des que le seuil est atteint', () => {
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
    // t=5ms au pas dt=0.5 correspond a l index 10.
    expect(trace.potential?.[10]).toBeCloseTo(0, 10);
  });

  it('reinitialise le potentiel a 0 immediatement apres un spike (reset)', () => {
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
    // Sans nouveau courant, le potentiel reste a 0 apres le reset.
    expect(trace.potential?.[11]).toBe(0);
  });

  it('fuit exponentiellement le potentiel en l absence de nouveau stimulus', () => {
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

  it('applique un delai independant par ligne (delayAMs)', () => {
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
    // t=5ms + delai 3ms = 8ms, soit l index 16 au pas 0.5.
    expect(trace.potential?.slice(0, 16)).toEqual(new Array(16).fill(0));
    expect(trace.potential?.[16]).toBeCloseTo(1, 10);
  });

  it('applique un delai independant par ligne (delayBMs)', () => {
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
    // t=5ms + delai 4ms = 9ms, soit l index 18 au pas 0.5.
    expect(trace.potential?.slice(0, 18)).toEqual(new Array(18).fill(0));
    expect(trace.potential?.[18]).toBeCloseTo(1, 10);
  });

  it('additionne les courants des deux lignes quand elles coincident (integration)', () => {
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

  it('additionne deux impulsions de la meme ligne tombant dans le meme pas discretise', () => {
    const config: LifConfig = {
      tauMs: 1000,
      threshold: 100,
      weightA: 0.3,
      weightB: 0,
      delayAMs: 0,
      delayBMs: 0,
    };
    const neuron = createLifNeuron(config);
    // Avec dt=2, stepOf(5.9)=stepOf(6.1)=3 : les deux impulsions tombent dans le meme pas.
    const stimulus = stimulusOf([5.9, 6.1], []);
    const trace = neuron.run(stimulus, 2, 20);
    expect(trace.potential?.[3]).toBeCloseTo(0.6, 10);
  });

  it('ne declenche jamais sur un stimulus vide', () => {
    const neuron = createLifNeuron(TUNED_LIF.T1);
    const trace = neuron.run(stimulusOf([], []), DEFAULT_SIMULATION.dtMs, DEFAULT_SIMULATION.durationMs);
    expect(trace.fired).toBe(false);
    expect(trace.potential?.every((v) => v === 0)).toBe(true);
  });

  it('renvoie une trace de potentiel de longueur steps + 1', () => {
    const neuron = createLifNeuron(TUNED_LIF.T0);
    const trace = neuron.run(stimulusOf([10], [11]), 0.5, 50);
    expect(trace.potential).toHaveLength(101);
  });

  it('peut decharger plusieurs fois sur la duree de simulation (fired reste vrai)', () => {
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
    // Chaque impulsion declenche son propre reset a 0.
    expect(trace.potential?.[10]).toBe(0);
    expect(trace.potential?.[60]).toBe(0);
  });
});

describe('evaluate', () => {
  it('calcule l exactitude sur une batterie de stimuli', () => {
    const stateless = createStatelessUnit({ threshold: 2 });
    const result = evaluate(stateless, 'T0', 20, 0.8);
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.accuracy).toBeLessThanOrEqual(1);
    expect(result.unit).toBe('stateless');
    expect(result.task).toBe('T0');
  });

  it('marque solved a vrai quand l exactitude atteint le critere', () => {
    const stateless = createStatelessUnit({ threshold: 2 });
    const result = evaluate(stateless, 'T0', 50, 0.8);
    expect(result.solved).toBe(result.accuracy >= 0.8);
  });

  it('ne renvoie jamais NaN quand le nombre d essais vaut 0', () => {
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

  it('tient H1 quand le neurone a etat resout T1 et T2 et le sans etat aucun des deux', () => {
    const verdict = checkRefutation([
      resultOf('stateless', 'T1', false),
      resultOf('stateless', 'T2', false),
      resultOf('lif', 'T1', true),
      resultOf('lif', 'T2', true),
    ]);
    expect(verdict.h1Holds).toBe(true);
  });

  it('refute H1 des qu une unite sans etat resout T1', () => {
    const verdict = checkRefutation([
      resultOf('stateless', 'T1', true),
      resultOf('stateless', 'T2', false),
      resultOf('lif', 'T1', true),
      resultOf('lif', 'T2', true),
    ]);
    expect(verdict.h1Holds).toBe(false);
    expect(verdict.reason).toContain('T1');
  });

  it('refute H1 des qu une unite sans etat resout T2', () => {
    const verdict = checkRefutation([
      resultOf('stateless', 'T1', false),
      resultOf('stateless', 'T2', true),
      resultOf('lif', 'T1', true),
      resultOf('lif', 'T2', true),
    ]);
    expect(verdict.h1Holds).toBe(false);
    expect(verdict.reason).toContain('T2');
  });

  it('ne tient pas H1 si l unite a etat ne resout pas les deux taches temporelles', () => {
    const verdict = checkRefutation([
      resultOf('stateless', 'T1', false),
      resultOf('stateless', 'T2', false),
      resultOf('lif', 'T1', true),
      resultOf('lif', 'T2', false),
    ]);
    expect(verdict.h1Holds).toBe(false);
  });

  it('ne tient pas H1 sur une liste de resultats vide', () => {
    const verdict = checkRefutation([]);
    expect(verdict.h1Holds).toBe(false);
  });
});

describe('scenario de refutation publie (page /research/neurone-a-etat)', () => {
  it('reproduit le verdict affiche par TemporalIntegrationLab : H1 tenue', () => {
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

  it('le neurone sans etat reussit T0, la tache controle de simultaneite', () => {
    const stateless = createStatelessUnit({ threshold: 2 });
    const result = evaluate(stateless, 'T0', 100, 0.8);
    expect(result.solved).toBe(true);
  });

  it('expectedLabel et generateStimuli restent coherents avec les fenetres de TASK_META', () => {
    const stimuli = generateStimuli('T1', 40, 12345);
    for (const stimulus of stimuli) {
      const label = expectedLabel('T1', stimulus);
      expect(label).toBe(stimulus.label);
      expect(Math.abs(stimulus.a[0] - stimulus.b[0]) <= TASK_META.T1.windowMs).toBe(label);
    }
  });
});
