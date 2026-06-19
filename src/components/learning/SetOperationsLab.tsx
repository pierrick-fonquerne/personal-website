import { useMemo, useState, type JSX } from 'react';

import {
  complement,
  difference,
  evaluate,
  expressionsCoincide,
  intersection,
  litA,
  litB,
  membershipFormula,
  union,
  type SetExpression,
  type SetUniverse,
} from './set-operations/set-operations';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** All user-visible text strings. None are hardcoded in the component. */
export interface SetOperationsLabLabels {
  instructions: string;
  regionAOnly: string;
  regionIntersection: string;
  regionBOnly: string;
  regionOutside: string;
  operationLabel: string;
  operationUnion: string;
  operationIntersection: string;
  operationComplementA: string;
  operationDifferenceAB: string;
  membershipLabel: string;
  resultLabel: string;
  emptyResult: string;
  deMorganToggle: string;
  deMorganLeftLabel: string;
  deMorganRightLabel: string;
  deMorganMatch: string;
  deMorganMismatch: string;
  setALabel: string;
  setBLabel: string;
  reset: string;
}

interface SetOperationsLabProps {
  universe: string[];
  initialA: string[];
  initialB: string[];
  labels: SetOperationsLabLabels;
}

// ---------------------------------------------------------------------------
// Types internes
// ---------------------------------------------------------------------------

type Region = 'aOnly' | 'both' | 'bOnly' | 'outside';
type OperationKey = 'union' | 'intersection' | 'complementA' | 'differenceAB';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initRegions(universe: string[], initialA: string[], initialB: string[]): Map<string, Region> {
  const map = new Map<string, Region>();
  for (const el of universe) {
    const inA = initialA.includes(el);
    const inB = initialB.includes(el);
    if (inA && inB) map.set(el, 'both');
    else if (inA) map.set(el, 'aOnly');
    else if (inB) map.set(el, 'bOnly');
    else map.set(el, 'outside');
  }
  return map;
}

function nextRegion(current: Region): Region {
  const cycle: Region[] = ['aOnly', 'both', 'bOnly', 'outside'];
  return cycle[(cycle.indexOf(current) + 1) % cycle.length];
}

