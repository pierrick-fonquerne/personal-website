export interface Sample {
  readonly x: number;
  readonly y: number;
}

export interface Dataset {
  readonly trainingSamples: readonly Sample[];
  readonly validationSamples: readonly Sample[];
}

export interface PenaltyErrorPoint {
  readonly penalty: number;
  readonly trainingError: number;
  readonly validationError: number;
}

export interface DescentSnapshot {
  readonly epoch: number;
  readonly coefficients: readonly number[];
  readonly trainingError: number;
  readonly validationError: number;
}

export type RegularizationMode = 'penalty' | 'early-stopping';
export type FitDiagnosis = 'underfitting' | 'balanced' | 'overfitting';

export const DATASET_SEED = 7;
export const TRAINING_SAMPLE_COUNT = 10;
export const VALIDATION_SAMPLE_COUNT = 100;
export const NOISE_STANDARD_DEVIATION = 0.2;
export const MIN_DEGREE = 1;
export const MAX_DEGREE = 9;
export const PENALTY_LEVELS: readonly number[] = [0, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1, 1, 10];
export const MAX_EPOCH = 10_000;
export const CHECKPOINT_COUNT = 30;
export const UNDERFITTING_THRESHOLD = 0.1;
export const OVERFITTING_GAP = 0.1;

const GAUSSIAN_FLOOR = 1e-12;

export function createRandomGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function targetFunction(x: number): number {
  return Math.sin(Math.PI * x);
}

function gaussianNoise(next: () => number): number {
  const uniform = Math.max(next(), GAUSSIAN_FLOOR);
  const angle = next();
  return NOISE_STANDARD_DEVIATION * Math.sqrt(-2 * Math.log(uniform)) * Math.cos(2 * Math.PI * angle);
}

export function createDataset(seed: number): Dataset {
  const next = createRandomGenerator(seed);
  const trainingSamples: Sample[] = [];
  for (let index = 0; index < TRAINING_SAMPLE_COUNT; index += 1) {
    const x = -1 + (2 * index) / (TRAINING_SAMPLE_COUNT - 1);
    trainingSamples.push({ x, y: targetFunction(x) + gaussianNoise(next) });
  }
  const validationSamples: Sample[] = [];
  for (let index = 0; index < VALIDATION_SAMPLE_COUNT; index += 1) {
    const x = -1 + 2 * next();
    validationSamples.push({ x, y: targetFunction(x) + gaussianNoise(next) });
  }
  return { trainingSamples, validationSamples };
}

export function legendreFeatures(x: number, degree: number): readonly number[] {
  const values: number[] = [1, x];
  for (let order = 1; order < degree; order += 1) {
    values.push(((2 * order + 1) * x * values[order] - order * values[order - 1]) / (order + 1));
  }
  return values.slice(0, degree + 1);
}

export function evaluatePolynomial(coefficients: readonly number[], x: number): number {
  const features = legendreFeatures(x, coefficients.length - 1);
  return features.reduce((sum, feature, index) => sum + feature * coefficients[index], 0);
}

export function solveLeastSquares(
  matrix: readonly (readonly number[])[],
  vector: readonly number[],
): readonly number[] {
  const rowCount = matrix.length;
  const columnCount = matrix[0].length;
  const triangular = matrix.map((row) => row.slice());
  const target = vector.slice();
  for (let column = 0; column < columnCount; column += 1) {
    let norm = 0;
    for (let row = column; row < rowCount; row += 1) norm += triangular[row][column] ** 2;
    norm = Math.sqrt(norm);
    if (norm === 0) continue;
    const alpha = triangular[column][column] > 0 ? -norm : norm;
    const reflector: number[] = [];
    for (let row = 0; row < rowCount; row += 1) {
      reflector.push(row < column ? 0 : triangular[row][column]);
    }
    reflector[column] -= alpha;
    const squaredLength = reflector.reduce((sum, value) => sum + value * value, 0);
    if (squaredLength === 0) continue;
    for (let other = column; other < columnCount; other += 1) {
      let projection = 0;
      for (let row = column; row < rowCount; row += 1) {
        projection += reflector[row] * triangular[row][other];
      }
      for (let row = column; row < rowCount; row += 1) {
        triangular[row][other] -= (2 * projection * reflector[row]) / squaredLength;
      }
    }
    let projection = 0;
    for (let row = column; row < rowCount; row += 1) projection += reflector[row] * target[row];
    for (let row = column; row < rowCount; row += 1) {
      target[row] -= (2 * projection * reflector[row]) / squaredLength;
    }
  }
  const solution: number[] = new Array<number>(columnCount).fill(0);
  for (let row = columnCount - 1; row >= 0; row -= 1) {
    let remainder = target[row];
    for (let column = row + 1; column < columnCount; column += 1) {
      remainder -= triangular[row][column] * solution[column];
    }
    solution[row] = remainder / triangular[row][row];
  }
  return solution;
}

