import { describe, expect, it } from 'vitest';
import { PIECES, findPiece } from './registry';

describe('registry', () => {
  it('exposes pieces with unique ids', () => {
    const ids = PIECES.map((piece) => piece.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('flow-field');
    expect(ids).toContain('network');
  });

  it('every piece has non empty params with defaults inside their bounds', () => {
    for (const piece of PIECES) {
      expect(piece.params.length).toBeGreaterThan(0);
      for (const param of piece.params) {
        const value = piece.defaults[param.key];
        expect(value).toBeGreaterThanOrEqual(param.min);
        expect(value).toBeLessThanOrEqual(param.max);
      }
    }
  });

  it('finds a piece by id and returns undefined otherwise', () => {
    expect(findPiece('flow-field')?.id).toBe('flow-field');
    expect(findPiece('nope')).toBeUndefined();
  });
});
