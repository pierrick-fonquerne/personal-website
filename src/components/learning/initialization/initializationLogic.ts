export type LabMode = 'symmetry' | 'depth';
export type Activation = 'tanh' | 'relu';
export type InitializationScheme = 'standard-normal' | 'small' | 'xavier' | 'he';
export type SymmetryStart = 'twins' | 'random';

export const NETWORK_DEPTH = 10;
export const NETWORK_WIDTH = 64;
export const BATCH_SIZE = 128;
export const NETWORK_SEED = 7;
export const SMALL_STANDARD_DEVIATION = 0.01;
export const BATCH_NORM_EPSILON = 1e-5;

export const XOR_SEED = 3;
export const XOR_LEARNING_RATE = 2;
export const XOR_STEPS_PER_SNAPSHOT = 20;
export const XOR_SNAPSHOT_COUNT = 50;
export const TWIN_WEIGHT = 0.5;

export interface LayerStatistics {
  readonly layer: number;
  readonly activationStandardDeviation: number;
  readonly weightGradientNorm: number;
}

export interface DepthExperiment {
  readonly activation: Activation;
  readonly scheme: InitializationScheme;
  readonly isBatchNormalized: boolean;
  readonly seed: number;
}

export interface XorNetwork {
  readonly hiddenWeights: readonly [readonly [number, number], readonly [number, number]];
  readonly hiddenBiases: readonly [number, number];
  readonly outputWeights: readonly [number, number];
  readonly outputBias: number;
}

export interface XorSnapshot {
  readonly step: number;
  readonly network: XorNetwork;
  readonly loss: number;
  readonly twinDistance: number;
  readonly predictions: readonly [number, number, number, number];
}

const NOT_IMPLEMENTED = 'not implemented';

export function gaussianSample(_random: () => number): number {
  throw new Error(NOT_IMPLEMENTED);
}

export function weightVariance(
  _scheme: InitializationScheme,
  _fanIn: number,
  _fanOut: number,
): number {
  throw new Error(NOT_IMPLEMENTED);
}

export function activate(_activation: Activation, _z: number): number {
  throw new Error(NOT_IMPLEMENTED);
}

export function activationDerivative(_activation: Activation, _z: number): number {
  throw new Error(NOT_IMPLEMENTED);
}

export function standardDeviation(_values: readonly number[]): number {
  throw new Error(NOT_IMPLEMENTED);
}

export function batchNormalize(_column: readonly number[], _epsilon: number): readonly number[] {
  throw new Error(NOT_IMPLEMENTED);
}

export function propagateThroughDepth(_experiment: DepthExperiment): readonly LayerStatistics[] {
  throw new Error(NOT_IMPLEMENTED);
}

export function initialXorNetwork(_start: SymmetryStart, _seed: number): XorNetwork {
  throw new Error(NOT_IMPLEMENTED);
}

export function xorForward(_network: XorNetwork, _x1: number, _x2: number): number {
  throw new Error(NOT_IMPLEMENTED);
}

export function xorLoss(_network: XorNetwork): number {
  throw new Error(NOT_IMPLEMENTED);
}

export function xorTrainingStep(_network: XorNetwork, _learningRate: number): XorNetwork {
  throw new Error(NOT_IMPLEMENTED);
}

export function twinDistance(_network: XorNetwork): number {
  throw new Error(NOT_IMPLEMENTED);
}

export function xorSnapshots(_start: SymmetryStart, _seed: number): readonly XorSnapshot[] {
  throw new Error(NOT_IMPLEMENTED);
}