export function fitRidge(
  samples: readonly Sample[],
  degree: number,
  penalty: number,
): readonly number[] {
  const rows = samples.map((sample) => [...legendreFeatures(sample.x, degree)]);
  const targets = samples.map((sample) => sample.y);
  for (let order = 1; order <= degree; order += 1) {
    const row: number[] = new Array<number>(degree + 1).fill(0);
    row[order] = Math.sqrt(penalty * samples.length);
    rows.push(row);
    targets.push(0);
  }
  return solveLeastSquares(rows, targets);
}

export function meanSquaredError(
  coefficients: readonly number[],
  samples: readonly Sample[],
): number {
  const total = samples.reduce(
    (sum, sample) => sum + (evaluatePolynomial(coefficients, sample.x) - sample.y) ** 2,
    0,
  );
  return total / samples.length;
}

export function errorCurveOverPenalty(
  dataset: Dataset,
  degree: number,
  penalties: readonly number[],
): readonly PenaltyErrorPoint[] {
  return penalties.map((penalty) => {
    const coefficients = fitRidge(dataset.trainingSamples, degree, penalty);
    return {
      penalty,
      trainingError: meanSquaredError(coefficients, dataset.trainingSamples),
      validationError: meanSquaredError(coefficients, dataset.validationSamples),
    };
  });
}

export function indexOfMinimum(values: readonly number[]): number {
  let bestIndex = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] < values[bestIndex]) bestIndex = index;
  }
  return bestIndex;
}

export function classifyFit(trainingError: number, validationError: number): FitDiagnosis {
  if (trainingError > UNDERFITTING_THRESHOLD) return 'underfitting';
  if (validationError - trainingError > OVERFITTING_GAP) return 'overfitting';
  return 'balanced';
}

export function safeLearningRate(samples: readonly Sample[], degree: number): number {
  let squaredSum = 0;
  for (const sample of samples) {
    for (const feature of legendreFeatures(sample.x, degree)) squaredSum += feature * feature;
  }
  return 1 / ((2 / samples.length) * squaredSum);
}

export function checkpointEpochs(maxEpoch: number, count: number): readonly number[] {
  const epochs: number[] = [0];
  const steps = count - 1;
  for (let index = 0; index < steps; index += 1) {
    const ratio = steps === 1 ? 1 : index / (steps - 1);
    const epoch = Math.round(maxEpoch ** ratio);
    if (epoch > epochs[epochs.length - 1]) epochs.push(epoch);
  }
  return epochs;
}

export function descentSnapshots(
  dataset: Dataset,
  degree: number,
  learningRate: number,
  epochs: readonly number[],
): readonly DescentSnapshot[] {
  const { trainingSamples, validationSamples } = dataset;
  const sampleCount = trainingSamples.length;
  const features = trainingSamples.map((sample) => legendreFeatures(sample.x, degree));
  const coefficients: number[] = new Array<number>(degree + 1).fill(0);
  const lastEpoch = epochs[epochs.length - 1];
  const wantedEpochs = new Set(epochs);
  const snapshots: DescentSnapshot[] = [];
  const record = (epoch: number): void => {
    snapshots.push({
      epoch,
      coefficients: coefficients.slice(),
      trainingError: meanSquaredError(coefficients, trainingSamples),
      validationError: meanSquaredError(coefficients, validationSamples),
    });
  };
  if (wantedEpochs.has(0)) record(0);
  for (let epoch = 1; epoch <= lastEpoch; epoch += 1) {
    const gradient: number[] = new Array<number>(degree + 1).fill(0);
    trainingSamples.forEach((sample, row) => {
      let residual = -sample.y;
      for (let order = 0; order <= degree; order += 1) {
        residual += features[row][order] * coefficients[order];
      }
      for (let order = 0; order <= degree; order += 1) {
        gradient[order] += ((2 / sampleCount) * residual) * features[row][order];
      }
    });
    for (let order = 0; order <= degree; order += 1) {
      coefficients[order] -= learningRate * gradient[order];
    }
    if (wantedEpochs.has(epoch)) record(epoch);
  }
  return snapshots;
}
