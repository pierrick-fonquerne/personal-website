import { describe, it, expect } from 'vitest';
import {
  LOG_CEILING,
  LOG_FLOOR,
  PADDING,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  barRectangle,
  formatNumber,
  formatScientific,
  hiddenLineSegment,
  layerToPixelX,
  logToPixelY,
  unitToPixel,
} from './initializationProjection';

const FRAME_BOTTOM = VIEW_HEIGHT - PADDING;

describe('number formatting', () => {
  it('uses a comma in French and a point in English', () => {
    expect(formatNumber(1.5, 'fr', 2)).toBe('1,50');
    expect(formatNumber(1.5, 'en', 2)).toBe('1.50');
  });

  it('keeps three digits by default', () => {
    expect(formatNumber(0.25, 'en')).toBe('0.250');
  });

  it('writes scientific notation with a power of ten', () => {
    const french = formatScientific(2.4e-6, 'fr');
    expect(french).toContain('2,4');
    expect(french).toContain('10');
    expect(formatScientific(2.4e-6, 'en')).toContain('2.4');
  });
});

describe('logarithmic vertical projection', () => {
  it('maps the floor to the bottom and the ceiling to the top of the frame', () => {
    expect(logToPixelY(LOG_FLOOR)).toBeCloseTo(FRAME_BOTTOM, 6);
    expect(logToPixelY(LOG_CEILING)).toBeCloseTo(PADDING, 6);
  });

  it('decreases as the value grows', () => {
    expect(logToPixelY(1e-3)).toBeGreaterThan(logToPixelY(1));
    expect(logToPixelY(1)).toBeGreaterThan(logToPixelY(1e3));
  });

  it('clips values outside the bounds', () => {
    expect(logToPixelY(1e-12)).toBeCloseTo(FRAME_BOTTOM, 6);
    expect(logToPixelY(1e12)).toBeCloseTo(PADDING, 6);
  });

  it('sends zero and negative values to the bottom', () => {
    expect(logToPixelY(0)).toBeCloseTo(FRAME_BOTTOM, 6);
    expect(logToPixelY(-5)).toBeCloseTo(FRAME_BOTTOM, 6);
  });
});

describe('layer projection', () => {
  it('increases with the layer and stays inside the frame', () => {
    const positions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((layer) => layerToPixelX(layer, 10));
    positions.forEach((position, index) => {
      expect(position).toBeGreaterThanOrEqual(PADDING);
      expect(position).toBeLessThanOrEqual(VIEW_WIDTH - PADDING);
      if (index > 0) expect(position).toBeGreaterThan(positions[index - 1]);
    });
  });

  it('builds bars with a non negative height inside the frame', () => {
    for (const value of [0, LOG_FLOOR, 1e-3, 1, 1e3, LOG_CEILING, 1e9]) {
      const bar = barRectangle(5, 10, value);
      expect(bar.height).toBeGreaterThanOrEqual(0);
      expect(bar.width).toBeGreaterThan(0);
      expect(bar.x).toBeGreaterThanOrEqual(PADDING);
      expect(bar.x + bar.width).toBeLessThanOrEqual(VIEW_WIDTH - PADDING);
      expect(bar.y).toBeGreaterThanOrEqual(PADDING);
      expect(bar.y + bar.height).toBeLessThanOrEqual(FRAME_BOTTOM + 1e-9);
    }
  });

  it('makes larger values taller', () => {
    expect(barRectangle(3, 10, 1e3).height).toBeGreaterThan(barRectangle(3, 10, 1e-3).height);
  });
});

describe('unit square projection', () => {
  it('maps the corners of the unit square to the corners of the frame', () => {
    expect(unitToPixel({ x: 0, y: 0 })).toEqual({ x: PADDING, y: FRAME_BOTTOM });
    expect(unitToPixel({ x: 1, y: 1 })).toEqual({ x: VIEW_WIDTH - PADDING, y: PADDING });
  });
});

describe('hidden neuron line', () => {
  it('cuts the unit square along the anti-diagonal', () => {
    const segment = hiddenLineSegment([1, 1], -1);
    expect(segment).not.toBeNull();
    const endpoints = [segment!.from, segment!.to]
      .map((point) => [Math.round(point.x * 1e9) / 1e9, Math.round(point.y * 1e9) / 1e9])
      .sort((left, right) => left[0] - right[0]);
    expect(endpoints).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  it('cuts the unit square along a vertical line', () => {
    const segment = hiddenLineSegment([1, 0], -0.5);
    expect(segment).not.toBeNull();
    const ordinates = [segment!.from.y, segment!.to.y].sort((left, right) => left - right);
    expect(segment!.from.x).toBeCloseTo(0.5, 12);
    expect(segment!.to.x).toBeCloseTo(0.5, 12);
    expect(ordinates[0]).toBeCloseTo(0, 12);
    expect(ordinates[1]).toBeCloseTo(1, 12);
  });

  it('returns null when the line misses the square', () => {
    expect(hiddenLineSegment([1, 1], 5)).toBeNull();
  });

  it('returns null when both weights are zero', () => {
    expect(hiddenLineSegment([0, 0], 1)).toBeNull();
  });
});
