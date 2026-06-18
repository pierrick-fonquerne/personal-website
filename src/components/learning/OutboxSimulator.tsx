import { useState, type JSX } from 'react';
import {
  simulateOutbox,
  type Mode,
  type CrashPoint,
  type StepKind,
  type Verdict,
} from './outbox/outbox';

// ---------------------------------------------------------------------------
// Public types (exported so MDX config can be typed)
// ---------------------------------------------------------------------------

/** All user-visible text strings. None are hardcoded in the component. */
export interface OutboxSimulatorCopy {
  readonly heading: string;
  readonly instructions: string;
  readonly modeLabel: string;
  readonly modeDualWriteLabel: string;
  readonly modeOutboxLabel: string;
  readonly crashLabel: string;
  readonly crashNoneLabel: string;
  readonly crashMidLabel: string;
  /** Label of the atomic transaction wrapper around the atomic steps. */
  readonly transactionLabel: string;
  /** State indicators. */
  readonly dbLabel: string;
  readonly brokerLabel: string;
  readonly dbHasOrderLabel: string;
  readonly brokerHasMessageLabel: string;
  readonly brokerNoMessageLabel: string;
  readonly consistencyLabel: string;
  readonly consistentStateLabel: string;
  readonly inconsistentStateLabel: string;
  /** Step labels. */
  readonly stepCommitDbLabel: string;
  readonly stepInsertOutboxLabel: string;
  readonly stepPublishLabel: string;
  readonly stepClaimLabel: string;
  readonly stepMarkSentLabel: string;
  readonly stepCrashLabel: string;
  readonly stepRecoverRelayLabel: string;
  /** Verdict labels. */
  readonly verdictByLuckLabel: string;
  readonly verdictLostLabel: string;
  readonly verdictConsistentLabel: string;
  readonly verdictEventualLabel: string;
  readonly resetLabel: string;
}

