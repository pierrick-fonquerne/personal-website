import { describe, it, expect } from 'vitest';
import { createRandomGenerator } from '../regularization/regularizationLogic';
import {
  NETWORK_DEPTH,
  NETWORK_SEED,
  TWIN_WEIGHT,
  XOR_LEARNING_RATE,
  XOR_SEED,
  XOR_SNAPSHOT_COUNT,
  XOR_STEPS_PER_SNAPSHOT,
  activate,
  activationDerivative,
  batchNormalize,
  gaussianSample,
  initialXorNetwork,
  propagateThroughDepth,
  standardDeviation,
  twinDistance,
  weightVariance,
  xorForward,
  xorLoss,
  xorSnapshots,
  xorTrainingStep,
  type DepthExperiment,
  type XorNetwork,
} from './initializationLogic';

const ZERO_NETWORK: XorNetwork = {
  hiddenWeights: [
    [0, 0],
    [0, 0],
  ],
  hiddenBiases: [0, 0],
  outputWeights: [0, 0],
  outputBias: 0,
};

function experiment(
  activation: DepthExperiment['activation'],
  scheme: DepthExperiment['scheme'],
  isBatchNormalized: boolean,
): DepthExperiment {
  return { activation, scheme, isBatchNormalized, seed: NETWORK_SEED };
}

function deviations(depthExperiment: DepthExperiment): readonly number[] {
  return propagateThroughDepth(depthExperiment).map((layer) => layer.activationStandardDeviation);
}

function lastOf(values: readonly number[]): number {
  return values[values.length - 1];
}

describe('weight variance', () => {
  it('uses unit variance for the standard normal scheme', () => {
    expect(weightVariance('standard-normal', 64, 64)).toBe(1);
  });

  it('uses 0.01 squared for the small scheme', () => {
    expect(weightVariance('small', 64, 64)).toBeCloseTo(1e-4, 15);
  });

  it('uses 2 / (fanIn + fanOut) for Xavier', () => {
    expect(weightVariance('xavier', 64, 64)).toBeCloseTo(2 / 128, 15);
    expect(weightVariance('xavier', 100, 50)).toBeCloseTo(2 / 150, 15);
  });

  it('uses 2 / fanIn for He', () => {
    expect(weightVariance('he', 64, 64)).toBeCloseTo(2 / 64, 15);
    expect(weightVariance('he', 100, 50)).toBeCloseTo(2 / 100, 15);
  });
});

describe('gaussian sampling', () => {
  it('has mean 0 and variance 1 over 20 000 draws', () => {
    const next = createRandomGenerator(11);
    const count = 20_000;
    let sum = 0;
    let squaredSum = 0;
    for (let index = 0; index < count; index += 1) {
      const sample = gaussianSample(next);
      sum += sample;
      squaredSum += sample * sample;
    }
    const mean = sum / count;
    const variance = squaredSum / count - mean * mean;
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(Math.abs(variance - 1)).toBeLessThan(0.05);
  });

  it('replays the same draws for the same seed', () => {
    const first = createRandomGenerator(5);
    const second = createRandomGenerator(5);
    expect(gaussianSample(first)).toBe(gaussianSample(second));
  });
});

describe('activations', () => {
  it('evaluates tanh and its derivative', () => {
    expect(activate('tanh', 0)).toBe(0);
    expect(activate('tanh', 1)).toBeCloseTo(Math.tanh(1), 12);
    expect(activationDerivative('tanh', 0)).toBeCloseTo(1, 12);
    expect(activationDerivative('tanh', 2)).toBeCloseTo(1 - Math.tanh(2) ** 2, 12);
  });

  it('evaluates ReLU and its derivative with a zero slope at zero', () => {
    expect(activate('relu', -3)).toBe(0);
    expect(activate('relu', 2.5)).toBe(2.5);
    expect(activationDerivative('relu', 0)).toBe(0);
    expect(activationDerivative('relu', -1)).toBe(0);
    expect(activationDerivative('relu', 4)).toBe(1);
  });
});

describe('standard deviation', () => {
  it('divides by n, not n - 1', () => {
    expect(standardDeviation([2, 4, 6, 8])).toBeCloseTo(Math.sqrt(5), 12);
  });

  it('is zero for a constant column', () => {
    expect(standardDeviation([3, 3, 3])).toBe(0);
  });
});

