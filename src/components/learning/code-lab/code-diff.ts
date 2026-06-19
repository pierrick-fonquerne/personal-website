/**
 * Pure engine for line-level diff between "before" and "after" code versions.
 * Used by the before/after teaching mode of CodeLab.
 * No UI, no DOM dependencies - plain TypeScript functions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DiffLineType = 'added' | 'removed' | 'unchanged';

export interface DiffLine {
  readonly type: DiffLineType;
  readonly text: string;
  /** 1-based line number on the "before" side. Present for 'removed' and 'unchanged'. */
  readonly beforeLineNumber?: number;
  /** 1-based line number on the "after" side. Present for 'added' and 'unchanged'. */
  readonly afterLineNumber?: number;
}

export interface DiffSummary {
  readonly lines: readonly DiffLine[];
  readonly addedCount: number;
  readonly removedCount: number;
  readonly unchangedCount: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Split text into lines. Empty string yields zero lines. */
function toLines(text: string): string[] {
  return text === '' ? [] : text.split('\n');
}

/**
 * Build the LCS length table using dynamic programming.
 * Returns a 2-D array where lcsTable[i][j] is the LCS length
 * of beforeLines[0..i-1] and afterLines[0..j-1].
 */
function buildLcsTable(beforeLines: string[], afterLines: string[]): number[][] {
  const m = beforeLines.length;
  const n = afterLines.length;

  // Allocate (m+1) x (n+1) table filled with 0
  const table: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (beforeLines[i - 1] === afterLines[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }

  return table;
}

// ---------------------------------------------------------------------------
// Public function
// ---------------------------------------------------------------------------

/**
 * Compute a line-level diff between two code strings.
 *
 * Splits each string on newlines (empty string yields zero lines), computes
 * the LCS, then emits a DiffSummary. Within any change region, removed lines
 * are emitted before added lines. Line numbers are 1-based.
 */
export function diffLines(before: string, after: string): DiffSummary {
  const beforeLines = toLines(before);
  const afterLines = toLines(after);

  const m = beforeLines.length;
  const n = afterLines.length;

  const table = buildLcsTable(beforeLines, afterLines);

  // Backtrack through the LCS table to collect edit operations.
  // Each operation is one of:
  //   { kind: 'unchanged', beforeIndex: number, afterIndex: number }
  //   { kind: 'removed',   beforeIndex: number }
  //   { kind: 'added',     afterIndex:  number }
  //
  // We collect them in reverse order while backtracking, then reverse at the end.
  // However the brief requires: within a change region, removed BEFORE added.
  // The standard LCS backtrack naturally alternates between removed and added.
  // To satisfy the ordering requirement we buffer pending added lines and flush
  // them only after all pending removed lines in a region.

  type Operation =
    | { kind: 'unchanged'; beforeIndex: number; afterIndex: number }
    | { kind: 'removed'; beforeIndex: number }
    | { kind: 'added'; afterIndex: number };

  const reversedOps: Operation[] = [];

  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeLines[i - 1] === afterLines[j - 1]) {
      // Part of the LCS: unchanged line
      reversedOps.push({ kind: 'unchanged', beforeIndex: i - 1, afterIndex: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      // Line only in after: added
      reversedOps.push({ kind: 'added', afterIndex: j - 1 });
      j--;
    } else {
      // Line only in before: removed
      reversedOps.push({ kind: 'removed', beforeIndex: i - 1 });
      i--;
    }
  }

  // Reverse to get forward order
  reversedOps.reverse();

  // Now enforce "removed before added" within each change region.
  // A change region is a maximal contiguous run of non-unchanged operations.
  // Within such a run we want all removed ops first, then all added ops.
  const reorderedOps: Operation[] = [];

  let idx = 0;
  while (idx < reversedOps.length) {
    const op = reversedOps[idx];
    if (op.kind === 'unchanged') {
      reorderedOps.push(op);
      idx++;
    } else {
      // Collect the entire change region
      const removedGroup: Operation[] = [];
      const addedGroup: Operation[] = [];
      while (idx < reversedOps.length && reversedOps[idx].kind !== 'unchanged') {
        const current = reversedOps[idx];
        if (current.kind === 'removed') {
          removedGroup.push(current);
        } else {
          addedGroup.push(current);
        }
        idx++;
      }
      // Emit removed first, then added
      for (const r of removedGroup) reorderedOps.push(r);
      for (const a of addedGroup) reorderedOps.push(a);
    }
  }

  // Build the final DiffLine array with 1-based line numbers.
  // beforeLineNumber increments on 'removed' and 'unchanged'.
  // afterLineNumber increments on 'added' and 'unchanged'.
  const resultLines: DiffLine[] = [];
  let beforeCounter = 0;
  let afterCounter = 0;

  // We need to assign beforeLineNumber in source order for removed lines,
  // but we reordered removed before added. The beforeIndex on each op still
  // reflects the original position - use it directly (+1 for 1-based).
  // Similarly for afterIndex.
  for (const op of reorderedOps) {
    if (op.kind === 'unchanged') {
      beforeCounter++;
      afterCounter++;
      resultLines.push({
        type: 'unchanged',
        text: beforeLines[op.beforeIndex],
        beforeLineNumber: beforeCounter,
        afterLineNumber: afterCounter,
      });
    } else if (op.kind === 'removed') {
      beforeCounter++;
      resultLines.push({
        type: 'removed',
        text: beforeLines[op.beforeIndex],
        beforeLineNumber: beforeCounter,
      });
    } else {
      afterCounter++;
      resultLines.push({
        type: 'added',
        text: afterLines[op.afterIndex],
        afterLineNumber: afterCounter,
      });
    }
  }

  const addedCount = resultLines.filter((l) => l.type === 'added').length;
  const removedCount = resultLines.filter((l) => l.type === 'removed').length;
  const unchangedCount = resultLines.filter((l) => l.type === 'unchanged').length;

  return { lines: resultLines, addedCount, removedCount, unchangedCount };
}
