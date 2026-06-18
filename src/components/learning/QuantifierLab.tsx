import { useMemo, useState, type JSX } from 'react';

import { evaluateNested, type Quantifier } from './quantifier/quantifier';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** All user-visible text strings. None are hardcoded in the component. */
export interface QuantifierLabLabels {
  relationCaption: string;
  outerLabel: string;
  innerLabel: string;
  forall: string;
  exists: string;
  swapAxes: string;
  reset: string;
  verdictTrue: string;
  verdictFalse: string;
  witnessLabel: string;
  counterExampleLabel: string;
}

interface QuantifierLabProps {
  domain: string[];
  initialRelation: boolean[][];
  labels: QuantifierLabLabels;
  variableNames?: [string, string];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deepCopy(matrix: boolean[][]): boolean[][] {
  return matrix.map((row) => [...row]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuantifierLab({
  domain,
  initialRelation,
  labels,
  variableNames = ['x', 'y'],
}: QuantifierLabProps): JSX.Element {
  const [relation, setRelation] = useState<boolean[][]>(() => deepCopy(initialRelation));
  const [outerVariable, setOuterVariable] = useState<0 | 1>(0);
  const [outerQuantifier, setOuterQuantifier] = useState<Quantifier>('forall');
  const [innerQuantifier, setInnerQuantifier] = useState<Quantifier>('exists');

  const outerName = variableNames[outerVariable];
  const innerName = variableNames[outerVariable === 0 ? 1 : 0];

  const verdict = useMemo(() => {
    if (outerVariable === 0) {
      return evaluateNested(
        outerQuantifier,
        innerQuantifier,
        domain,
        domain,
        (x, y) => relation[domain.indexOf(x)][domain.indexOf(y)],
      );
    }
    return evaluateNested(
      outerQuantifier,
      innerQuantifier,
      domain,
      domain,
      (y, x) => relation[domain.indexOf(x)][domain.indexOf(y)],
    );
  }, [relation, outerVariable, outerQuantifier, innerQuantifier, domain]);

  function toggleCell(i: number, j: number): void {
    setRelation((prev) => {
      const next = deepCopy(prev);
      next[i][j] = !next[i][j];
      return next;
    });
  }

  function handleSwapAxes(): void {
    // Reversing the quantifier prefix (for example forall-x exists-y becomes
    // exists-y forall-x) flips which variable is outer AND swaps the two
    // quantifiers. Doing only the first would turn forall-x exists-y into
    // forall-y exists-x, a different and usually equivalent statement.
    setOuterVariable((v) => (v === 0 ? 1 : 0));
    setOuterQuantifier(innerQuantifier);
    setInnerQuantifier(outerQuantifier);
  }

  function handleReset(): void {
    setRelation(deepCopy(initialRelation));
    setOuterVariable(0);
    setOuterQuantifier('forall');
    setInnerQuantifier('exists');
  }

  // Compute the quantifier symbol for display
  const outerSymbol = outerQuantifier === 'forall' ? '∀' : '∃';
  const innerSymbol = innerQuantifier === 'forall' ? '∀' : '∃';

  // Decisive label
  const isOuterExists = outerQuantifier === 'exists';
  const isOuterForall = outerQuantifier === 'forall';
  let decisiveLabel: string | null = null;
  if (verdict.decisive !== null) {
    if (isOuterExists && verdict.value) {
      decisiveLabel = `${labels.witnessLabel} : ${verdict.decisive}`;
    } else if (isOuterForall && !verdict.value) {
      decisiveLabel = `${labels.counterExampleLabel} : ${verdict.decisive}`;
    }
  }

  // Highlighted row/column index (outer axis decisive)
  const decisiveIndex = verdict.decisive !== null ? domain.indexOf(verdict.decisive) : -1;

  // Determine if a row or column is highlighted
  // outerVariable === 0 means x is outer -> rows are indexed by x (i)
  // outerVariable === 1 means y is outer -> columns are indexed by y (j)
  function isCellDecisive(i: number, j: number): boolean {
    if (decisiveIndex === -1) return false;
    if (outerVariable === 0) return i === decisiveIndex;
    return j === decisiveIndex;
  }

  const verdictColor = verdict.value
    ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
    : 'bg-red-400/15 text-red-400 border border-red-400/30';

  const btnBase =
    'cursor-pointer rounded border px-3 py-1.5 font-mono text-[12px] transition-colors';
  const btnActive =
    'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]';
  const btnInactive =
    'border-[var(--color-line)] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]';

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      {/* Caption */}
      {labels.relationCaption && (
        <figcaption className="mb-3 text-[13px] text-[var(--color-fg-muted)]">
          {labels.relationCaption}
        </figcaption>
      )}

      {/* Statement line */}
      <p className="mb-4 font-mono text-[15px] text-[var(--color-fg)]">
        {outerSymbol}
        {outerName}{' '}
        {innerSymbol}
        {innerName} &middot; R({variableNames[0]}, {variableNames[1]})
      </p>

      {/* Grid */}
      <div className="mb-5 overflow-x-auto">
        <table className="border-collapse text-center font-mono text-[13px]">
          <thead>
            <tr className="border-b border-[var(--color-line)]">
              {/* Top-left corner: outer axis label over inner axis */}
              <th
                className="px-3 py-2 text-[11px] text-[var(--color-fg-dim)]"
                aria-label={`${variableNames[0]} \\ ${variableNames[1]}`}
              >
                {variableNames[0]} \ {variableNames[1]}
              </th>
              {domain.map((colLabel) => (
                <th
                  key={`col-${colLabel}`}
                  className="px-3 py-2 font-semibold text-[var(--color-fg)]"
                >
                  {colLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {domain.map((rowLabel, i) => {
              const isDecisiveRow = outerVariable === 0 && i === decisiveIndex;

              return (
                <tr
                  key={`row-${rowLabel}`}
                  className={
                    isDecisiveRow
                      ? 'bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]'
                      : 'border-b border-[var(--color-line)]'
                  }
                >
                  {/* Row header */}
                  <th
                    scope="row"
                    className={`px-3 py-2 font-semibold ${
                      isDecisiveRow
                        ? 'text-[var(--color-accent)]'
                        : 'text-[var(--color-fg)]'
                    }`}
                  >
                    {rowLabel}
                  </th>
                  {domain.map((colLabel, j) => {
                    const isDecisiveCol = outerVariable === 1 && j === decisiveIndex;
                    const checked = relation[i][j];
                    const highlight = isCellDecisive(i, j);

                    return (
                      <td
                        key={`cell-${i}-${j}`}
                        className={`px-2 py-1 ${
                          isDecisiveCol
                            ? 'bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]'
                            : ''
                        }`}
                      >
                        <button
                          type="button"
                          aria-pressed={checked}
                          aria-label={`R(${rowLabel}, ${colLabel})`}
                          onClick={() => toggleCell(i, j)}
                          className={`h-8 w-8 rounded border text-[13px] transition-colors ${
                            checked
                              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                              : 'border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-fg-dim)] hover:border-[var(--color-accent)]/60'
                          } ${highlight ? 'ring-1 ring-[var(--color-accent)]/40' : ''}`}
                        >
                          {checked ? '✓' : ''}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Verdict */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded px-3 py-1.5 font-mono text-[13px] font-semibold ${verdictColor}`}
        >
          {verdict.value ? labels.verdictTrue : labels.verdictFalse}
        </span>
        {decisiveLabel !== null && (
          <span className="font-mono text-[12px] text-[var(--color-fg-muted)]">
            {decisiveLabel}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        {/* Outer quantifier selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] tracking-[0.1em] text-[var(--color-fg-dim)] uppercase">
            {labels.outerLabel}
          </span>
          <div className="flex gap-1" role="group" aria-label={labels.outerLabel}>
            <button
              type="button"
              aria-pressed={outerQuantifier === 'forall'}
              onClick={() => setOuterQuantifier('forall')}
              className={`${btnBase} ${outerQuantifier === 'forall' ? btnActive : btnInactive}`}
            >
              {labels.forall}
            </button>
            <button
              type="button"
              aria-pressed={outerQuantifier === 'exists'}
              onClick={() => setOuterQuantifier('exists')}
              className={`${btnBase} ${outerQuantifier === 'exists' ? btnActive : btnInactive}`}
            >
              {labels.exists}
            </button>
          </div>
        </div>

        {/* Inner quantifier selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] tracking-[0.1em] text-[var(--color-fg-dim)] uppercase">
            {labels.innerLabel}
          </span>
          <div className="flex gap-1" role="group" aria-label={labels.innerLabel}>
            <button
              type="button"
              aria-pressed={innerQuantifier === 'forall'}
              onClick={() => setInnerQuantifier('forall')}
              className={`${btnBase} ${innerQuantifier === 'forall' ? btnActive : btnInactive}`}
            >
              {labels.forall}
            </button>
            <button
              type="button"
              aria-pressed={innerQuantifier === 'exists'}
              onClick={() => setInnerQuantifier('exists')}
              className={`${btnBase} ${innerQuantifier === 'exists' ? btnActive : btnInactive}`}
            >
              {labels.exists}
            </button>
          </div>
        </div>

        {/* Swap + Reset */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSwapAxes}
            className={`${btnBase} border-[var(--color-line)] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]`}
          >
            {labels.swapAxes}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className={`${btnBase} border-[var(--color-line)] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]`}
          >
            {labels.reset}
          </button>
        </div>
      </div>
    </figure>
  );
}
