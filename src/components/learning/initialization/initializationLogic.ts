import { createRandomGenerator } from '../regularization/regularizationLogic';

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

type Matrix = number[][];

const XOR_INPUTS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];
const XOR_TARGETS: readonly [number, number, number, number] = [0, 1, 1, 0];
const PROBABILITY_FLOOR = 1e-12;

/** Draws one standard normal value with the Box-Muller transform. */
export function gaussianSample(random: () => number): number {
  let radial = random();
  while (radial === 0) radial = random();
  const angular = random();
  return Math.sqrt(-2 * Math.log(radial)) * Math.cos(2 * Math.PI * angular);
}

export function weightVariance(
  scheme: InitializationScheme,
  fanIn: number,
  fanOut: number,
): number {
  switch (scheme) {
    case 'standard-normal':
      return 1;
    case 'small':
      return SMALL_STANDARD_DEVIATION ** 2;
    case 'xavier':
      return 2 / (fanIn + fanOut);
    case 'he':
      return 2 / fanIn;
  }
}

export function activate(activation: Activation, z: number): number {
  return activation === 'tanh' ? Math.tanh(z) : Math.max(0, z);
}

export function activationDerivative(activation: Activation, z: number): number {
  if (activation === 'tanh') return 1 - Math.tanh(z) ** 2;
  return z > 0 ? 1 : 0;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function populationVariance(values: readonly number[]): number {
  const center = mean(values);
  return values.reduce((sum, value) => sum + (value - center) ** 2, 0) / values.length;
}

/** Population standard deviation: divides by n, as batch normalization does. */
export function standardDeviation(values: readonly number[]): number {
  return Math.sqrt(populationVariance(values));
}

/** Centres a column and divides it by sqrt(variance + epsilon), with gamma 1 and beta 0. */
export function batchNormalize(column: readonly number[], epsilon: number): readonly number[] {
  const center = mean(column);
  const scale = Math.sqrt(populationVariance(column) + epsilon);
  return column.map((value) => (value - center) / scale);
}

function columnOf(matrix: Matrix, columnIndex: number): number[] {
  return matrix.map((row) => row[columnIndex]);
}

function drawMatrix(
  rowCount: number,
  columnCount: number,
  random: () => number,
  scale: number,
): Matrix {
  return Array.from({ length: rowCount }, () =>
    Array.from({ length: columnCount }, () => gaussianSample(random) * scale),
  );
}

/** Computes Z = H . W^T, where each row of W holds the incoming weights of one neuron. */
function multiplyByTransposed(hidden: Matrix, weights: Matrix): Matrix {
  return hidden.map((row) =>
    weights.map((weightRow) =>
      weightRow.reduce((sum, weight, index) => sum + weight * row[index], 0),
    ),
  );
}

/** Applies batch normalization to every neuron, one column of the batch at a time. */
function normalizeColumns(preActivation: Matrix): Matrix {
  const normalizedColumns = Array.from({ length: NETWORK_WIDTH }, (_, neuron) =>
    batchNormalize(columnOf(preActivation, neuron), BATCH_NORM_EPSILON),
  );
  return preActivation.map((_, sample) => normalizedColumns.map((column) => column[sample]));
}

/** Backpropagates through batch normalization, one neuron column at a time. */
function backpropagateNormalization(
  preActivation: Matrix,
  normalized: Matrix,
  normalizedGradient: Matrix,
): Matrix {
  const result: Matrix = preActivation.map(() => new Array<number>(NETWORK_WIDTH).fill(0));
  for (let neuron = 0; neuron < NETWORK_WIDTH; neuron += 1) {
    const scale = Math.sqrt(
      populationVariance(columnOf(preActivation, neuron)) + BATCH_NORM_EPSILON,
    );
    let gradientSum = 0;
    let gradientProductSum = 0;
    for (let sample = 0; sample < BATCH_SIZE; sample += 1) {
      gradientSum += normalizedGradient[sample][neuron];
      gradientProductSum += normalizedGradient[sample][neuron] * normalized[sample][neuron];
    }
    for (let sample = 0; sample < BATCH_SIZE; sample += 1) {
      result[sample][neuron] =
        (BATCH_SIZE * normalizedGradient[sample][neuron] -
          gradientSum -
          normalized[sample][neuron] * gradientProductSum) /
        (BATCH_SIZE * scale);
    }
  }
  return result;
}

function frobeniusNorm(matrix: Matrix): number {
  return Math.sqrt(
    matrix.reduce((total, row) => total + row.reduce((sum, value) => sum + value * value, 0), 0),
  );
}

interface LayerCache {
  readonly input: Matrix;
  readonly weights: Matrix;
  readonly preActivation: Matrix;
  readonly activationInput: Matrix;
  readonly activationStandardDeviation: number;
}

/**
 * Runs one forward and one backward pass through ten linear layers, without bias, and reports
 * the spread of the activations and the weight gradient norm of every layer.
 */
export function propagateThroughDepth(experiment: DepthExperiment): readonly LayerStatistics[] {
  const { activation, scheme, isBatchNormalized, seed } = experiment;
  const random = createRandomGenerator(seed);
  const scale = Math.sqrt(weightVariance(scheme, NETWORK_WIDTH, NETWORK_WIDTH));

  let hidden = drawMatrix(BATCH_SIZE, NETWORK_WIDTH, random, 1);
  const caches: LayerCache[] = [];
  for (let layer = 0; layer < NETWORK_DEPTH; layer += 1) {
    const weights = drawMatrix(NETWORK_WIDTH, NETWORK_WIDTH, random, scale);
    const preActivation = multiplyByTransposed(hidden, weights);
    const activationInput = isBatchNormalized ? normalizeColumns(preActivation) : preActivation;
    const output = activationInput.map((row) => row.map((z) => activate(activation, z)));
    caches.push({
      input: hidden,
      weights,
      preActivation,
      activationInput,
      activationStandardDeviation: standardDeviation(output.flat()),
    });
    hidden = output;
  }

  let gradient = drawMatrix(BATCH_SIZE, NETWORK_WIDTH, random, 1);
  const norms: number[] = new Array<number>(NETWORK_DEPTH).fill(0);
  for (let layer = NETWORK_DEPTH - 1; layer >= 0; layer -= 1) {
    const cache = caches[layer];
    const activationGradient = gradient.map((row, sample) =>
      row.map(
        (value, neuron) =>
          value * activationDerivative(activation, cache.activationInput[sample][neuron]),
      ),
    );
    const preActivationGradient = isBatchNormalized
      ? backpropagateNormalization(cache.preActivation, cache.activationInput, activationGradient)
      : activationGradient;
    const weightGradient: Matrix = Array.from({ length: NETWORK_WIDTH }, (_, neuron) =>
      Array.from({ length: NETWORK_WIDTH }, (_, source) => {
        let sum = 0;
        for (let sample = 0; sample < BATCH_SIZE; sample += 1) {
          sum += preActivationGradient[sample][neuron] * cache.input[sample][source];
        }
        return sum / BATCH_SIZE;
      }),
    );
    norms[layer] = frobeniusNorm(weightGradient);
    gradient = preActivationGradient.map((row) =>
      Array.from({ length: NETWORK_WIDTH }, (_, source) =>
        row.reduce((sum, value, neuron) => sum + value * cache.weights[neuron][source], 0),
      ),
    );
  }

  return caches.map((cache, index) => ({
    layer: index + 1,
    activationStandardDeviation: cache.activationStandardDeviation,
    weightGradientNorm: norms[index],
  }));
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export function initialXorNetwork(start: SymmetryStart, seed: number): XorNetwork {
  if (start === 'twins') {
    return {
      hiddenWeights: [
        [TWIN_WEIGHT, TWIN_WEIGHT],
        [TWIN_WEIGHT, TWIN_WEIGHT],
      ],
      hiddenBiases: [0, 0],
      outputWeights: [TWIN_WEIGHT, TWIN_WEIGHT],
      outputBias: 0,
    };
  }
  const random = createRandomGenerator(seed);
  const draw = (): number => 2 * random() - 1;
  const firstWeights: [number, number] = [draw(), draw()];
  const secondWeights: [number, number] = [draw(), draw()];
  const firstBias = draw();
  const secondBias = draw();
  const firstOutput = draw();
  const secondOutput = draw();
  return {
    hiddenWeights: [firstWeights, secondWeights],
    hiddenBiases: [firstBias, secondBias],
    outputWeights: [firstOutput, secondOutput],
    outputBias: 0,
  };
}

function hiddenActivations(network: XorNetwork, x1: number, x2: number): [number, number] {
  const [first, second] = network.hiddenWeights;
  return [
    sigmoid(first[0] * x1 + first[1] * x2 + network.hiddenBiases[0]),
    sigmoid(second[0] * x1 + second[1] * x2 + network.hiddenBiases[1]),
  ];
}

export function xorForward(network: XorNetwork, x1: number, x2: number): number {
  const [first, second] = hiddenActivations(network, x1, x2);
  return sigmoid(
    network.outputWeights[0] * first + network.outputWeights[1] * second + network.outputBias,
  );
}

/** Mean cross-entropy over the four XOR points. */
export function xorLoss(network: XorNetwork): number {
  let total = 0;
  XOR_INPUTS.forEach(([x1, x2], index) => {
    const prediction = Math.min(
      1 - PROBABILITY_FLOOR,
      Math.max(PROBABILITY_FLOOR, xorForward(network, x1, x2)),
    );
    const target = XOR_TARGETS[index];
    total -= target * Math.log(prediction) + (1 - target) * Math.log(1 - prediction);
  });
  return total / XOR_INPUTS.length;
}

/** One full-batch gradient descent step; the output error of a sigmoid with cross-entropy is o - y. */
export function xorTrainingStep(network: XorNetwork, learningRate: number): XorNetwork {
  const hiddenWeightGradient = [
    [0, 0],
    [0, 0],
  ];
  const hiddenBiasGradient = [0, 0];
  const outputWeightGradient = [0, 0];
  let outputBiasGradient = 0;

  XOR_INPUTS.forEach(([x1, x2], index) => {
    const hidden = hiddenActivations(network, x1, x2);
    const outputError = xorForward(network, x1, x2) - XOR_TARGETS[index];
    outputBiasGradient += outputError;
    for (let neuron = 0; neuron < 2; neuron += 1) {
      outputWeightGradient[neuron] += outputError * hidden[neuron];
      const hiddenError =
        outputError * network.outputWeights[neuron] * hidden[neuron] * (1 - hidden[neuron]);
      hiddenBiasGradient[neuron] += hiddenError;
      hiddenWeightGradient[neuron][0] += hiddenError * x1;
      hiddenWeightGradient[neuron][1] += hiddenError * x2;
    }
  });

  const update = (value: number, gradientSum: number): number =>
    value - (learningRate * gradientSum) / XOR_INPUTS.length;
  return {
    hiddenWeights: [
      [
        update(network.hiddenWeights[0][0], hiddenWeightGradient[0][0]),
        update(network.hiddenWeights[0][1], hiddenWeightGradient[0][1]),
      ],
      [
        update(network.hiddenWeights[1][0], hiddenWeightGradient[1][0]),
        update(network.hiddenWeights[1][1], hiddenWeightGradient[1][1]),
      ],
    ],
    hiddenBiases: [
      update(network.hiddenBiases[0], hiddenBiasGradient[0]),
      update(network.hiddenBiases[1], hiddenBiasGradient[1]),
    ],
    outputWeights: [
      update(network.outputWeights[0], outputWeightGradient[0]),
      update(network.outputWeights[1], outputWeightGradient[1]),
    ],
    outputBias: update(network.outputBias, outputBiasGradient),
  };
}

/** Euclidean distance between the two hidden neurons, weights and biases together. */
export function twinDistance(network: XorNetwork): number {
  const [first, second] = network.hiddenWeights;
  return Math.sqrt(
    (first[0] - second[0]) ** 2 +
      (first[1] - second[1]) ** 2 +
      (network.hiddenBiases[0] - network.hiddenBiases[1]) ** 2,
  );
}

function snapshotOf(network: XorNetwork, step: number): XorSnapshot {
  return {
    step,
    network,
    loss: xorLoss(network),
    twinDistance: twinDistance(network),
    predictions: [
      xorForward(network, 0, 0),
      xorForward(network, 0, 1),
      xorForward(network, 1, 0),
      xorForward(network, 1, 1),
    ],
  };
}

export function xorSnapshots(start: SymmetryStart, seed: number): readonly XorSnapshot[] {
  let network = initialXorNetwork(start, seed);
  const snapshots: XorSnapshot[] = [snapshotOf(network, 0)];
  for (let image = 1; image <= XOR_SNAPSHOT_COUNT; image += 1) {
    for (let step = 0; step < XOR_STEPS_PER_SNAPSHOT; step += 1) {
      network = xorTrainingStep(network, XOR_LEARNING_RATE);
    }
    snapshots.push(snapshotOf(network, image * XOR_STEPS_PER_SNAPSHOT));
  }
  return snapshots;
}
