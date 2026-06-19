/**
 * Pure engine for fill-in-the-blank code exercise checking.
 * No UI, no DOM dependencies - plain TypeScript functions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A blank to fill in a code snippet. `expected` and `acceptable` are CODE values (never translated). */
export interface CodeBlank {
  readonly id: string;
  readonly expected: string;
  readonly acceptable?: readonly string[];
  /** Case-insensitive comparison. Default: false. */
  readonly ignoreCase?: boolean;
  /** Whitespace-insensitive comparison: trim + collapse internal whitespace runs to one space. Default: true. */
  readonly ignoreWhitespace?: boolean;
}

export type BlankStatus = 'empty' | 'correct' | 'incorrect';

export interface BlankResult {
  readonly id: string;
  readonly status: BlankStatus;
}

export interface BlankCheckSummary {
  readonly results: readonly BlankResult[];
  readonly correctCount: number;
  readonly total: number;
  /** True only when all blanks are correct and total > 0. */
  readonly isComplete: boolean;
}

// ---------------------------------------------------------------------------
// Normalization options
// ---------------------------------------------------------------------------

interface NormalizeOptions {
  readonly ignoreCase?: boolean;
  readonly ignoreWhitespace?: boolean;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Normalize a string according to the given options.
 *
 * Defaults: ignoreWhitespace = true, ignoreCase = false.
 * When ignoreWhitespace is true: trim the value, then collapse every run of
 * whitespace characters (spaces, tabs, newlines) to a single space.
 * When ignoreCase is true: convert to lowercase (applied after whitespace normalization).
 */
export function normalizeAnswer(value: string, options?: NormalizeOptions): string {
  const shouldIgnoreWhitespace = options?.ignoreWhitespace !== false;
  const shouldIgnoreCase = options?.ignoreCase === true;

  let result = value;

  if (shouldIgnoreWhitespace) {
    result = result.trim().replace(/\s+/g, ' ');
  }

  if (shouldIgnoreCase) {
    result = result.toLowerCase();
  }

  return result;
}

/**
 * Check whether a single answer matches the given blank's expected value or any acceptable alternative.
 *
 * Returns:
 * - 'empty'     when answer is undefined or normalizes to the empty string.
 * - 'correct'   when the normalized answer equals at least one normalized candidate.
 * - 'incorrect' otherwise.
 */
export function checkBlank(answer: string | undefined, blank: CodeBlank): BlankStatus {
  const opts: NormalizeOptions = {
    ignoreCase: blank.ignoreCase,
    ignoreWhitespace: blank.ignoreWhitespace,
  };

  if (answer === undefined) {
    return 'empty';
  }

  const normalizedAnswer = normalizeAnswer(answer, opts);

  if (normalizedAnswer === '') {
    return 'empty';
  }

  const candidates = [blank.expected, ...(blank.acceptable ?? [])];
  const isMatch = candidates.some(
    (candidate) => normalizedAnswer === normalizeAnswer(candidate, opts),
  );

  return isMatch ? 'correct' : 'incorrect';
}

/**
 * Check all blanks against the provided answer map.
 *
 * For each blank, looks up answers[blank.id] and delegates to checkBlank.
 * A missing key in answers is treated as undefined (which gives 'empty').
 */
export function checkBlanks(
  answers: Record<string, string>,
  blanks: readonly CodeBlank[],
): BlankCheckSummary {
  const results: BlankResult[] = blanks.map((blank) => ({
    id: blank.id,
    status: checkBlank(answers[blank.id], blank),
  }));

  const correctCount = results.filter((r) => r.status === 'correct').length;
  const total = blanks.length;
  const isComplete = total > 0 && correctCount === total;

  return { results, correctCount, total, isComplete };
}