export interface OutboxSimulatorProps {
  readonly copy: OutboxSimulatorCopy;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODES: readonly Mode[] = ['dual-write', 'outbox'];
const CRASH_POINTS: readonly CrashPoint[] = ['none', 'mid'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stepLabel(kind: StepKind, copy: OutboxSimulatorCopy): string {
  switch (kind) {
    case 'commit-db':
      return copy.stepCommitDbLabel;
    case 'insert-outbox':
      return copy.stepInsertOutboxLabel;
    case 'publish':
      return copy.stepPublishLabel;
    case 'claim':
      return copy.stepClaimLabel;
    case 'mark-sent':
      return copy.stepMarkSentLabel;
    case 'crash':
      return copy.stepCrashLabel;
    case 'recover-relay':
      return copy.stepRecoverRelayLabel;
  }
}

function stepStyles(kind: StepKind): string {
  if (kind === 'crash') {
    return 'border-red-400/50 bg-red-400/10 text-red-400';
  }
  if (kind === 'publish' || kind === 'mark-sent') {
    return 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/15 text-[var(--color-accent)]';
  }
  if (kind === 'recover-relay') {
    return 'border-amber-400/40 bg-amber-400/10 text-amber-400';
  }
  return 'border-[var(--color-line)] bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)]';
}

function verdictLabel(verdict: Verdict, copy: OutboxSimulatorCopy): string {
  switch (verdict) {
    case 'consistent-by-luck':
      return copy.verdictByLuckLabel;
    case 'inconsistent-lost':
      return copy.verdictLostLabel;
    case 'consistent':
      return copy.verdictConsistentLabel;
    case 'consistent-eventual':
      return copy.verdictEventualLabel;
  }
}

function verdictStyles(verdict: Verdict): string {
  switch (verdict) {
    case 'consistent':
    case 'consistent-eventual':
      return 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30';
    case 'consistent-by-luck':
      return 'bg-amber-400/15 text-amber-400 border border-amber-400/30';
    case 'inconsistent-lost':
      return 'bg-red-400/15 text-red-400 border border-red-400/30';
  }
}

function StepChip({ kind, copy }: { kind: StepKind; copy: OutboxSimulatorCopy }): JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] ${stepStyles(kind)}`}
    >
      {stepLabel(kind, copy)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ToggleRowProps<T extends string> {
  label: string;
  values: readonly T[];
  current: T;
  labelOf: (value: T) => string;
  onSelect: (value: T) => void;
}

function ToggleRow<T extends string>({
  label,
  values,
  current,
  labelOf,
  onSelect,
}: ToggleRowProps<T>): JSX.Element {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] tracking-[0.1em] text-[var(--color-fg-dim)] uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            aria-pressed={current === value}
            className={`cursor-pointer rounded border px-3 py-1.5 font-mono text-[12px] transition-colors ${
              current === value
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                : 'border-[var(--color-line)] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]'
            }`}
          >
            {labelOf(value)}
          </button>
        ))}
      </div>
    </div>
  );
}

function StateIndicator({
  label,
  stateText,
  ok,
}: {
  label: string;
  stateText: string;
  ok: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-3">
      <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--color-fg-dim)] uppercase">
        {label}
      </span>
      <span
        className={`font-mono text-[12px] ${ok ? 'text-[var(--color-accent)]' : 'text-red-400'}`}
      >
        {stateText}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OutboxSimulator({ copy }: OutboxSimulatorProps): JSX.Element {
  const [mode, setMode] = useState<Mode>('dual-write');
  const [crash, setCrash] = useState<CrashPoint>('none');

  const outcome = simulateOutbox(mode, crash);

  const atomicSteps = outcome.steps.filter((s) => s.atomic);
  const restSteps = outcome.steps.filter((s) => !s.atomic);

  const modeLabelOf = (value: Mode): string =>
    value === 'dual-write' ? copy.modeDualWriteLabel : copy.modeOutboxLabel;
  const crashLabelOf = (value: CrashPoint): string =>
    value === 'none' ? copy.crashNoneLabel : copy.crashMidLabel;

  const handleReset = (): void => {
    setMode('dual-write');
    setCrash('none');
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

      {/* Toggles */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <ToggleRow
          label={copy.modeLabel}
          values={MODES}
          current={mode}
          labelOf={modeLabelOf}
          onSelect={setMode}
        />
        <ToggleRow
          label={copy.crashLabel}
          values={CRASH_POINTS}
          current={crash}
          labelOf={crashLabelOf}
          onSelect={setCrash}
        />
      </div>

      {/* Step timeline */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {atomicSteps.length > 0 && (
          <span className="inline-flex flex-wrap items-center gap-2 rounded-md border border-dashed border-[var(--color-accent)]/50 bg-[var(--color-accent)]/5 px-2 py-1.5">
            <span className="font-mono text-[9px] tracking-[0.1em] text-[var(--color-accent)] uppercase">
              {copy.transactionLabel}
            </span>
            {atomicSteps.map((step, index) => (
              <StepChip key={`atomic-${step.kind}-${index}`} kind={step.kind} copy={copy} />
            ))}
          </span>
        )}
        {restSteps.map((step, index) => (
          <StepChip key={`rest-${step.kind}-${index}`} kind={step.kind} copy={copy} />
        ))}
      </div>

      {/* State indicators */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StateIndicator label={copy.dbLabel} stateText={copy.dbHasOrderLabel} ok={outcome.dbHasOrder} />
        <StateIndicator
          label={copy.brokerLabel}
          stateText={outcome.brokerHasMessage ? copy.brokerHasMessageLabel : copy.brokerNoMessageLabel}
          ok={outcome.brokerHasMessage}
        />
        <StateIndicator
          label={copy.consistencyLabel}
          stateText={outcome.consistent ? copy.consistentStateLabel : copy.inconsistentStateLabel}
          ok={outcome.consistent}
        />
      </div>

      {/* Verdict + reset */}
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] pt-4">
        <span
          className={`rounded px-2.5 py-1 font-mono text-[11px] font-semibold ${verdictStyles(outcome.verdict)}`}
        >
          {verdictLabel(outcome.verdict, copy)}
        </span>
        <button
          type="button"
          onClick={handleReset}
          aria-label={copy.resetLabel}
          className="ml-auto cursor-pointer rounded border border-[var(--color-line)] px-3 py-1.5 font-mono text-[12px] text-[var(--color-fg-dim)] transition-colors hover:text-[var(--color-fg)]"
        >
          {copy.resetLabel}
        </button>
      </div>
    </section>
  );
}
