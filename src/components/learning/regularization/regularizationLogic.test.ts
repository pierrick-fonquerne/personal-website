import { describe, it, expect } from 'vitest';
import {
  CHECKPOINT_COUNT,
  DATASET_SEED,
  MAX_DEGREE,
  MAX_EPOCH,
  PENALTY_LEVELS,
  TRAINING_SAMPLE_COUNT,
  VALIDATION_SAMPLE_COUNT,
  checkpointEpochs,
  classifyFit,
  createDataset,
  createRandomGenerator,
  descentSnapshots,
  errorCurveOverPenalty,
  evaluatePolynomial,
  fitRidge,
  indexOfMinimum,
  legendreFeatures,
  meanSquaredError,
  safeLearningRate,
  solveLeastSquares,
  targetFunction,
} from './regularizationLogic';

describe('random generator', () => {
  it('replays the same sequence for the same seed', () => {
    const first = createRandomGenerator(42);
    const second = createRandomGenerator(42);
    const firstValues = [first(), first(), first()];
    const secondValues = [second(), second(), second()];
    expect(firstValues).toEqual(secondValues);
  });

  it('returns values in [0, 1)', () => {
    const next = createRandomGenerator(3);
    for (let index = 0; index < 1000; index += 1) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('dataset', () => {
  it('uses sin(pi x) as the target', () => {
    expect(targetFunction(0.5)).toBeCloseTo(1, 12);
    expect(targetFunction(-1)).toBeCloseTo(0, 12);
  });

  it('builds 10 equally spaced training points and 100 validation points', () => {
    const dataset = createDataset(DATASET_SEED);
    expect(dataset.trainingSamples).toHaveLength(TRAINING_SAMPLE_COUNT);
    expect(dataset.validationSamples).toHaveLength(VALIDATION_SAMPLE_COUNT);
    expect(dataset.trainingSamples[0]?.x).toBeCloseTo(-1, 12);
    expect(dataset.trainingSamples[9]?.x).toBeCloseTo(1, 12);
    expect(dataset.trainingSamples[1]?.x).toBeCloseTo(-1 + 2 / 9, 12);
  });

  it('is reproducible for a given seed and changes with the seed', () => {
    expect(createDataset(DATASET_SEED)).toEqual(createDataset(DATASET_SEED));
    expect(createDataset(DATASET_SEED)).not.toEqual(createDataset(DATASET_SEED + 1));
  });

  it('adds noise with a variance close to 0.2 squared', () => {
    const { validationSamples } = createDataset(DATASET_SEED);
    const noiseVariance =
      validationSamples.reduce((sum, sample) => sum + (sample.y - targetFunction(sample.x)) ** 2, 0) /
      validationSamples.length;
    expect(noiseVariance).toBeGreaterThan(0.02);
    expect(noiseVariance).toBeLessThan(0.07);
  });
});

describe('legendre features and evaluation', () => {
  it('computes P0 to P3 exactly', () => {
    const features = legendreFeatures(0.5, 3);
    expect(features).toHaveLength(4);
    expect(features[0]).toBeCloseTo(1, 12);
    expect(features[1]).toBeCloseTo(0.5, 12);
    expect(features[2]).toBeCloseTo(-0.125, 12);
    expect(features[3]).toBeCloseTo(-0.4375, 12);
  });

  it('returns only P0 at degree 0', () => {
    expect(legendreFeatures(0.3, 0)).toEqual([1]);
  });

  it('evaluates a polynomial given by its Legendre coefficients', () => {
    expect(evaluatePolynomial([1, 2, 4], 0.5)).toBeCloseTo(1 + 2 * 0.5 + 4 * -0.125, 12);
  });
});

describe('least squares', () => {
  it('solves a square system', () => {
    const solution = solveLeastSquares(
      [
        [2, 1],
        [1, 3],
      ],
      [3, 5],
    );
    expect(solution[0]).toBeCloseTo(0.8, 10);
    expect(solution[1]).toBeCloseTo(1.4, 10);
  });

  it('recovers an exact line from an overdetermined system', () => {
    const solution = solveLeastSquares(
      [
        [1, 0],
        [1, 1],
        [1, 2],
      ],
      [1, 3, 5],
    );
    expect(solution[0]).toBeCloseTo(1, 10);
    expect(solution[1]).toBeCloseTo(2, 10);
  });
});

describe('ridge fit', () => {
  const dataset = createDataset(DATASET_SEED);

  it('interpolates the 10 training points at degree 9 without penalty', () => {
    const coefficients = fitRidge(dataset.trainingSamples, MAX_DEGREE, 0);
    expect(coefficients).toHaveLength(MAX_DEGREE + 1);
    expect(meanSquaredError(coefficients, dataset.trainingSamples)).toBeLessThan(1e-12);
  });

  it('shrinks to the mean of the targets under a huge penalty, the constant term being free', () => {
    const coefficients = fitRidge(dataset.trainingSamples, MAX_DEGREE, 1e8);
    const mean =
      dataset.trainingSamples.reduce((sum, sample) => sum + sample.y, 0) / dataset.trainingSamples.length;
    expect(evaluatePolynomial(coefficients, 0.37)).toBeCloseTo(mean, 4);
    expect(evaluatePolynomial(coefficients, -0.81)).toBeCloseTo(mean, 4);
  });

  it('computes the mean squared error', () => {
    const samples = [
      { x: 0, y: 1 },
      { x: 0.5, y: 3 },
    ];
    expect(meanSquaredError([2], samples)).toBeCloseTo(1, 12);
  });
});

describe('error curve over the penalty', () => {
  const dataset = createDataset(DATASET_SEED);
  const curve = errorCurveOverPenalty(dataset, MAX_DEGREE, PENALTY_LEVELS);

  it('returns one point per penalty level', () => {
    expect(curve).toHaveLength(PENALTY_LEVELS.length);
    expect(curve.map((point) => point.penalty)).toEqual(PENALTY_LEVELS);
  });

  it('has a training error that never decreases when the penalty grows', () => {
    for (let index = 1; index < curve.length; index += 1) {
      const previous = curve[index - 1]?.trainingError ?? 0;
      expect(curve[index]?.trainingError).toBeGreaterThanOrEqual(previous - 1e-12);
    }
  });

  it('has a U-shaped validation error with an interior minimum well below the unpenalized error', () => {
    const validationErrors = curve.map((point) => point.validationError);
    const best = indexOfMinimum(validationErrors);
    expect(best).toBeGreaterThan(0);
    expect(best).toBeLessThan(curve.length - 1);
    expect(validationErrors[0]).toBeGreaterThan(2 * (validationErrors[best] ?? 0));
  });
});

describe('index of minimum', () => {
  it('returns the position of the smallest value, the first one on ties', () => {
    expect(indexOfMinimum([3, 1, 2, 1])).toBe(1);
  });
});

describe('fit diagnosis', () => {
  it('flags underfitting when the training error is high', () => {
    expect(classifyFit(0.33, 0.25)).toBe('underfitting');
  });

  it('flags overfitting when validation is far above training', () => {
    expect(classifyFit(0, 0.3)).toBe('overfitting');
  });

  it('reports a balanced fit otherwise', () => {
    expect(classifyFit(0.05, 0.046)).toBe('balanced');
  });

  it('classifies the degrees 1, 3 and 9 of the default dataset', () => {
    const dataset = createDataset(DATASET_SEED);
    const diagnose = (degree: number): string => {
      const coefficients = fitRidge(dataset.trainingSamples, degree, 0);
      return classifyFit(
        meanSquaredError(coefficients, dataset.trainingSamples),
        meanSquaredError(coefficients, dataset.validationSamples),
      );
    };
    expect(diagnose(1)).toBe('underfitting');
    expect(diagnose(3)).toBe('balanced');
    expect(diagnose(9)).toBe('overfitting');
  });
});

describe('early stopping', () => {
  const dataset = createDataset(DATASET_SEED);
  const epochs = checkpointEpochs(MAX_EPOCH, CHECKPOINT_COUNT);
  const learningRate = safeLearningRate(dataset.trainingSamples, MAX_DEGREE);
  const snapshots = descentSnapshots(dataset, MAX_DEGREE, learningRate, epochs);

  it('spreads checkpoints from 0 to the last epoch on strictly increasing integers', () => {
    expect(epochs[0]).toBe(0);
    expect(epochs[epochs.length - 1]).toBe(MAX_EPOCH);
    expect(epochs.length).toBeGreaterThan(10);
    expect(epochs.length).toBeLessThanOrEqual(CHECKPOINT_COUNT);
    for (let index = 1; index < epochs.length; index += 1) {
      expect(Number.isInteger(epochs[index])).toBe(true);
      expect(epochs[index]).toBeGreaterThan(epochs[index - 1] ?? 0);
    }
  });

  it('uses a positive learning rate', () => {
    expect(learningRate).toBeGreaterThan(0);
  });

  it('returns one snapshot per checkpoint, starting from zero coefficients', () => {
    expect(snapshots).toHaveLength(epochs.length);
    expect(snapshots[0]?.epoch).toBe(0);
    expect(snapshots[0]?.coefficients.every((coefficient) => coefficient === 0)).toBe(true);
  });

  it('never increases the training error with the safe learning rate', () => {
    for (let index = 1; index < snapshots.length; index += 1) {
      const previous = snapshots[index - 1]?.trainingError ?? 0;
      expect(snapshots[index]?.trainingError).toBeLessThanOrEqual(previous + 1e-12);
    }
  });

  it('ends close to interpolation', () => {
    expect(snapshots[snapshots.length - 1]?.trainingError).toBeLessThan(0.01);
  });

  it('reaches its best validation error strictly before the end, then degrades', () => {
    const validationErrors = snapshots.map((snapshot) => snapshot.validationError);
    const best = indexOfMinimum(validationErrors);
    expect(best).toBeGreaterThan(0);
    expect(best).toBeLessThan(snapshots.length - 1);
    expect(validationErrors[validationErrors.length - 1]).toBeGreaterThan((validationErrors[best] ?? 0) + 0.1);
  });
});
