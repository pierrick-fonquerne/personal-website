export type DescentRegime = 'monotone' | 'one-step' | 'oscillating' | 'cycling' | 'diverging';

export interface ParabolaPoint {
  readonly iteration: number;
  readonly weight: number;
  readonly loss: number;
}

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface RavineShape {
  readonly curvatureX: number;
  readonly curvatureY: number;
}

const EQUALITY_TOLERANCE = 1e-9;

export function parabolaLoss(curvature: number, weight: number): number {
  return curvature * weight * weight;
}

export function parabolaStep(curvature: number, learningRate: number, weight: number): number {
  return (1 - 2 * learningRate * curvature) * weight;
}

export function parabolaTrajectory(
  curvature: number,
  learningRate: number,
  initialWeight: number,
  iterations: number,
): readonly ParabolaPoint[] {
  const points: ParabolaPoint[] = [
    { iteration: 0, weight: initialWeight, loss: parabolaLoss(curvature, initialWeight) },
  ];
  let weight = initialWeight;
  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    weight = parabolaStep(curvature, learningRate, weight);
    points.push({ iteration, weight, loss: parabolaLoss(curvature, weight) });
  }
  return points;
}

export function classifyRegime(curvature: number, learningRate: number): DescentRegime {
  const ratio = 1 - 2 * learningRate * curvature;
  if (Math.abs(ratio) < EQUALITY_TOLERANCE) return 'one-step';
  if (Math.abs(ratio + 1) < EQUALITY_TOLERANCE) return 'cycling';
  if (ratio < -1) return 'diverging';
  if (ratio < 0) return 'oscillating';
  return ratio < 1 ? 'monotone' : 'diverging';
}

export function ravineLoss(shape: RavineShape, point: Point2D): number {
  return shape.curvatureX * point.x * point.x + shape.curvatureY * point.y * point.y;
}

export function ravineGradient(shape: RavineShape, point: Point2D): Point2D {
  return { x: 2 * shape.curvatureX * point.x, y: 2 * shape.curvatureY * point.y };
}

export function ravineTrajectory(
  shape: RavineShape,
  learningRate: number,
  start: Point2D,
  iterations: number,
): readonly Point2D[] {
  const points: Point2D[] = [start];
  let current = start;
  for (let iteration = 1; iteration <= iterations; iteration += 1) {
    const gradient = ravineGradient(shape, current);
    current = { x: current.x - learningRate * gradient.x, y: current.y - learningRate * gradient.y };
    points.push(current);
  }
  return points;
}
