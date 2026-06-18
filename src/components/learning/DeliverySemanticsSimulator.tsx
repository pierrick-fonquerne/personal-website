import { useState, type JSX } from 'react';
import {
  simulateDelivery,
  type CrashPoint,
  type DeliverySemantic,
  type DeliveryStep,
  type DeliveryStepKind,
  type Verdict,
} from './delivery-semantics/delivery-semantics';

// ---------------------------------------------------------------------------
// Public types (exported so MDX config can be typed)
// ---------------------------------------------------------------------------

/** All user-visible text strings. None are hardcoded in the component. */
export interface DeliverySemanticsCopy {
  readonly heading: string;
  readonly instructions: string;
  /** Name of the side effect being counted, e.g. "Paiement preleve". */
  readonly effectName: string;
  /** Label above the crash-point selector. */
  readonly crashPointLabel: string;
  readonly crashNoneLabel: string;
  readonly crashBeforeProcessLabel: string;
  readonly crashAfterProcessLabel: string;
  readonly atMostOnceTitle: string;
  readonly atLeastOnceTitle: string;
  readonly effectivelyOnceTitle: string;
  /** Short hint displayed under each column title. */
  readonly atMostOnceHint: string;
  readonly atLeastOnceHint: string;
  readonly effectivelyOnceHint: string;
  /** Label prefix for the effect count badge. */
  readonly effectCountLabel: string;
  readonly verdictLostLabel: string;
  readonly verdictDuplicateLabel: string;
  readonly verdictExactlyOnceLabel: string;
  readonly stepDeliverLabel: string;
  readonly stepRedeliverLabel: string;
  readonly stepProcessLabel: string;
  readonly stepSkipDuplicateLabel: string;
  readonly stepAckLabel: string;
  readonly stepCrashLabel: string;
  readonly stepLostLabel: string;
  /** Suffix for attempt number in each step chip, e.g. "tentative". */
  readonly attemptLabel: string;
  readonly resetLabel: string;
}

