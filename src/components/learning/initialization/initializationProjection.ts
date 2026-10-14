export type Locale = 'fr' | 'en';

export const VIEW_WIDTH = 300;
export const VIEW_HEIGHT = 220;
export const PADDING = 24;
export const LOG_FLOOR = 1e-6;
export const LOG_CEILING = 1e6;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface LineSegment {
  readonly from: Point;
  readonly to: Point;
}

const NOT_IMPLEMENTED = 'not implemented';

export function formatNumber(_value: number, _locale: Locale, _digits = 3): string {
  throw new Error(NOT_IMPLEMENTED);
}

export function formatScientific(_value: number, _locale: Locale): string {
  throw new Error(NOT_IMPLEMENTED);
}

export function logToPixelY(_value: number): number {
  throw new Error(NOT_IMPLEMENTED);
}

export function layerToPixelX(_layer: number, _depth: number): number {
  throw new Error(NOT_IMPLEMENTED);
}

export function barRectangle(_layer: number, _depth: number, _value: number): Rectangle {
  throw new Error(NOT_IMPLEMENTED);
}

export function unitToPixel(_point: Point): Point {
  throw new Error(NOT_IMPLEMENTED);
}

export function hiddenLineSegment(
  _weights: readonly [number, number],
  _bias: number,
): LineSegment | null {
  throw new Error(NOT_IMPLEMENTED);
}
