import { DIVERGENCE_LIMIT, clamp } from './descentLogic';

export { clamp };
export type Locale = 'fr' | 'en';

export const VIEW_WIDTH = 300;
export const VIEW_HEIGHT = 240;
export const PADDING = 24;
export const WEIGHT_LIMIT = 3;
export const LOSS_LIMIT = 9;
export const RAVINE_PIXELS_PER_X = 55;
export const RAVINE_PIXELS_PER_Y = 90;
export const CURVE_SAMPLE_COUNT = 60;
export const LEVEL_VALUES: readonly number[] = [0.5, 2, 4, 8, 14];

export function formatNumber(value: number, locale: Locale): string {
  const rounded = Number(value.toFixed(2));
  const text = String(Object.is(rounded, -0) ? 0 : rounded);
  return locale === 'fr' ? text.replace('.', ',') : text;
}

export function weightToX(weight: number): number {
  const ratio = (clamp(weight, -WEIGHT_LIMIT, WEIGHT_LIMIT) + WEIGHT_LIMIT) / (2 * WEIGHT_LIMIT);
  return PADDING + ratio * (VIEW_WIDTH - 2 * PADDING);
}

export function lossToY(loss: number): number {
  const ratio = clamp(loss, 0, LOSS_LIMIT) / LOSS_LIMIT;
  return VIEW_HEIGHT - PADDING - ratio * (VIEW_HEIGHT - 2 * PADDING);
}

export function ravineToX(x: number): number {
  return VIEW_WIDTH / 2 + clamp(x, -DIVERGENCE_LIMIT, DIVERGENCE_LIMIT) * RAVINE_PIXELS_PER_X;
}

export function ravineToY(y: number): number {
  return VIEW_HEIGHT / 2 - clamp(y, -DIVERGENCE_LIMIT, DIVERGENCE_LIMIT) * RAVINE_PIXELS_PER_Y;
}

export function buildCurvePath(): string {
  const segments: string[] = [];
  for (let index = 0; index <= CURVE_SAMPLE_COUNT; index += 1) {
    const weight = -WEIGHT_LIMIT + (index / CURVE_SAMPLE_COUNT) * 2 * WEIGHT_LIMIT;
    const command = index === 0 ? 'M' : 'L';
    segments.push(
      `${command}${weightToX(weight).toFixed(1)},${lossToY(weight * weight).toFixed(1)}`,
    );
  }
  return segments.join(' ');
}

export const CURVE_PATH = buildCurvePath();

export function toPolyline(points: readonly { readonly x: number; readonly y: number }[]): string {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}
