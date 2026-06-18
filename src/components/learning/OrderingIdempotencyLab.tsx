import { useState, type JSX } from 'react';
import {
  simulateOrderingIdempotency,
  DELIVERED_SEQUENCE,
  type EventKind,
  type OrderingStep,
  type Verdict,
} from './ordering-idempotency/ordering-idempotency';

// ---------------------------------------------------------------------------
// Public types (exported so MDX config can be typed)
// ---------------------------------------------------------------------------

/** All user-visible text strings. None are hardcoded in the component. */
export interface OrderingIdempotencyCopy {
  readonly heading: string;
  readonly instructions: string;
  /** Label of the row that shows the as-delivered stream. */
  readonly deliveredLabel: string;
  /** Label of the row that shows the processed stream. */
  readonly processedLabel: string;
  /** Toggle labels. */
  readonly dedupLabel: string;
  readonly orderingLabel: string;
  readonly onLabel: string;
  readonly offLabel: string;
  /** Event names (used both for the chips and the final state). */
  readonly createdLabel: string;
  readonly paidLabel: string;
  readonly shippedLabel: string;
  /** Marker on a duplicate that was skipped by deduplication. */
  readonly skipDuplicateLabel: string;
  /** Marker on a ship event applied before the payment. */
  readonly outOfOrderLabel: string;
  /** Summary labels. */
  readonly chargeCountLabel: string;
  readonly finalStateLabel: string;
  readonly shippedBeforePaidLabel: string;
  /** Verdict labels. */
  readonly verdictCorrectLabel: string;
  readonly verdictDuplicateLabel: string;
  readonly verdictDisorderedLabel: string;
  readonly verdictCorruptLabel: string;
  readonly resetLabel: string;
}

