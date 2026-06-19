import { describe, expect, it } from 'vitest';
import { checkBlank, checkBlanks, normalizeAnswer, type CodeBlank } from './blank-checker';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const blankExact: CodeBlank = { id: 'b1', expected: 'println!' };
const blankCaseInsensitive: CodeBlank = { id: 'b2', expected: 'Return', ignoreCase: true };
const blankNoWhitespace: CodeBlank = { id: 'b3', expected: 'let x = 1', ignoreWhitespace: false };
const blankWithAcceptable: CodeBlank = {
  id: 'b4',
  expected: 'Console.WriteLine',
  acceptable: ['System.Console.WriteLine'],
};
const blankStrictCase: CodeBlank = { id: 'b5', expected: 'MyType', ignoreCase: false };

// ---------------------------------------------------------------------------
// normalizeAnswer
// ---------------------------------------------------------------------------

describe('normalizeAnswer', () => {
  it('trims and collapses internal whitespace by default', () => {
    expect(normalizeAnswer('  a  b  ')).toBe('a b');
  });

  it('collapses tabs and newlines to single spaces', () => {
    expect(normalizeAnswer('a\t\tb')).toBe('a b');
  });

  it('returns empty string for a whitespace-only input by default', () => {
    expect(normalizeAnswer('   ')).toBe('');
  });

  it('applies ignoreCase: lowercases the result', () => {
    expect(normalizeAnswer('Hello World', { ignoreCase: true })).toBe('hello world');
  });

  it('with ignoreWhitespace false, preserves internal spaces (only trims not required)', () => {
    // Without ignoreWhitespace, value is returned as-is (no trim, no collapse)
    expect(normalizeAnswer('let x = 1', { ignoreWhitespace: false })).toBe('let x = 1');
  });

  it('with ignoreWhitespace false, internal spaces are NOT collapsed', () => {
    expect(normalizeAnswer('a  b', { ignoreWhitespace: false })).toBe('a  b');
  });

  it('with ignoreWhitespace false AND ignoreCase, only lowercases', () => {
    expect(normalizeAnswer('Hello  World', { ignoreWhitespace: false, ignoreCase: true })).toBe(
      'hello  world',
    );
  });

  it('no-op when both options are false/default for plain string', () => {
    expect(normalizeAnswer('hello', { ignoreCase: false, ignoreWhitespace: false })).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// checkBlank
// ---------------------------------------------------------------------------

describe('checkBlank', () => {
  it('returns empty for undefined answer', () => {
    expect(checkBlank(undefined, blankExact)).toBe('empty');
  });

  it('returns empty for whitespace-only string', () => {
    expect(checkBlank('   ', blankExact)).toBe('empty');
  });

  it('returns empty for empty string', () => {
    expect(checkBlank('', blankExact)).toBe('empty');
  });

  it('returns correct for exact match', () => {
    expect(checkBlank('println!', blankExact)).toBe('correct');
  });

  it('returns correct when answer matches an acceptable alternative', () => {
    expect(checkBlank('System.Console.WriteLine', blankWithAcceptable)).toBe('correct');
  });

  it('returns correct when answer matches the expected of a blank with acceptable', () => {
    expect(checkBlank('Console.WriteLine', blankWithAcceptable)).toBe('correct');
  });

  it('returns correct for case-insensitive match when ignoreCase is true', () => {
    expect(checkBlank('return', blankCaseInsensitive)).toBe('correct');
  });

  it('returns incorrect for case mismatch when ignoreCase is false (default)', () => {
    expect(checkBlank('mytype', blankStrictCase)).toBe('incorrect');
  });

  it('returns correct for spacing difference with ignoreWhitespace default (true)', () => {
    // Default ignoreWhitespace=true: "let  x  =  1" should normalize to "let x = 1"
    const blankWithSpaces: CodeBlank = { id: 'bx', expected: 'let x = 1' };
    expect(checkBlank('let  x  =  1', blankWithSpaces)).toBe('correct');
  });

  it('returns incorrect for spacing difference when ignoreWhitespace is false', () => {
    expect(checkBlank('let  x = 1', blankNoWhitespace)).toBe('incorrect');
  });

  it('returns incorrect for a wrong value', () => {
    expect(checkBlank('wrong_answer', blankExact)).toBe('incorrect');
  });
});

// ---------------------------------------------------------------------------
// checkBlanks
// ---------------------------------------------------------------------------

describe('checkBlanks', () => {
  it('returns correct results for a mix of correct, incorrect, and empty', () => {
    const blanks: readonly CodeBlank[] = [
      { id: 'a', expected: 'foo' },
      { id: 'b', expected: 'bar' },
      { id: 'c', expected: 'baz' },
    ];
    const answers: Record<string, string> = { a: 'foo', b: 'WRONG', c: '' };
    const summary = checkBlanks(answers, blanks);

    expect(summary.results).toHaveLength(3);
    expect(summary.results[0]).toEqual({ id: 'a', status: 'correct' });
    expect(summary.results[1]).toEqual({ id: 'b', status: 'incorrect' });
    expect(summary.results[2]).toEqual({ id: 'c', status: 'empty' });
    expect(summary.correctCount).toBe(1);
    expect(summary.total).toBe(3);
    expect(summary.isComplete).toBe(false);
  });

  it('returns isComplete true only when all blanks are correct', () => {
    const blanks: readonly CodeBlank[] = [
      { id: 'x', expected: 'alpha' },
      { id: 'y', expected: 'beta' },
    ];
    const answers: Record<string, string> = { x: 'alpha', y: 'beta' };
    const summary = checkBlanks(answers, blanks);

    expect(summary.correctCount).toBe(2);
    expect(summary.total).toBe(2);
    expect(summary.isComplete).toBe(true);
  });

  it('returns isComplete false when a blank is missing from answers', () => {
    const blanks: readonly CodeBlank[] = [{ id: 'a', expected: 'foo' }];
    const summary = checkBlanks({}, blanks);

    expect(summary.results[0]).toEqual({ id: 'a', status: 'empty' });
    expect(summary.correctCount).toBe(0);
    expect(summary.isComplete).toBe(false);
  });

  it('returns isComplete false and total 0 for empty blanks array', () => {
    const summary = checkBlanks({}, []);

    expect(summary.results).toHaveLength(0);
    expect(summary.correctCount).toBe(0);
    expect(summary.total).toBe(0);
    expect(summary.isComplete).toBe(false);
  });
});
