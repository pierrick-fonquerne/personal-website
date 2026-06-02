import { useMemo, useRef, useState, type JSX } from 'react';

import { buildTruthTable, parse, ParseError } from './engine';

export interface TruthTableLabels {
  valueTrue: string;
  valueFalse: string;
  hiddenCell: string;
  rowLabel: string;
  inputLabel: string;
  inputPlaceholder: string;
  symbolsLabel: string;
  stepToggle: string;
  revealNext: string;
  revealAll: string;
  reset: string;
  selectionLabel: string;
  equivalent: string;
  errorPrefix: string;
}

interface Props {
  expressions: string[];
  labels: TruthTableLabels;
  highlightEquivalence?: boolean;
  allowFreeInput?: boolean;
  caption?: string;
}

const SYMBOLS = ['¬', '∧', '∨', '⇒', '⇔', '(', ')'] as const;

type DraftState =
  | { readonly ok: true; readonly expression: string | null }
  | { readonly ok: false; readonly message: string };

function rowIndexOfSelection(selection: boolean[], variableCount: number): number {
  return selection.reduce((accumulator, value, position) => {
    const bit = value ? 0 : 1;
    return accumulator + (bit << (variableCount - 1 - position));
  }, 0);
}

export default function TruthTableBuilder({
  expressions,
  labels,
  highlightEquivalence = false,
  allowFreeInput = true,
  caption,
}: Props): JSX.Element {
  const [draft, setDraft] = useState('');
  const [stepMode, setStepMode] = useState(false);
  const [revealedRows, setRevealedRows] = useState<number>(Number.POSITIVE_INFINITY);
  const [selection, setSelection] = useState<boolean[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const draftState = useMemo<DraftState>(() => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      return { ok: true, expression: null };
    }
    try {
      parse(trimmed);
      return { ok: true, expression: trimmed };
    } catch (error) {
      const message = error instanceof ParseError ? error.message : 'Invalid expression.';
      return { ok: false, message };
    }
  }, [draft]);

  const draftExpression = draftState.ok ? draftState.expression : null;

  const table = useMemo(() => {
    const all = draftExpression ? [...expressions, draftExpression] : [...expressions];
    return buildTruthTable(all);
  }, [expressions, draftExpression]);

  const variableCount = table.variables.length;
  const currentSelection =
    selection && selection.length === variableCount ? selection : table.variables.map(() => true);
  const selectedRow = rowIndexOfSelection(currentSelection, variableCount);

  const isEquivalent = useMemo(() => {
    if (!highlightEquivalence || expressions.length < 2) {
      return false;
    }
    return table.rows.every((row) => row.results[0] === row.results[1]);
  }, [highlightEquivalence, expressions.length, table]);

  const totalRows = table.rows.length;
  const visibleUpTo = stepMode ? revealedRows : Number.POSITIVE_INFINITY;

  const headerExpressions = draftExpression ? [...expressions, draftExpression] : [...expressions];

  const toggleVariable = (position: number): void => {
    setSelection(currentSelection.map((value, index) => (index === position ? !value : value)));
  };

  const enableStepMode = (enabled: boolean): void => {
    setStepMode(enabled);
    setRevealedRows(enabled ? 0 : Number.POSITIVE_INFINITY);
  };

  const insertSymbol = (symbol: string): void => {
    const element = inputRef.current;
    if (!element) {
      setDraft((previous) => previous + symbol);
      return;
    }
    const start = element.selectionStart ?? draft.length;
    const end = element.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + symbol + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      element.focus();
      const caret = start + symbol.length;
      element.setSelectionRange(caret, caret);
    });
  };

  const renderValue = (value: boolean): string => (value ? labels.valueTrue : labels.valueFalse);
  const valueClass = (value: boolean): string =>
    value ? 'text-[var(--color-accent)]' : 'text-[var(--color-fg-muted)]';

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      {caption && (
        <figcaption className="mb-3 text-[13px] text-[var(--color-fg-muted)]">{caption}</figcaption>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center font-mono text-[13px]">
          <thead>
            <tr className="border-b border-[var(--color-line)]">
              {table.variables.map((variable) => (
                <th key={`var-${variable}`} className="px-3 py-2 font-semibold text-[var(--color-fg)]">
                  {variable}
                </th>
              ))}
              {headerExpressions.map((expression, index) => (
                <th
                  key={`expr-${index}-${expression}`}
                  className="border-l border-[var(--color-line)] px-3 py-2 font-semibold text-[var(--color-fg)]"
                >
                  {expression}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => {
              const highlighted = rowIndex === selectedRow;
              const revealed = rowIndex < visibleUpTo;
              return (
                <tr
                  key={`row-${rowIndex}`}
                  className={
                    highlighted
                      ? 'bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)]'
                      : 'border-b border-[var(--color-line)]'
                  }
                >
                  {row.values.map((value, columnIndex) => (
                    <td key={`v-${rowIndex}-${columnIndex}`} className={`px-3 py-1.5 ${valueClass(value)}`}>
                      {renderValue(value)}
                    </td>
                  ))}
                  {row.results.map((result, columnIndex) => (
                    <td
                      key={`r-${rowIndex}-${columnIndex}`}
                      className={`border-l border-[var(--color-line)] px-3 py-1.5 font-semibold ${
                        revealed ? valueClass(result) : 'text-[var(--color-fg-dim)]'
                      }`}
                    >
                      {revealed ? renderValue(result) : labels.hiddenCell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isEquivalent && (
        <p className="mt-4 rounded-md border border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] px-3 py-2 text-[13px] text-[var(--color-fg)]">
          {labels.equivalent}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <div role="group" aria-label={labels.selectionLabel} className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
            {labels.selectionLabel}
          </span>
          {table.variables.map((variable, position) => {
            const value = currentSelection[position] ?? true;
            return (
              <button
                key={`toggle-${variable}`}
                type="button"
                aria-pressed={value}
                onClick={() => toggleVariable(position)}
                className="rounded border border-[var(--color-line)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[12px] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                {variable} = {renderValue(value)}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={stepMode}
            onClick={() => enableStepMode(!stepMode)}
            className={
              stepMode
                ? 'rounded border border-[var(--color-accent)] bg-[var(--color-accent)] px-2 py-1 text-[12px] text-[var(--color-bg)]'
                : 'rounded border border-[var(--color-line)] bg-[var(--color-bg)] px-2 py-1 text-[12px] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
            }
          >
            {labels.stepToggle}
          </button>
          {stepMode && (
            <>
              <button
                type="button"
                onClick={() => setRevealedRows((rows) => Math.min(totalRows, rows + 1))}
                className="rounded border border-[var(--color-line)] bg-[var(--color-bg)] px-2 py-1 text-[12px] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                {labels.revealNext}
              </button>
              <button
                type="button"
                onClick={() => setRevealedRows(totalRows)}
                className="rounded border border-[var(--color-line)] bg-[var(--color-bg)] px-2 py-1 text-[12px] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                {labels.revealAll}
              </button>
              <button
                type="button"
                onClick={() => setRevealedRows(0)}
                className="rounded border border-[var(--color-line)] bg-[var(--color-bg)] px-2 py-1 text-[12px] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                {labels.reset}
              </button>
            </>
          )}
        </div>

        {allowFreeInput && (
          <div className="flex flex-col gap-2">
            <label className="block">
              <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
                {labels.inputLabel}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={draft}
                placeholder={labels.inputPlaceholder}
                onChange={(event) => setDraft(event.target.value)}
                spellCheck={false}
                autoComplete="off"
                className="mt-1 w-full rounded border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 font-mono text-[13px] text-[var(--color-fg)]"
              />
            </label>
            <div role="group" aria-label={labels.symbolsLabel} className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
                {labels.symbolsLabel}
              </span>
              {SYMBOLS.map((symbol) => (
                <button
                  key={`symbol-${symbol}`}
                  type="button"
                  onClick={() => insertSymbol(symbol)}
                  className="rounded border border-[var(--color-line)] bg-[var(--color-bg)] px-2.5 py-1 font-mono text-[14px] text-[var(--color-fg)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  {symbol}
                </button>
              ))}
            </div>
            {!draftState.ok && (
              <p className="text-[12px] text-[var(--color-danger,#d33)]">
                {labels.errorPrefix} {draftState.message}
              </p>
            )}
          </div>
        )}
      </div>
    </figure>
  );
}
