import { describe, expect, it } from 'vitest';
import { diffLines, type DiffLine } from './code-diff';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract just the fields that matter for a concise assertion. */
function lines(result: ReturnType<typeof diffLines>): DiffLine[] {
  return result.lines as DiffLine[];
}

// ---------------------------------------------------------------------------
// identical input - all unchanged
// ---------------------------------------------------------------------------

describe('diffLines - identical before and after', () => {
  it('returns all lines as unchanged with matching line numbers', () => {
    const code = 'let x = 1;\nlet y = 2;\nreturn x + y;';
    const result = diffLines(code, code);

    expect(result.addedCount).toBe(0);
    expect(result.removedCount).toBe(0);
    expect(result.unchangedCount).toBe(3);
    expect(lines(result)).toEqual([
      { type: 'unchanged', text: 'let x = 1;', beforeLineNumber: 1, afterLineNumber: 1 },
      { type: 'unchanged', text: 'let y = 2;', beforeLineNumber: 2, afterLineNumber: 2 },
      { type: 'unchanged', text: 'return x + y;', beforeLineNumber: 3, afterLineNumber: 3 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// single-line replacement in the middle
// ---------------------------------------------------------------------------

describe('diffLines - replacement of one line', () => {
  it('emits removed before added in the change region, surrounding lines unchanged', () => {
    const before = 'line1\nold line\nline3';
    const after = 'line1\nnew line\nline3';
    const result = diffLines(before, after);

    expect(result.addedCount).toBe(1);
    expect(result.removedCount).toBe(1);
    expect(result.unchangedCount).toBe(2);
    expect(lines(result)).toEqual([
      { type: 'unchanged', text: 'line1', beforeLineNumber: 1, afterLineNumber: 1 },
      { type: 'removed', text: 'old line', beforeLineNumber: 2 },
      { type: 'added', text: 'new line', afterLineNumber: 2 },
      { type: 'unchanged', text: 'line3', beforeLineNumber: 3, afterLineNumber: 3 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// pure insertion
// ---------------------------------------------------------------------------

describe('diffLines - pure insertion', () => {
  it('adds one line with correct afterLineNumber, surrounding lines have shifted afterLineNumbers', () => {
    const before = 'line1\nline3';
    const after = 'line1\nline2\nline3';
    const result = diffLines(before, after);

    expect(result.addedCount).toBe(1);
    expect(result.removedCount).toBe(0);
    expect(result.unchangedCount).toBe(2);
    expect(lines(result)).toEqual([
      { type: 'unchanged', text: 'line1', beforeLineNumber: 1, afterLineNumber: 1 },
      { type: 'added', text: 'line2', afterLineNumber: 2 },
      { type: 'unchanged', text: 'line3', beforeLineNumber: 2, afterLineNumber: 3 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// pure deletion
// ---------------------------------------------------------------------------

describe('diffLines - pure deletion', () => {
  it('removes one line with correct beforeLineNumber, no added lines', () => {
    const before = 'line1\nline2\nline3';
    const after = 'line1\nline3';
    const result = diffLines(before, after);

    expect(result.addedCount).toBe(0);
    expect(result.removedCount).toBe(1);
    expect(result.unchangedCount).toBe(2);
    expect(lines(result)).toEqual([
      { type: 'unchanged', text: 'line1', beforeLineNumber: 1, afterLineNumber: 1 },
      { type: 'removed', text: 'line2', beforeLineNumber: 2 },
      { type: 'unchanged', text: 'line3', beforeLineNumber: 3, afterLineNumber: 2 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// empty before
// ---------------------------------------------------------------------------

describe('diffLines - empty before', () => {
  it('returns all after lines as added, no removed, no unchanged', () => {
    const result = diffLines('', 'a\nb');

    expect(result.addedCount).toBe(2);
    expect(result.removedCount).toBe(0);
    expect(result.unchangedCount).toBe(0);
    expect(lines(result)).toEqual([
      { type: 'added', text: 'a', afterLineNumber: 1 },
      { type: 'added', text: 'b', afterLineNumber: 2 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// empty after
// ---------------------------------------------------------------------------

describe('diffLines - empty after', () => {
  it('returns all before lines as removed, no added, no unchanged', () => {
    const result = diffLines('a\nb', '');

    expect(result.addedCount).toBe(0);
    expect(result.removedCount).toBe(2);
    expect(result.unchangedCount).toBe(0);
    expect(lines(result)).toEqual([
      { type: 'removed', text: 'a', beforeLineNumber: 1 },
      { type: 'removed', text: 'b', beforeLineNumber: 2 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// both empty
// ---------------------------------------------------------------------------

describe('diffLines - both empty', () => {
  it('returns empty lines array and all counters at zero', () => {
    const result = diffLines('', '');

    expect(result.addedCount).toBe(0);
    expect(result.removedCount).toBe(0);
    expect(result.unchangedCount).toBe(0);
    expect(lines(result)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// multi-change: coherence of before/after line numbers end-to-end
// ---------------------------------------------------------------------------

describe('diffLines - multiple changes', () => {
  it('tracks before and after line numbers correctly across several change regions', () => {
    // before: 5 lines
    // after:  5 lines
    // change at line 2 (replacement) and line 4 (replacement)
    const before = 'a\nB\nc\nD\ne';
    const after = 'a\nb\nc\nd\ne';
    const result = diffLines(before, after);

    expect(result.addedCount).toBe(2);
    expect(result.removedCount).toBe(2);
    expect(result.unchangedCount).toBe(3);
    expect(lines(result)).toEqual([
      { type: 'unchanged', text: 'a', beforeLineNumber: 1, afterLineNumber: 1 },
      { type: 'removed', text: 'B', beforeLineNumber: 2 },
      { type: 'added', text: 'b', afterLineNumber: 2 },
      { type: 'unchanged', text: 'c', beforeLineNumber: 3, afterLineNumber: 3 },
      { type: 'removed', text: 'D', beforeLineNumber: 4 },
      { type: 'added', text: 'd', afterLineNumber: 4 },
      { type: 'unchanged', text: 'e', beforeLineNumber: 5, afterLineNumber: 5 },
    ]);
  });

  it('handles insertion + deletion in separate regions with correct numbering', () => {
    // before: ['a', 'b', 'c']
    // after:  ['a', 'X', 'b']  => 'c' removed, 'X' inserted between 'a' and 'b'
    const before = 'a\nb\nc';
    const after = 'a\nX\nb';
    const result = diffLines(before, after);

    expect(result.addedCount).toBe(1);
    expect(result.removedCount).toBe(1);
    expect(result.unchangedCount).toBe(2);
    expect(lines(result)).toEqual([
      { type: 'unchanged', text: 'a', beforeLineNumber: 1, afterLineNumber: 1 },
      { type: 'added', text: 'X', afterLineNumber: 2 },
      { type: 'unchanged', text: 'b', beforeLineNumber: 2, afterLineNumber: 3 },
      { type: 'removed', text: 'c', beforeLineNumber: 3 },
    ]);
  });
});