export interface DeliverySemanticsSimulatorProps {
  readonly copy: DeliverySemanticsCopy;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEMANTICS: readonly DeliverySemantic[] = ['at-most-once', 'at-least-once', 'effectively-once'];

const CRASH_POINTS: readonly CrashPoint[] = ['none', 'before-process', 'after-process'];

const DEFAULT_CRASH: CrashPoint = 'none';

// ---------------------------------------------------------------------------
// Step chip styles per kind
// ---------------------------------------------------------------------------

const STEP_KIND_STYLES: Record<DeliveryStepKind, string> = {
  deliver: 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  redeliver: 'border-amber-400/40 bg-amber-400/10 text-amber-400',
  process: 'border-[var(--color-accent)]/60 bg-[var(--color-accent)]/20 text-[var(--color-accent)]',
  'skip-duplicate': 'border-[var(--color-line)] bg-[var(--color-bg-elevated)] text-[var(--color-fg-dim)]',
  ack: 'border-sky-400/40 bg-sky-400/10 text-sky-400',
  crash: 'border-red-400/40 bg-red-400/10 text-red-400',
  lost: 'border-red-400/60 bg-red-400/20 text-red-400',
};

// ---------------------------------------------------------------------------
// Verdict badge styles
// ---------------------------------------------------------------------------

function verdictStyles(verdict: Verdict): string {
  switch (verdict) {
    case 'lost':
      return 'bg-red-400/15 text-red-400 border border-red-400/30';
    case 'duplicate':
      return 'bg-amber-400/15 text-amber-400 border border-amber-400/30';
    case 'exactly-once':
      return 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepChip({
  step,
  copy,
}: {
  step: DeliveryStep;
  copy: DeliverySemanticsCopy;
}): JSX.Element {
  const kindLabel: Record<DeliveryStepKind, string> = {
    deliver: copy.stepDeliverLabel,
    redeliver: copy.stepRedeliverLabel,
    process: copy.stepProcessLabel,
    'skip-duplicate': copy.stepSkipDuplicateLabel,
    ack: copy.stepAckLabel,
    crash: copy.stepCrashLabel,
    lost: copy.stepLostLabel,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[11px] ${STEP_KIND_STYLES[step.kind]}`}
    >
      <span>{kindLabel[step.kind]}</span>
      <span className="opacity-60">
        {copy.attemptLabel} {step.attempt}
      </span>
    </span>
  );
}

interface SemanticColumnProps {
  semantic: DeliverySemantic;
  crash: CrashPoint;
  copy: DeliverySemanticsCopy;
}

function semanticTitle(semantic: DeliverySemantic, copy: DeliverySemanticsCopy): string {
  if (semantic === 'at-most-once') return copy.atMostOnceTitle;
  if (semantic === 'at-least-once') return copy.atLeastOnceTitle;
  return copy.effectivelyOnceTitle;
}

function semanticHint(semantic: DeliverySemantic, copy: DeliverySemanticsCopy): string {
  if (semantic === 'at-most-once') return copy.atMostOnceHint;
  if (semantic === 'at-least-once') return copy.atLeastOnceHint;
  return copy.effectivelyOnceHint;
}

function verdictLabel(verdict: Verdict, copy: DeliverySemanticsCopy): string {
  if (verdict === 'lost') return copy.verdictLostLabel;
  if (verdict === 'duplicate') return copy.verdictDuplicateLabel;
  return copy.verdictExactlyOnceLabel;
}

function SemanticColumn({ semantic, crash, copy }: SemanticColumnProps): JSX.Element {
  const outcome = simulateDelivery({ semantic, crash });

  return (
    <div className="flex flex-col gap-3 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-4">
      {/* Column header */}
      <div>
        <p className="font-mono text-[11px] font-semibold tracking-[0.12em] text-[var(--color-fg)] uppercase">
          {semanticTitle(semantic, copy)}
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--color-fg-muted)]">{semanticHint(semantic, copy)}</p>
      </div>

      {/* Step timeline */}
      <div className="flex flex-col gap-1.5">
        {outcome.steps.map((step, index) => (
          <StepChip key={`${step.kind}-${step.attempt}-${index}`} step={step} copy={copy} />
        ))}
      </div>

      {/* Effect count badge */}
      <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-line)]">
        <span className="font-mono text-[10px] text-[var(--color-fg-dim)] uppercase tracking-[0.1em]">
          {copy.effectCountLabel}
        </span>
        <span className="rounded bg-[var(--color-bg-elevated)] border border-[var(--color-line)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-fg)]">
          {outcome.effectCount}x {copy.effectName}
        </span>
      </div>

      {/* Verdict badge */}
      <span
        className={`self-start rounded px-2 py-0.5 font-mono text-[11px] font-semibold ${verdictStyles(outcome.verdict)}`}
      >
        {verdictLabel(outcome.verdict, copy)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DeliverySemanticsSimulator({
  copy,
}: DeliverySemanticsSimulatorProps): JSX.Element {
  const [crash, setCrash] = useState<CrashPoint>(DEFAULT_CRASH);

  const crashLabel: Record<CrashPoint, string> = {
    none: copy.crashNoneLabel,
    'before-process': copy.crashBeforeProcessLabel,
    'after-process': copy.crashAfterProcessLabel,
  };

  const handleReset = (): void => {
    setCrash(DEFAULT_CRASH);
  };

  return (
    <section className="my-8 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-6">
      {/* Heading */}
      <header className="mb-3">
        <span className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-accent)] uppercase">
          {copy.heading}
        </span>
      </header>

      {/* Instructions */}
      <p className="mb-5 text-[13px] text-[var(--color-fg-muted)]">{copy.instructions}</p>

      {/* Crash-point selector */}
      <div className="mb-6">
        <p className="mb-2 font-mono text-[10px] tracking-[0.1em] text-[var(--color-fg-dim)] uppercase">
          {copy.crashPointLabel}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={copy.crashPointLabel}>
          {CRASH_POINTS.map((point) => (
            <button
              key={point}
              type="button"
              onClick={() => setCrash(point)}
              aria-pressed={crash === point}
              className={`cursor-pointer rounded border px-3 py-1.5 font-mono text-[12px] transition-colors ${
                crash === point
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'border-[var(--color-line)] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]'
              }`}
            >
              {crashLabel[point]}
            </button>
          ))}
        </div>
      </div>

      {/* Three semantic columns */}
      <div className="grid gap-4 sm:grid-cols-3">
        {SEMANTICS.map((semantic) => (
          <SemanticColumn key={semantic} semantic={semantic} crash={crash} copy={copy} />
        ))}
      </div>

      {/* Reset button */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          aria-label={copy.resetLabel}
          className="cursor-pointer rounded border border-[var(--color-line)] px-3 py-1.5 font-mono text-[12px] text-[var(--color-fg-dim)] transition-colors hover:text-[var(--color-fg)]"
        >
          {copy.resetLabel}
        </button>
      </div>
    </section>
  );
}