describe('batch normalization', () => {
  it('centres and scales a column when epsilon is zero', () => {
    const normalized = batchNormalize([2, 4, 6, 8], 0);
    const expected = [-3, -1, 1, 3].map((value) => value / Math.sqrt(5));
    expected.forEach((value, index) => expect(normalized[index]).toBeCloseTo(value, 12));
  });

  it('produces a zero mean and a variance of sigma squared over sigma squared plus epsilon', () => {
    const epsilon = 0.5;
    const normalized = batchNormalize([2, 4, 6, 8], epsilon);
    const mean = normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
    const variance =
      normalized.reduce((sum, value) => sum + (value - mean) ** 2, 0) / normalized.length;
    expect(mean).toBeCloseTo(0, 12);
    expect(variance).toBeCloseTo(5 / (5 + epsilon), 12);
  });

  it('is invariant under a positive rescaling and a shift when epsilon is zero', () => {
    const column = [0.3, -1.2, 2.7, 0.9, -0.4];
    const transformed = column.map((value) => 7.5 * value + 3);
    const reference = batchNormalize(column, 0);
    const result = batchNormalize(transformed, 0);
    reference.forEach((value, index) =>
      expect(Math.abs(result[index] - value)).toBeLessThan(1e-12),
    );
  });
});

describe('variance lemmas', () => {
  it('gives Var(z) close to n Var(w) E[x^2] for uncentred inputs', () => {
    const inputCount = 64;
    const weightStandardDeviation = Math.sqrt(1 / inputCount);
    const next = createRandomGenerator(21);
    const drawCount = 4_000;
    let squaredSum = 0;
    let inputSquaredSum = 0;
    let inputTotal = 0;
    for (let draw = 0; draw < drawCount; draw += 1) {
      let z = 0;
      for (let index = 0; index < inputCount; index += 1) {
        const input = Math.max(0, gaussianSample(next));
        z += weightStandardDeviation * gaussianSample(next) * input;
        inputSquaredSum += input * input;
        inputTotal += 1;
      }
      squaredSum += z * z;
    }
    const empirical = squaredSum / drawCount;
    const predicted = inputCount * (1 / inputCount) * (inputSquaredSum / inputTotal);
    expect(Math.abs(empirical - predicted) / predicted).toBeLessThan(0.1);
  });

  it('halves the second moment through a ReLU', () => {
    const next = createRandomGenerator(33);
    const count = 40_000;
    let total = 0;
    for (let index = 0; index < count; index += 1) {
      const z = 2 * gaussianSample(next);
      total += activate('relu', z) ** 2;
    }
    expect(Math.abs(total / count - 2) / 2).toBeLessThan(0.05);
  });
});

