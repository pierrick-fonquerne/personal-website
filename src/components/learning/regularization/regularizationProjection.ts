import { evaluatePolynomial, targetFunction } from './regularizationLogic';

export type Locale = 'fr' | 'en';

export const VIEW_WIDTH = 300;
export const VIEW_HEIGHT = 220;
export const PADDING = 24;
export const Y_LIMIT = 2;
export const CURVE_SAMPLE_COUNT = 120;
export const ERROR_FLOOR = 1e-4;
export const ERROR_CEILING = 10;

const SUPERSCRIPT_CHARACTERS: Readonly<Record<string, string>> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

export function formatNumber(value: number, locale: Locale, digits = 3): string {
  const rounded = Number(value.toFixed(digits));
  const text = (Object.is(rounded, -0) ? 0 : rounded).toFixed(digits);
  return locale === 'fr' ? text.replace('.', ',') : text;
}

export function formatPenalty(penalty: number): string {
  if (penalty === 0) return '0';
  const exponent = penaltyExponent(penalty);
  if (exponent === 0) return '1';
  if (exponent === 1) return '10';
  const superscript = [...String(exponent)]
    .map((character) => SUPERSCRIPT_CHARACTERS[character] ?? character)
    .join('');
  return `10${superscript}`;
}

export function roundCoordinate(value: number): number {
  return Math.round(value * 10) / 10;
}

export function penaltyExponent(penalty: number): number {
  return Math.round(Math.log10(penalty));
}

export function xToPixel(x: number): number {
  const clamped = Math.min(1, Math.max(-1, x));
  return roundCoordinate(PADDING + ((clamped + 1) / 2) * (VIEW_WIDTH - 2 * PADDING));
}

export function yToPixel(y: number): number {
  const clamped = Math.min(Y_LIMIT, Math.max(-Y_LIMIT, y));
  return roundCoordinate(
    VIEW_HEIGHT - PADDING - ((clamped + Y_LIMIT) / (2 * Y_LIMIT)) * (VIEW_HEIGHT - 2 * PADDING),
  );
}

function buildCurvePath(evaluate: (x: number) => number): string {
  const segments: string[] = [];
  let isPenDown = false;
  for (let index = 0; index <= CURVE_SAMPLE_COUNT; index += 1) {
    const x = -1 + (2 * index) / CURVE_SAMPLE_COUNT;
    const y = evaluate(x);
    if (!Number.isFinite(y) || Math.abs(y) > Y_LIMIT) {
      isPenDown = false;
      continue;
    }
    segments.push(`${isPenDown ? 'L' : 'M'}${xToPixel(x)},${yToPixel(y)}`);
    isPenDown = true;
  }
  return segments.join(' ');
}

export function buildFitPath(coefficients: readonly number[]): string {
  return buildCurvePath((x) => evaluatePolynomial(coefficients, x));
}

export function buildTargetPath(): string {
  return buildCurvePath(targetFunction);
}

export function errorToPixelX(index: number, count: number): number {
  const ratio = count <= 1 ? 0 : index / (count - 1);
  return roundCoordinate(PADDING + ratio * (VIEW_WIDTH - 2 * PADDING));
}

export function errorToPixelY(error: number): number {
  const clamped = Math.min(ERROR_CEILING, Math.max(ERROR_FLOOR, error));
  const ratio =
    (Math.log10(clamped) - Math.log10(ERROR_FLOOR)) /
    (Math.log10(ERROR_CEILING) - Math.log10(ERROR_FLOOR));
  return roundCoordinate(VIEW_HEIGHT - PADDING - ratio * (VIEW_HEIGHT - 2 * PADDING));
}

export function buildErrorPath(errors: readonly number[]): string {
  return errors
    .map((error, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command}${errorToPixelX(index, errors.length)},${errorToPixelY(error)}`;
    })
    .join(' ');
}
