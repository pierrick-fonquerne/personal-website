import { describe, expect, it } from 'vitest';
import { parseLineRanges, toShikiLanguage } from './highlight';

// ---------------------------------------------------------------------------
// toShikiLanguage
// ---------------------------------------------------------------------------

describe('toShikiLanguage', () => {
  it("maps 'csharp' to 'csharp'", () => {
    expect(toShikiLanguage('csharp')).toBe('csharp');
  });

  it("maps 'rust' to 'rust'", () => {
    expect(toShikiLanguage('rust')).toBe('rust');
  });
});

// ---------------------------------------------------------------------------
// parseLineRanges
// ---------------------------------------------------------------------------

/** Sort a ReadonlySet<number> into an ascending array for deterministic assertions. */
function sorted(set: ReadonlySet<number>): number[] {
  return [...set].sort((a, b) => a - b);
}

describe('parseLineRanges', () => {
  // Edge cases: empty/undefined spec
  it('returns empty set for undefined spec', () => {
    expect(sorted(parseLineRanges(undefined, 10))).toEqual([]);
  });

  it('returns empty set for empty string', () => {
    expect(sorted(parseLineRanges('', 10))).toEqual([]);
  });

  it('returns empty set for whitespace-only string', () => {
    expect(sorted(parseLineRanges('   ', 10))).toEqual([]);
  });

  // Single number
  it('parses a single line number', () => {
    expect(sorted(parseLineRanges('3', 10))).toEqual([3]);
  });

  // Simple range
  it('parses a range a-b', () => {
    expect(sorted(parseLineRanges('2-4', 10))).toEqual([2, 3, 4]);
  });

  // Mixed spec
  it('parses a mixed spec with range and single number', () => {
    expect(sorted(parseLineRanges('2-4,7', 10))).toEqual([2, 3, 4, 7]);
  });

  // Clamping: lower bound
  it('clamps range to 1 when lower bound is 0', () => {
    expect(sorted(parseLineRanges('0-3', 5))).toEqual([1, 2, 3]);
  });

  // Clamping: upper bound
  it('clamps range to totalLines when upper bound exceeds it', () => {
    expect(sorted(parseLineRanges('8-12', 10))).toEqual([8, 9, 10]);
  });

  // Out-of-range single number is ignored
  it('ignores a single number greater than totalLines', () => {
    expect(sorted(parseLineRanges('20', 10))).toEqual([]);
  });

  // a > b: inverted range is ignored
  it('ignores an inverted range (a > b)', () => {
    expect(sorted(parseLineRanges('5-2', 10))).toEqual([]);
  });

  // Invalid tokens mixed with valid ones
  it('ignores non-numeric tokens while keeping valid ones', () => {
    expect(sorted(parseLineRanges('abc, 3, ', 10))).toEqual([3]);
  });

  // Whitespace around tokens and range bounds
  it('trims whitespace around tokens and range bounds', () => {
    expect(sorted(parseLineRanges(' 2 - 4 , 7 ', 10))).toEqual([2, 3, 4, 7]);
  });
});
