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

const NOT_IMPLEMENTED = 'not implemented';

export function createRandomGenerator(_seed: number): () => number {
  throw new Error(NOT_IMPLEMENTED);
}

export function targetFunction(_x: number): number {
  throw new Error(NOT_IMPLEMENTED);
}

export function createDataset(_seed: number): Dataset {
  throw new Error(NOT_IMPLEMENTED);
}

export function legendreFeatures(_x: number, _degree: number): readonly number[] {
  throw new Error(NOT_IMPLEMENTED);
}

export function evaluatePolynomial(_coefficients: readonly number[], _x: number): number {
  throw new Error(NOT_IMPLEMENTED);
}

export function solveLeastSquares(
  _matrix: readonly (readonly number[])[],
  _vector: readonly number[],
): readonly number[] {
  throw new Error(NOT_IMPLEMENTED);
}

export function fitRidge(
  _samples: readonly Sample[],
  _degree: number,
  _penalty: number,
): readonly number[] {
  throw new Error(NOT_IMPLEMENTED);
}

export function meanSquaredError(
  _coefficients: readonly number[],
  _samples: readonly Sample[],
): number {
  throw new Error(NOT_IMPLEMENTED);
}

export function errorCurveOverPenalty(
  _dataset: Dataset,
  _degree: number,
  _penalties: readonly number[],
): readonly PenaltyErrorPoint[] {
  throw new Error(NOT_IMPLEMENTED);
}

export function indexOfMinimum(_values: readonly number[]): number {
  throw new Error(NOT_IMPLEMENTED);
}

export function classifyFit(_trainingError: number, _validationError: number): FitDiagnosis {
  throw new Error(NOT_IMPLEMENTED);
}

export function safeLearningRate(_samples: readonly Sample[], _degree: number): number {
  throw new Error(NOT_IMPLEMENTED);
}

export function checkpointEpochs(_maxEpoch: number, _count: number): readonly number[] {
  throw new Error(NOT_IMPLEMENTED);
}

export function descentSnapshots(
  _dataset: Dataset,
  _degree: number,
  _learningRate: number,
  _epochs: readonly number[],
): readonly DescentSnapshot[] {
  throw new Error(NOT_IMPLEMENTED);
}
