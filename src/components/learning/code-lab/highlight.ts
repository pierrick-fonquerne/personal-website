/**
 * Syntax highlighting utilities for CodeLab code display.
 *
 * Uses Shiki server-side with the github-dark theme (consistent with the MDX
 * renderer used in Astro course chapters). Only read-only code blocks are
 * highlighted here - editable blanks remain plain monospace (handled elsewhere).
 *
 * Two pure helpers are fully unit-tested (toShikiLanguage, parseLineRanges).
 * getCodeHighlighter() is NOT unit-tested: it loads a WASM binary (~7 MB) and
 * would make the test suite slow and flaky in CI. It is validated in integration
 * as part of the CodeBlock component (Task 5).
 */

import { createHighlighter, type Highlighter } from 'shiki';
import type { CodeLanguage } from './code-lab-types';

// ---------------------------------------------------------------------------
// toShikiLanguage
// ---------------------------------------------------------------------------

/**
 * Map our CodeLanguage union to the Shiki grammar identifier.
 * Explicit mapping (not a direct cast) so that if CodeLanguage evolves the
 * compiler forces a review here.
 */
export function toShikiLanguage(language: CodeLanguage): 'csharp' | 'rust' {
  switch (language) {
    case 'csharp':
      return 'csharp';
    case 'rust':
      return 'rust';
  }
}

// ---------------------------------------------------------------------------
// parseLineRanges
// ---------------------------------------------------------------------------

/**
 * Parse a line-highlight specification string into a set of 1-based line numbers,
 * clamped to [1, totalLines].
 *
 * Format: comma-separated tokens, each token being either:
 * - a single integer "n" - adds line n if in range.
 * - a range "a-b" - adds all integers from a to b (inclusive) intersected with [1, totalLines].
 *   Ignored when a > b or either bound is not a valid integer.
 *
 * Leading/trailing whitespace around tokens and range bounds is trimmed.
 * Non-numeric or malformed tokens are silently ignored.
 * undefined or blank spec returns an empty set.
 */
export function parseLineRanges(spec: string | undefined, totalLines: number): ReadonlySet<number> {
  const result = new Set<number>();

  if (spec === undefined || spec.trim() === '') {
    return result;
  }

  const tokens = spec.split(',');

  for (const rawToken of tokens) {
    const token = rawToken.trim();
    if (token === '') {
      continue;
    }

    if (token.includes('-')) {
      // Range token: "a-b" (trim each bound separately)
      const dashIndex = token.indexOf('-');
      const rawA = token.slice(0, dashIndex).trim();
      const rawB = token.slice(dashIndex + 1).trim();
      const a = Number(rawA);
      const b = Number(rawB);

      if (!Number.isInteger(a) || !Number.isInteger(b) || rawA === '' || rawB === '') {
        continue;
      }
      if (a > b) {
        continue;
      }

      const start = Math.max(a, 1);
      const end = Math.min(b, totalLines);
      for (let line = start; line <= end; line++) {
        result.add(line);
      }
    } else {
      // Single number token
      const n = Number(token);
      if (!Number.isInteger(n) || isNaN(n) || token === '') {
        continue;
      }
      if (n >= 1 && n <= totalLines) {
        result.add(n);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// getCodeHighlighter (lazy singleton - not unit tested, see JSDoc above)
// ---------------------------------------------------------------------------

let highlighterPromise: Promise<Highlighter> | null = null;

/**
 * Return the shared Shiki highlighter instance, creating it on first call.
 *
 * Lazy singleton: the WASM grammar engine is initialised at most once per
 * process, regardless of how many times this function is called concurrently.
 * Subsequent calls return the same Promise (already resolved after the first
 * successful load).
 *
 * Not unit-tested here: loading the WASM binary in vitest would add several
 * seconds to the test run and can fail in sandboxed CI environments. Validated
 * in integration via the CodeBlock component (Task 5).
 */
export function getCodeHighlighter(): Promise<Highlighter> {
  if (highlighterPromise === null) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark'],
      langs: ['csharp', 'rust'],
    });
  }
  return highlighterPromise;
}
