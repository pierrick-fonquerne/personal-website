/**
 * Perceptron learning algorithm primitives shared by the chapter 04 interactive components.
 *
 * Uses the encoding y ∈ {-1, +1} and the convention sign(0) = +1.
 * The learning rule applied on a misclassified sample (x, y) is:
 *   w ← w + η · y · x
 *   b ← b + η · y
 *
 * All functions are pure and side-effect free, suitable for unit testing.
 */

export type Vector2 = readonly [number, number];

export interface Sample {
  readonly x: Vector2;
  readonly y: -1 | 1;
}

export interface UpdateResult {
  readonly newW: Vector2;
  readonly newB: number;
  readonly deltaW: Vector2;
  readonly deltaB: number;
}

export interface ConvergenceResult {
  readonly w: Vector2;
  readonly b: number;
  readonly steps: number;
  readonly errorHistory: readonly number[];
  readonly converged: boolean;
}

export interface MarginInfo {
  readonly geometric: number;
  readonly functional: number;
}

export interface NovikoffMetrics {
  readonly R: number;
  readonly gamma: number;
  readonly bound: number;
}

const EPSILON = 1e-9;

/**
 * Compute the perceptron prediction sign(w · x + b).
 * Uses the convention sign(0) = +1.
 */
export function predict(sample: Sample, w: Vector2, b: number): -1 | 1 {
  const z = w[0] * sample.x[0] + w[1] * sample.x[1] + b;
  return z >= 0 ? 1 : -1;
}

/**
 * Apply a single perceptron learning step on the given misclassified sample.
 * Returns the new weights, new bias, and the deltas applied.
 */
export function applyUpdate(
  sample: Sample,
  w: Vector2,
  b: number,
  learningRate: number,
): UpdateResult {
  const deltaW: Vector2 = [
    learningRate * sample.y * sample.x[0],
    learningRate * sample.y * sample.x[1],
  ];
  const deltaB = learningRate * sample.y;
  return {
    newW: [w[0] + deltaW[0], w[1] + deltaW[1]],
    newB: b + deltaB,
    deltaW,
    deltaB,
  };
}

/**
 * Find the first misclassified sample in dataset order, or null if none.
 */
export function findNextMistake(
  dataset: readonly Sample[],
  w: Vector2,
  b: number,
): { sample: Sample; idx: number } | null {
  for (let i = 0; i < dataset.length; i++) {
    const sample = dataset[i];
    if (predict(sample, w, b) !== sample.y) {
      return { sample, idx: i };
    }
  }
  return null;
}

/**
 * Run the perceptron until convergence on the dataset, or until maxEpochs is hit.
 * Returns the final weights, bias, total number of corrections, per-epoch error counts,
 * and whether convergence was reached.
 */
export function runPerceptronToConvergence(
  dataset: readonly Sample[],
  options?: { maxEpochs?: number; learningRate?: number; initialW?: Vector2; initialB?: number },
): ConvergenceResult {
  const maxEpochs = options?.maxEpochs ?? 200;
  const lr = options?.learningRate ?? 1;
  let w: Vector2 = options?.initialW ?? [0, 0];
  let b = options?.initialB ?? 0;
  let steps = 0;
  const errorHistory: number[] = [];

  for (let epoch = 0; epoch < maxEpochs; epoch++) {
    let errorsThisEpoch = 0;
    for (const sample of dataset) {
      if (predict(sample, w, b) !== sample.y) {
        const update = applyUpdate(sample, w, b, lr);
        w = update.newW;
        b = update.newB;
        steps++;
        errorsThisEpoch++;
      }
    }
    errorHistory.push(errorsThisEpoch);
    if (errorsThisEpoch === 0) {
      return { w, b, steps, errorHistory, converged: true };
    }
  }
  return { w, b, steps, errorHistory, converged: false };
}

/**
 * Compute R = max ||x_i|| over the dataset (Euclidean norm).
 */
export function computeR(dataset: readonly Sample[]): number {
  let maxNorm = 0;
  for (const sample of dataset) {
    const norm = Math.sqrt(sample.x[0] * sample.x[0] + sample.x[1] * sample.x[1]);
    if (norm > maxNorm) maxNorm = norm;
  }
  return maxNorm;
}

/**
 * Compute the functional and geometric margin of dataset under the classifier (w, b).
 * Geometric margin: γ = min_i y_i (w · x_i + b) / ||w||.
 * Returns zero margins if ||w|| is degenerate.
 */
export function computeMargin(dataset: readonly Sample[], w: Vector2, b: number): MarginInfo {
  const normW = Math.sqrt(w[0] * w[0] + w[1] * w[1]);
  if (normW < EPSILON || dataset.length === 0) {
    return { functional: 0, geometric: 0 };
  }
  let minFunctional = Infinity;
  for (const sample of dataset) {
    const functional = sample.y * (w[0] * sample.x[0] + w[1] * sample.x[1] + b);
    if (functional < minFunctional) minFunctional = functional;
  }
  return {
    functional: minFunctional,
    geometric: minFunctional / normW,
  };
}

/**
 * Compute the Novikoff metrics for a dataset assuming it is linearly separable
 * by the supplied separating direction (w, b). Returns R, γ (geometric margin)
 * and the bound (R / γ)². The bound is Infinity if γ ≤ 0.
 */
export function computeNovikoffMetrics(
  dataset: readonly Sample[],
  w: Vector2,
  b: number,
): NovikoffMetrics {
  const R = computeR(dataset);
  const { geometric } = computeMargin(dataset, w, b);
  const gamma = geometric;
  const bound = gamma > EPSILON ? (R * R) / (gamma * gamma) : Infinity;
  return { R, gamma, bound };
}

/**
 * Convenience constant: the four canonical 2D logic gate datasets, encoded with y ∈ {-1, +1}.
 */
export const LOGIC_GATE_DATASETS: Record<'AND' | 'OR' | 'NAND' | 'XOR', readonly Sample[]> = {
  AND: [
    { x: [0, 0], y: -1 },
    { x: [0, 1], y: -1 },
    { x: [1, 0], y: -1 },
    { x: [1, 1], y: 1 },
  ],
  OR: [
    { x: [0, 0], y: -1 },
    { x: [0, 1], y: 1 },
    { x: [1, 0], y: 1 },
    { x: [1, 1], y: 1 },
  ],
  NAND: [
    { x: [0, 0], y: 1 },
    { x: [0, 1], y: 1 },
    { x: [1, 0], y: 1 },
    { x: [1, 1], y: -1 },
  ],
  XOR: [
    { x: [0, 0], y: -1 },
    { x: [0, 1], y: 1 },
    { x: [1, 0], y: 1 },
    { x: [1, 1], y: -1 },
  ],
};
