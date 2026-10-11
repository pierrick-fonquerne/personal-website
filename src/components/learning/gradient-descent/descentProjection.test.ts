import { describe, expect, it } from 'vitest';
import {
  CURVE_PATH,
  PADDING,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  clamp,
  formatNumber,
  lossToY,
  ravineToX,
  ravineToY,
  toPolyline,
  weightToX,
} from './descentProjection';

describe('clamp', () => {
  it('bounds a value on both sides', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-5, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});

describe('formatNumber', () => {
  it('uses a decimal comma in French', () => {
    expect(formatNumber(1.28, 'fr')).toBe('1,28');
  });

  it('uses a decimal point in English', () => {
    expect(formatNumber(1.28, 'en')).toBe('1.28');
  });

  it('never prints negative zero', () => {
    expect(formatNumber(-0.001, 'en')).toBe('0');
  });
});

describe('projection', () => {
  it('maps the weight range onto the horizontal padding box', () => {
    expect(weightToX(-3)).toBe(PADDING);
    expect(weightToX(3)).toBe(VIEW_WIDTH - PADDING);
    expect(weightToX(100)).toBe(VIEW_WIDTH - PADDING);
  });

  it('maps zero loss to the bottom and a large loss to the top', () => {
    expect(lossToY(0)).toBe(VIEW_HEIGHT - PADDING);
    expect(lossToY(1000)).toBe(PADDING);
  });

  it('centers the ravine origin and clamps far points', () => {
    expect(ravineToX(0)).toBe(VIEW_WIDTH / 2);
    expect(ravineToY(0)).toBe(VIEW_HEIGHT / 2);
    expect(ravineToX(1e9)).toBe(ravineToX(50));
  });

  it('builds a polyline and a curve path', () => {
    expect(
      toPolyline([
        { x: 1, y: 2 },
        { x: 3.25, y: 4 },
      ]),
    ).toBe('1.0,2.0 3.3,4.0');
    expect(CURVE_PATH.startsWith('M')).toBe(true);
  });
});