export interface OrderingIdempotencyLabProps {
  readonly copy: OrderingIdempotencyCopy;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function eventLabel(kind: EventKind, copy: OrderingIdempotencyCopy): string {
  if (kind === 'create') return copy.createdLabel;
  if (kind === 'pay') return copy.paidLabel;
  return copy.shippedLabel;
}

function stateLabel(state: 'created' | 'paid' | 'shipped', copy: OrderingIdempotencyCopy): string {
  if (state === 'created') return copy.createdLabel;
  if (state === 'paid') return copy.paidLabel;
  return copy.shippedLabel;
}

function verdictLabel(verdict: Verdict, copy: OrderingIdempotencyCopy): string {
  if (verdict === 'correct') return copy.verdictCorrectLabel;
  if (verdict === 'duplicate') return copy.verdictDuplicateLabel;
  if (verdict === 'disordered') return copy.verdictDisorderedLabel;
  return copy.verdictCorruptLabel;
}

function verdictStyles(verdict: Verdict): string {
  switch (verdict) {
    case 'correct':
      return 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30';
    case 'duplicate':
      return 'bg-amber-400/15 text-amber-400 border border-amber-400/30';
    case 'disordered':
      return 'bg-orange-400/15 text-orange-400 border border-orange-400/30';
    case 'corrupt':
      return 'bg-red-400/15 text-red-400 border border-red-400/30';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DeliveredChip({
  kind,
  label,
}: {
  kind: EventKind;
  label: string;
}): JSX.Element {
  const tone =
    kind === 'pay'
      ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
      : 'border-[var(--color-line)] bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)]';
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] ${tone}`}
    >
      {label}
    </span>
  );
}

function ProcessedChip({
  step,
  copy,
}: {
  step: OrderingStep;
  copy: OrderingIdempotencyCopy;
}): JSX.Element {
  if (step.kind === 'skip-duplicate') {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-dashed border-[var(--color-line)] bg-[var(--color-bg-elevated)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-fg-dim)] line-through decoration-1">
        <span>{eventLabel(step.event, copy)}</span>
        <span className="no-underline opacity-70">({copy.skipDuplicateLabel})</span>
      </span>
    );
  }

  if (step.outOfOrder) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-red-400/50 bg-red-400/10 px-2 py-0.5 font-mono text-[11px] text-red-400">
        <span>{eventLabel(step.event, copy)}</span>
        <span className="opacity-80">({copy.outOfOrderLabel})</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-2 py-0.5 font-mono text-[11px] text-[var(--color-accent)]">
      {eventLabel(step.event, copy)}
    </span>
  );
}

interface ToggleProps {
  label: string;
  active: boolean;
  onLabel: string;
  offLabel: string;
  onToggle: () => void;
}

function Toggle({ label, active, onLabel, offLabel, onToggle }: ToggleProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`flex items-center justify-between gap-3 rounded border px-3 py-2 font-mono text-[12px] transition-colors ${
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
          : 'border-[var(--color-line)] text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]'
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] tracking-[0.1em] uppercase ${
          active
            ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
            : 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-dim)]'
        }`}
      >
        {active ? onLabel : offLabel}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OrderingIdempotencyLab({
  copy,
}: OrderingIdempotencyLabProps): JSX.Element {
  const [dedup, setDedup] = useState<boolean>(false);
  const [ordering, setOrdering] = useState<boolean>(false);

  const outcome = simulateOrderingIdempotency({ dedup, ordering });

  const handleReset = (): void => {
    setDedup(false);
    setOrdering(false);
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

      {/* Delivered stream (fixed) */}
      <div className="mb-5">
        <p className="mb-2 font-mono text-[10px] tracking-[0.1em] text-[var(--color-fg-dim)] uppercase">
          {copy.deliveredLabel}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {DELIVERED_SEQUENCE.map((event, index) => (
            <DeliveredChip
              key={`delivered-${event.messageId}-${index}`}
              kind={event.kind}
              label={eventLabel(event.kind, copy)}
            />
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="mb-6 grid gap-2 sm:grid-cols-2">
        <Toggle
          label={copy.dedupLabel}
          active={dedup}
          onLabel={copy.onLabel}
          offLabel={copy.offLabel}
          onToggle={() => setDedup((value) => !value)}
        />
        <Toggle
          label={copy.orderingLabel}
          active={ordering}
          onLabel={copy.onLabel}
          offLabel={copy.offLabel}
          onToggle={() => setOrdering((value) => !value)}
        />
      </div>

      {/* Processed stream */}
      <div className="mb-5">
        <p className="mb-2 font-mono text-[10px] tracking-[0.1em] text-[var(--color-fg-dim)] uppercase">
          {copy.processedLabel}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {outcome.steps.map((step, index) => (
            <ProcessedChip key={`processed-${step.messageId}-${index}`} step={step} copy={copy} />
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] pt-4">
        <span className="inline-flex items-center gap-2 rounded border border-[var(--color-line)] bg-[var(--color-bg-elevated)] px-2 py-1 font-mono text-[11px]">
          <span className="text-[var(--color-fg-dim)] uppercase tracking-[0.1em] text-[10px]">
            {copy.chargeCountLabel}
          </span>
          <span
            className={outcome.chargeCount >= 2 ? 'text-red-400' : 'text-[var(--color-fg)]'}
          >
            {outcome.chargeCount}x
          </span>
        </span>

        <span className="inline-flex items-center gap-2 rounded border border-[var(--color-line)] bg-[var(--color-bg-elevated)] px-2 py-1 font-mono text-[11px]">
          <span className="text-[var(--color-fg-dim)] uppercase tracking-[0.1em] text-[10px]">
            {copy.finalStateLabel}
          </span>
          <span className="text-[var(--color-fg)]">{stateLabel(outcome.finalState, copy)}</span>
        </span>

        {outcome.shippedBeforePaid && (
          <span className="inline-flex items-center rounded border border-red-400/40 bg-red-400/10 px-2 py-1 font-mono text-[11px] text-red-400">
            {copy.shippedBeforePaidLabel}
          </span>
        )}

        <span
          className={`ml-auto rounded px-2.5 py-1 font-mono text-[11px] font-semibold ${verdictStyles(outcome.verdict)}`}
        >
          {verdictLabel(outcome.verdict, copy)}
        </span>
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
