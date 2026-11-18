export type Locale = 'fr' | 'en';

export const VIEW_WIDTH = 300;
export const VIEW_HEIGHT = 220;
export const PADDING = 24;
export const LOG_FLOOR = 1e-6;
export const LOG_CEILING = 1e6;

const BAR_FILL_RATIO = 0.7;
const GEOMETRY_TOLERANCE = 1e-9;

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

function localizeDecimalSeparator(text: string, locale: Locale): string {
  return locale === 'fr' ? text.replace('.', ',') : text;
}

export function formatNumber(value: number, locale: Locale, digits = 3): string {
  const rounded = Number(value.toFixed(digits));
  const text = (Object.is(rounded, -0) ? 0 : rounded).toFixed(digits);
  return localizeDecimalSeparator(text, locale);
}

export function formatScientific(value: number, locale: Locale): string {
  if (value === 0 || !Number.isFinite(value))
    return localizeDecimalSeparator(String(value), locale);
  const [mantissa, exponentText] = value.toExponential(1).split('e');
  const superscript = [...String(Number(exponentText))]
    .map((character) => SUPERSCRIPT_CHARACTERS[character] ?? character)
    .join('');
  return `${localizeDecimalSeparator(mantissa, locale)} × 10${superscript}`;
}

export function logToPixelY(value: number): number {
  const top = PADDING;
  const bottom = VIEW_HEIGHT - PADDING;
  if (!(value > LOG_FLOOR)) return bottom;
  const clamped = Math.min(value, LOG_CEILING);
  const ratio =
    (Math.log10(clamped) - Math.log10(LOG_FLOOR)) /
    (Math.log10(LOG_CEILING) - Math.log10(LOG_FLOOR));
  return bottom - ratio * (bottom - top);
}

function slotWidth(depth: number): number {
  return (VIEW_WIDTH - 2 * PADDING) / depth;
}

export function layerToPixelX(layer: number, depth: number): number {
  return PADDING + slotWidth(depth) * (layer - 0.5);
}

export function barRectangle(layer: number, depth: number, value: number): Rectangle {
  const width = slotWidth(depth) * BAR_FILL_RATIO;
  const y = logToPixelY(value);
  return {
    x: layerToPixelX(layer, depth) - width / 2,
    y,
    width,
    height: VIEW_HEIGHT - PADDING - y,
  };
}

export function unitToPixel(point: Point): Point {
  return {
    x: PADDING + point.x * (VIEW_WIDTH - 2 * PADDING),
    y: VIEW_HEIGHT - PADDING - point.y * (VIEW_HEIGHT - 2 * PADDING),
  };
}

function isInsideUnit(value: number): boolean {
  return value >= -GEOMETRY_TOLERANCE && value <= 1 + GEOMETRY_TOLERANCE;
}

export function hiddenLineSegment(
  weights: readonly [number, number],
  bias: number,
): LineSegment | null {
  const [horizontalWeight, verticalWeight] = weights;
  const candidates: Point[] = [];
  if (Math.abs(verticalWeight) > GEOMETRY_TOLERANCE) {
    for (const x of [0, 1]) {
      const y = -(horizontalWeight * x + bias) / verticalWeight + 0;
      if (isInsideUnit(y)) candidates.push({ x, y });
    }
  }
  if (Math.abs(horizontalWeight) > GEOMETRY_TOLERANCE) {
    for (const y of [0, 1]) {
      const x = -(verticalWeight * y + bias) / horizontalWeight + 0;
      if (isInsideUnit(x)) candidates.push({ x, y });
    }
  }
  const distinct: Point[] = [];
  for (const candidate of candidates) {
    const isDuplicate = distinct.some(
      (known) =>
        Math.abs(known.x - candidate.x) < GEOMETRY_TOLERANCE &&
        Math.abs(known.y - candidate.y) < GEOMETRY_TOLERANCE,
    );
    if (!isDuplicate) distinct.push(candidate);
  }
  if (distinct.length < 2) return null;
  return { from: distinct[0], to: distinct[1] };
}