function buildExpression(op: OperationKey): SetExpression {
  switch (op) {
    case 'union':
      return union(litA, litB);
    case 'intersection':
      return intersection(litA, litB);
    case 'complementA':
      return complement(litA);
    case 'differenceAB':
      return difference(litA, litB);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SetOperationsLab({
  universe,
  initialA,
  initialB,
  labels,
}: SetOperationsLabProps): JSX.Element {
  const [regions, setRegions] = useState<Map<string, Region>>(() =>
    initRegions(universe, initialA, initialB),
  );
  const [operation, setOperation] = useState<OperationKey>('union');
  const [deMorganOpen, setDeMorganOpen] = useState(false);

  // Derive A and B from regions
  const setUniverse = useMemo<SetUniverse>(() => {
    const a: string[] = [];
    const b: string[] = [];
    for (const el of universe) {
      const r = regions.get(el) ?? 'outside';
      if (r === 'aOnly' || r === 'both') a.push(el);
      if (r === 'bOnly' || r === 'both') b.push(el);
    }
    return { elements: universe, a, b };
  }, [regions, universe]);

  const expr = useMemo(() => buildExpression(operation), [operation]);
  const formula = useMemo(() => membershipFormula(expr), [expr]);
  const result = useMemo(() => evaluate(expr, setUniverse), [expr, setUniverse]);
  const resultSet = useMemo(() => new Set(result), [result]);

  // De Morgan: (A u B)^c vs A^c n B^c
  const exprLeft = useMemo(() => complement(union(litA, litB)), []);
  const exprRight = useMemo(() => intersection(complement(litA), complement(litB)), []);
  const deMorganLeft = useMemo(() => evaluate(exprLeft, setUniverse), [exprLeft, setUniverse]);
  const deMorganRight = useMemo(() => evaluate(exprRight, setUniverse), [exprRight, setUniverse]);
  const deMorganHolds = useMemo(
    () => expressionsCoincide(exprLeft, exprRight, setUniverse),
    [exprLeft, exprRight, setUniverse],
  );

  function cycleElement(el: string): void {
    setRegions((prev) => {
      const next = new Map(prev);
      next.set(el, nextRegion(prev.get(el) ?? 'outside'));
      return next;
    });
  }

  function handleReset(): void {
    setRegions(initRegions(universe, initialA, initialB));
    setOperation('union');
    setDeMorganOpen(false);
  }

  // ---------------------------------------------------------------------------
  // Style constants (same as QuantifierLab)
  // ---------------------------------------------------------------------------

  const btnBase =
    'cursor-pointer rounded border px-3 py-1.5 font-mono text-[12px] transition-colors';
  const btnActive =
    'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]';
  const btnInactive =
    'border-[var(--color-line)] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]';

  const operations: { key: OperationKey; label: string }[] = [
    { key: 'union', label: labels.operationUnion },
    { key: 'intersection', label: labels.operationIntersection },
    { key: 'complementA', label: labels.operationComplementA },
    { key: 'differenceAB', label: labels.operationDifferenceAB },
  ];

  // ---------------------------------------------------------------------------
  // Element pill renderer
  // ---------------------------------------------------------------------------

  function Pill({ el }: { el: string }): JSX.Element {
    const highlighted = resultSet.has(el);
    return (
      <button
        type="button"
        onClick={() => cycleElement(el)}
        aria-label={`${el} - ${labels[regionKeyLabel(regions.get(el) ?? 'outside')]}`}
        title={labels[regionKeyLabel(regions.get(el) ?? 'outside')]}
        className={[
          'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border font-mono text-[13px] font-semibold transition-colors',
          highlighted
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/40'
            : 'border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-fg)] hover:border-[var(--color-accent)]/60',
        ].join(' ')}
      >
        {el}
      </button>
    );
  }

  function regionKeyLabel(r: Region): keyof SetOperationsLabLabels {
    switch (r) {
      case 'aOnly': return 'regionAOnly';
      case 'both': return 'regionIntersection';
      case 'bOnly': return 'regionBOnly';
      case 'outside': return 'regionOutside';
    }
  }

  // Elements by region
  const elsByRegion = useMemo(() => {
    const aOnly: string[] = [];
    const both: string[] = [];
    const bOnly: string[] = [];
    const outside: string[] = [];
    for (const el of universe) {
      const r = regions.get(el) ?? 'outside';
      if (r === 'aOnly') aOnly.push(el);
      else if (r === 'both') both.push(el);
      else if (r === 'bOnly') bOnly.push(el);
      else outside.push(el);
    }
    return { aOnly, both, bOnly, outside };
  }, [regions, universe]);

  // ---------------------------------------------------------------------------
  // Venn diagram
  // ---------------------------------------------------------------------------

  function RegionZone({
    els,
    labelText,
    ariaLabel,
    style,
  }: {
    els: string[];
    labelText: string;
    ariaLabel: string;
    style?: string;
  }): JSX.Element {
    return (
      <div
        className={['flex flex-col items-center gap-1.5 p-2', style ?? ''].join(' ')}
        aria-label={ariaLabel}
      >
        <span className="text-[10px] tracking-[0.08em] text-[var(--color-fg-dim)] uppercase select-none">
          {labelText}
        </span>
        <div className="flex flex-wrap justify-center gap-1.5">
          {els.length === 0 ? (
            <span className="font-mono text-[11px] text-[var(--color-fg-dim)] select-none">
              {'∅'}
            </span>
          ) : (
            els.map((el) => <Pill key={el} el={el} />)
          )}
        </div>
      </div>
    );
  }

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      {/* Instructions */}
      {labels.instructions && (
        <figcaption className="mb-4 text-[13px] text-[var(--color-fg-muted)]">
          {labels.instructions}
        </figcaption>
      )}

      {/* Venn diagram */}
      <div className="mb-5 overflow-x-auto">
        {/* Outer zone (hors A et B) */}
        <div
          className="rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] p-3"
          aria-label={labels.regionOutside}
        >
          {/* Outside label + pills */}
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] tracking-[0.08em] text-[var(--color-fg-dim)] uppercase select-none">
              {labels.regionOutside}
            </span>
            {elsByRegion.outside.map((el) => (
              <Pill key={el} el={el} />
            ))}
            {elsByRegion.outside.length === 0 && (
              <span className="font-mono text-[11px] text-[var(--color-fg-dim)] select-none">
                {'∅'}
              </span>
            )}
          </div>

          {/* Inner Venn: A and B circles */}
          <div className="flex min-h-[120px] flex-wrap items-stretch justify-center gap-0">
            {/* Circle A */}
            <div
              className="flex min-w-[120px] flex-1 flex-col items-center justify-center rounded-l-full border-2 border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5 px-3 py-4"
              aria-label={`${labels.setALabel} ${labels.regionAOnly}`}
            >
              <RegionZone
                els={elsByRegion.aOnly}
                labelText={`${labels.setALabel} ${labels.regionAOnly}`}
                ariaLabel={`${labels.setALabel} ${labels.regionAOnly}`}
              />
            </div>

            {/* Intersection A n B */}
            <div
              className="flex min-w-[100px] flex-col items-center justify-center border-y-2 border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-2 py-4"
              aria-label={labels.regionIntersection}
            >
              <RegionZone
                els={elsByRegion.both}
                labelText={labels.regionIntersection}
                ariaLabel={labels.regionIntersection}
              />
            </div>

            {/* Circle B */}
            <div
              className="flex min-w-[120px] flex-1 flex-col items-center justify-center rounded-r-full border-2 border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5 px-3 py-4"
              aria-label={`${labels.setBLabel} ${labels.regionBOnly}`}
            >
              <RegionZone
                els={elsByRegion.bOnly}
                labelText={`${labels.setBLabel} ${labels.regionBOnly}`}
                ariaLabel={`${labels.setBLabel} ${labels.regionBOnly}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Operation selector */}
      <div className="mb-4">
        <span className="mb-2 block font-mono text-[11px] tracking-[0.1em] text-[var(--color-fg-dim)] uppercase">
          {labels.operationLabel}
        </span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={labels.operationLabel}>
          {operations.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={operation === key}
              onClick={() => setOperation(key)}
              className={`${btnBase} ${operation === key ? btnActive : btnInactive}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Membership formula + result */}
      <div className="mb-5 rounded border border-[var(--color-line)] bg-[var(--color-bg)] px-4 py-3">
        <p className="mb-1 font-mono text-[11px] tracking-[0.08em] text-[var(--color-fg-dim)] uppercase">
          {labels.membershipLabel}
        </p>
        <p className="mb-3 font-mono text-[14px] text-[var(--color-fg)]">{formula}</p>
        <p className="mb-1 font-mono text-[11px] tracking-[0.08em] text-[var(--color-fg-dim)] uppercase">
          {labels.resultLabel}
        </p>
        <p className="font-mono text-[14px] text-[var(--color-accent)]">
          {result.length === 0 ? labels.emptyResult : `{ ${result.join(', ')} }`}
        </p>
      </div>

      {/* De Morgan toggle */}
      <div className="mb-2">
        <button
          type="button"
          aria-pressed={deMorganOpen}
          onClick={() => setDeMorganOpen((v) => !v)}
          className={`${btnBase} ${deMorganOpen ? btnActive : btnInactive}`}
        >
          {labels.deMorganToggle}
        </button>
      </div>

      {deMorganOpen && (
        <div className="mt-3 rounded border border-[var(--color-line)] bg-[var(--color-bg)] px-4 py-3">
          <div className="flex flex-wrap gap-4">
            {/* Left: (A u B)^c */}
            <div className="flex-1 min-w-[140px]">
              <p className="mb-1 font-mono text-[11px] tracking-[0.08em] text-[var(--color-fg-dim)] uppercase">
                {labels.deMorganLeftLabel}
              </p>
              <p className="font-mono text-[13px] text-[var(--color-fg)]">
                {deMorganLeft.length === 0
                  ? labels.emptyResult
                  : `{ ${deMorganLeft.join(', ')} }`}
              </p>
            </div>
            {/* Right: A^c n B^c */}
            <div className="flex-1 min-w-[140px]">
              <p className="mb-1 font-mono text-[11px] tracking-[0.08em] text-[var(--color-fg-dim)] uppercase">
                {labels.deMorganRightLabel}
              </p>
              <p className="font-mono text-[13px] text-[var(--color-fg)]">
                {deMorganRight.length === 0
                  ? labels.emptyResult
                  : `{ ${deMorganRight.join(', ')} }`}
              </p>
            </div>
          </div>
          <p
            className={`mt-3 font-mono text-[12px] font-semibold ${
              deMorganHolds
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {deMorganHolds ? labels.deMorganMatch : labels.deMorganMismatch}
          </p>
        </div>
      )}

      {/* Reset */}
      <div className="mt-4">
        <button
          type="button"
          onClick={handleReset}
          className={`${btnBase} border-[var(--color-line)] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]`}
        >
          {labels.reset}
        </button>
      </div>
    </figure>
  );
}
