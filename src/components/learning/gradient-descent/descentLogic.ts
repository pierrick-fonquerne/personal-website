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

export function parabolaLoss(curvature: number, weight: number): number {
  throw new Error('not implemented');
}

export function parabolaStep(curvature: number, learningRate: number, weight: number): number {
  throw new Error('not implemented');
}

export function parabolaTrajectory(
  curvature: number,
  learningRate: number,
  initialWeight: number,
  iterations: number,
): readonly ParabolaPoint[] {
  throw new Error('not implemented');
}

export function classifyRegime(curvature: number, learningRate: number): DescentRegime {
  throw new Error('not implemented');
}

export function ravineLoss(shape: RavineShape, point: Point2D): number {
  throw new Error('not implemented');
}

export function ravineGradient(shape: RavineShape, point: Point2D): Point2D {
  throw new Error('not implemented');
}

export function ravineTrajectory(
  shape: RavineShape,
  learningRate: number,
  start: Point2D,
  iterations: number,
): readonly Point2D[] {
  throw new Error('not implemented');
}