describe('propagation through depth', () => {
  it('returns one entry per layer, numbered from 1', () => {
    const layers = propagateThroughDepth(experiment('relu', 'he', false));
    expect(layers).toHaveLength(NETWORK_DEPTH);
    expect(layers.map((layer) => layer.layer)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('explodes with ReLU and standard normal weights', () => {
    const values = deviations(experiment('relu', 'standard-normal', false));
    expect(lastOf(values)).toBeGreaterThan(1e5 * values[0]);
  });

  it('vanishes with ReLU and Xavier weights', () => {
    const values = deviations(experiment('relu', 'xavier', false));
    expect(lastOf(values)).toBeLessThan(0.1 * values[0]);
  });

  it('stays stable with ReLU and He weights', () => {
    const values = deviations(experiment('relu', 'he', false));
    const ratio = lastOf(values) / values[0];
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(2);
  });

  it('collapses with tanh and small weights', () => {
    expect(lastOf(deviations(experiment('tanh', 'small', false)))).toBeLessThan(1e-3);
  });

  it('makes batch normalized networks independent of the weight scale', () => {
    const large = deviations(experiment('relu', 'standard-normal', true));
    const small = deviations(experiment('relu', 'small', true));
    large.forEach((value, index) =>
      expect(Math.abs(value - small[index]) / small[index]).toBeLessThan(1e-2),
    );
  });

  it('keeps every batch normalized standard deviation between 0.3 and 1', () => {
    for (const scheme of ['standard-normal', 'small', 'xavier', 'he'] as const) {
      deviations(experiment('relu', scheme, true)).forEach((value) => {
        expect(value).toBeGreaterThan(0.3);
        expect(value).toBeLessThanOrEqual(1);
      });
    }
  });

  it('returns finite and positive gradient norms, batch normalization included', () => {
    for (const isBatchNormalized of [false, true]) {
      for (const layer of propagateThroughDepth(experiment('relu', 'he', isBatchNormalized))) {
        expect(Number.isFinite(layer.weightGradientNorm)).toBe(true);
        expect(layer.weightGradientNorm).toBeGreaterThan(0);
      }
    }
  });

  it('keeps gradient norms within a factor 10 across layers with ReLU and He', () => {
    const norms = propagateThroughDepth(experiment('relu', 'he', false)).map(
      (layer) => layer.weightGradientNorm,
    );
    expect(Math.max(...norms) / Math.min(...norms)).toBeLessThan(10);
  });

  it('is deterministic for a given experiment', () => {
    const first = propagateThroughDepth(experiment('tanh', 'xavier', true));
    const second = propagateThroughDepth(experiment('tanh', 'xavier', true));
    expect(first).toEqual(second);
  });
});

describe('XOR network', () => {
  it('starts twins with equal hidden neurons, independent of the seed', () => {
    const expected: XorNetwork = {
      hiddenWeights: [
        [TWIN_WEIGHT, TWIN_WEIGHT],
        [TWIN_WEIGHT, TWIN_WEIGHT],
      ],
      hiddenBiases: [0, 0],
      outputWeights: [TWIN_WEIGHT, TWIN_WEIGHT],
      outputBias: 0,
    };
    expect(initialXorNetwork('twins', 1)).toEqual(expected);
    expect(initialXorNetwork('twins', 99)).toEqual(expected);
  });

  it('starts random with uniform values in [-1, 1] and a zero output bias', () => {
    const network = initialXorNetwork('random', XOR_SEED);
    const values = [
      ...network.hiddenWeights[0],
      ...network.hiddenWeights[1],
      ...network.hiddenBiases,
      ...network.outputWeights,
    ];
    values.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    });
    expect(network.outputBias).toBe(0);
  });

  it('draws different hidden neurons and replays them for the same seed', () => {
    const network = initialXorNetwork('random', XOR_SEED);
    expect(network.hiddenWeights[0]).not.toEqual(network.hiddenWeights[1]);
    expect(initialXorNetwork('random', XOR_SEED)).toEqual(network);
    expect(initialXorNetwork('random', XOR_SEED + 1)).not.toEqual(network);
  });

  it('measures the twin distance as the Euclidean norm of the neuron difference', () => {
    const network: XorNetwork = {
      hiddenWeights: [
        [1, 2],
        [4, 6],
      ],
      hiddenBiases: [0, 0],
      outputWeights: [0.5, 0.5],
      outputBias: 0,
    };
    expect(twinDistance(network)).toBeCloseTo(5, 12);
    expect(twinDistance({ ...network, hiddenBiases: [1, 3] })).toBeCloseTo(Math.sqrt(29), 12);
    expect(twinDistance(initialXorNetwork('twins', 1))).toBe(0);
  });

  it('predicts one half and loses ln 2 when every parameter is zero', () => {
    expect(xorForward(ZERO_NETWORK, 1, 0)).toBeCloseTo(0.5, 12);
    expect(Math.abs(xorLoss(ZERO_NETWORK) - Math.LN2)).toBeLessThan(1e-12);
  });

  it('leaves the hidden weights at exactly zero after one step from the zero network', () => {
    const next = xorTrainingStep(ZERO_NETWORK, XOR_LEARNING_RATE);
    next.hiddenWeights.flat().forEach((weight) => expect(Math.abs(weight)).toBe(0));
    next.hiddenBiases.forEach((bias) => expect(Math.abs(bias)).toBe(0));
  });

  it('lowers the loss with one small gradient step from a random start', () => {
    const network = initialXorNetwork('random', XOR_SEED);
    expect(xorLoss(xorTrainingStep(network, 0.1))).toBeLessThan(xorLoss(network));
  });
});

describe('XOR snapshots', () => {
  it('records step 0 then one image every XOR_STEPS_PER_SNAPSHOT steps', () => {
    const snapshots = xorSnapshots('random', XOR_SEED);
    expect(snapshots).toHaveLength(XOR_SNAPSHOT_COUNT + 1);
    expect(snapshots.map((snapshot) => snapshot.step)).toEqual(
      Array.from({ length: XOR_SNAPSHOT_COUNT + 1 }, (_, index) => index * XOR_STEPS_PER_SNAPSHOT),
    );
  });

  it('keeps the twins identical on every image and never solves XOR', () => {
    const snapshots = xorSnapshots('twins', XOR_SEED);
    snapshots.forEach((snapshot) => expect(snapshot.twinDistance).toBe(0));
    expect(snapshots[snapshots.length - 1].loss).toBeGreaterThan(0.4);
  });

  it('breaks the symmetry from a random start and solves XOR', () => {
    const snapshots = xorSnapshots('random', XOR_SEED);
    const last = snapshots[snapshots.length - 1];
    expect(last.loss).toBeLessThan(0.05);
    expect(last.predictions.map((prediction) => Math.round(prediction))).toEqual([0, 1, 1, 0]);
    expect(last.twinDistance).toBeGreaterThan(1);
  });

  it('is deterministic for a given start and seed', () => {
    expect(xorSnapshots('random', XOR_SEED)).toEqual(xorSnapshots('random', XOR_SEED));
  });
});
