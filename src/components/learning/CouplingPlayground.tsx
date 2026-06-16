import { useState, type JSX } from 'react';
import {
  evaluateCoupling,
  type Consumer,
  type CouplingMode,
  type CouplingOutcome,
} from './coupling/coupling';

// ---------------------------------------------------------------------------
// Public types (exported so MDX config can be typed)
// ---------------------------------------------------------------------------

/** Input descriptor for one downstream consumer. */
export interface ConsumerDef {
  readonly id: string;
  readonly label: string;
  readonly latencyMs: number;
}

/** All user-visible text strings. None are hardcoded in the component. */
export interface CouplingCopy {
  /** Section header (e.g. "Playground"). */
  readonly heading: string;
  /** Label for the mode toggle group (e.g. "Mode"). */
  readonly modeLabel: string;
  /** Button label for synchronous mode (e.g. "Synchrone"). */
  readonly modeSync: string;
  /** Button label for asynchronous mode (e.g. "Asynchrone"). */
  readonly modeAsync: string;
  /** Button label to trigger the dispatch action (e.g. "Passer commande"). */
  readonly triggerLabel: string;
  /** Column header for the consumer list (e.g. "Consommateurs"). */
  readonly consumersHeader: string;
  /** Toggle label for a healthy consumer (e.g. "Sain"). */
  readonly statusHealthy: string;
  /** Toggle label for a down consumer (e.g. "En panne"). */
  readonly statusDown: string;
  /** Prefix before the blocking time value (e.g. "Blocage appelant :"). */
  readonly blockingLabel: string;
  /** Unit appended after the blocking time value (e.g. "ms"). */
  readonly blockingUnit: string;
  /** Verdict when the caller succeeds (e.g. "Commande validee"). */
  readonly verdictSuccess: string;
  /** Verdict when the caller fails (e.g. "Echec - erreur propagee"). */
  readonly verdictFailure: string;
  /** Consumer outcome: message processed immediately (e.g. "Traite"). */
  readonly outcomeProcessed: string;
  /** Consumer outcome: message waiting in the queue (e.g. "En attente (file)"). */
  readonly outcomePending: string;
  /** Consumer outcome: this consumer broke the sync chain (e.g. "A bloque la chaine"). */
  readonly outcomeBlocker: string;
  /** Consumer outcome: not reached because a previous one failed (e.g. "Non atteint"). */
  readonly outcomeSkipped: string;
  /** Legend label for the blocking time metric (e.g. "Temps de blocage"). */
  readonly legendBlocking: string;
}

export interface CouplingPlaygroundProps {
  readonly consumers: readonly ConsumerDef[];
  readonly copy: CouplingCopy;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

type ConsumerOutcomeStatus = 'processed' | 'pending' | 'blocker' | 'skipped' | 'idle';

const OUTCOME_STYLES: Record<
  ConsumerOutcomeStatus,
  { dot: string; text: string; badge: string }
> = {
  processed: {
    dot: 'bg-[var(--color-success)]',
    text: 'text-[var(--color-success)]',
    badge: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
  },
  pending: {
    dot: 'bg-amber-400',
    text: 'text-amber-400',
    badge: 'bg-amber-400/10 text-amber-400',
  },
  blocker: {
    dot: 'bg-red-400',
    text: 'text-red-400',
    badge: 'bg-red-400/10 text-red-400',
  },
  skipped: {
    dot: 'bg-[var(--color-fg-muted)]',
    text: 'text-[var(--color-fg-muted)]',
    badge: 'bg-[var(--color-fg-muted)]/10 text-[var(--color-fg-muted)]',
  },
  idle: {
    dot: 'bg-[var(--color-line)]',
    text: 'text-[var(--color-fg-dim)]',
    badge: 'bg-[var(--color-line)]/20 text-[var(--color-fg-dim)]',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveConsumerStatus(
  consumerId: string,
  outcome: CouplingOutcome | null,
): ConsumerOutcomeStatus {
  if (outcome === null) return 'idle';
  if (outcome.processed.includes(consumerId)) return 'processed';
  if (outcome.pending.includes(consumerId)) return 'pending';
  if (outcome.blockedBy.includes(consumerId)) return 'blocker';
  return 'skipped';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CouplingPlayground({
  consumers,
  copy,
}: CouplingPlaygroundProps): JSX.Element {
  const [mode, setMode] = useState<CouplingMode>('sync');
  const [healthMap, setHealthMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(consumers.map((c) => [c.id, true])),
  );
  const [outcome, setOutcome] = useState<CouplingOutcome | null>(null);

  const toggleHealth = (id: string): void => {
    setHealthMap((prev) => ({ ...prev, [id]: !prev[id] }));
    setOutcome(null);
  };

  const handleModeChange = (next: CouplingMode): void => {
    setMode(next);
    setOutcome(null);
  };

  const handleTrigger = (): void => {
    const resolved: Consumer[] = consumers.map((c) => ({
      id: c.id,
      label: c.label,
      latencyMs: c.latencyMs,
      isHealthy: healthMap[c.id] ?? true,
    }));
    setOutcome(evaluateCoupling(mode, resolved));
  };

  const callerSucceeds = outcome?.callerSucceeds ?? null;

  return (
    <section className="my-8 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-6">
      {/* Heading */}
      <header className="mb-5">
        <span className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-accent)] uppercase">
          {copy.heading}
        </span>
      </header>

      {/* Mode toggle */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-dim)] uppercase">
          {copy.modeLabel}
        </span>
        {(['sync', 'async'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => handleModeChange(m)}
            className={`rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors ${
              mode === m
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                : 'border-[var(--color-line)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-dim)]'
            }`}
          >
            {m === 'sync' ? copy.modeSync : copy.modeAsync}
          </button>
        ))}
      </div>

      {/* Consumer list */}
      <div className="mb-5">
        <p className="mb-2 font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-dim)] uppercase">
          {copy.consumersHeader}
        </p>
        <ul className="flex flex-col gap-2" role="list">
          {consumers.map((c) => {
            const isHealthy = healthMap[c.id] ?? true;
            const status = resolveConsumerStatus(c.id, outcome);
            const styles = OUTCOME_STYLES[status];
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-md border border-[var(--color-line)] bg-[var(--color-bg)] px-4 py-3"
              >
                {/* Consumer identity */}
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${styles.dot}`} />
                  <span className="font-mono text-[13px] text-[var(--color-fg)]">{c.label}</span>
                  <span className="font-mono text-[11px] text-[var(--color-fg-dim)]">
                    {c.latencyMs}&nbsp;{copy.blockingUnit}
                  </span>
                </div>

                {/* Right side: outcome badge + health toggle */}
                <div className="flex items-center gap-3">
                  {/* Outcome badge */}
                  {outcome !== null && (
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[11px] ${styles.badge}`}
                    >
                      {status === 'processed' && copy.outcomeProcessed}
                      {status === 'pending' && copy.outcomePending}
                      {status === 'blocker' && copy.outcomeBlocker}
                      {status === 'skipped' && copy.outcomeSkipped}
                    </span>
                  )}

                  {/* Health toggle */}
                  <button
                    type="button"
                    aria-pressed={!isHealthy}
                    aria-label={`${c.label}: ${isHealthy ? copy.statusHealthy : copy.statusDown}`}
                    onClick={() => toggleHealth(c.id)}
                    className={`rounded border px-2 py-0.5 font-mono text-[11px] transition-colors ${
                      isHealthy
                        ? 'border-[var(--color-success)]/40 text-[var(--color-success)] hover:border-[var(--color-success)]'
                        : 'border-red-400/40 text-red-400 hover:border-red-400'
                    }`}
                  >
                    {isHealthy ? copy.statusHealthy : copy.statusDown}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Trigger */}
      <button
        type="button"
        onClick={handleTrigger}
        className="mb-5 rounded-md bg-[var(--color-accent)] px-5 py-2 font-mono text-[13px] text-white transition-opacity hover:opacity-80"
      >
        {copy.triggerLabel}
      </button>

      {/* Result panel */}
      {outcome !== null && (
        <div
          className={`rounded-md border px-5 py-4 ${
            callerSucceeds
              ? 'border-[var(--color-success)]/40 bg-[var(--color-success)]/5'
              : 'border-red-400/40 bg-red-400/5'
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="mb-2 flex flex-wrap items-center gap-4">
            {/* Verdict */}
            <span
              className={`font-mono text-[13px] font-semibold ${
                callerSucceeds ? 'text-[var(--color-success)]' : 'text-red-400'
              }`}
            >
              {callerSucceeds ? copy.verdictSuccess : copy.verdictFailure}
            </span>
            {/* Blocking time */}
            <span className="font-mono text-[12px] text-[var(--color-fg-dim)]">
              {copy.blockingLabel}&nbsp;
              <span className="text-[var(--color-fg)]">
                {outcome.callerBlockingMs}&nbsp;{copy.blockingUnit}
              </span>
            </span>
          </div>
          {/* Legend */}
          <p className="font-mono text-[11px] text-[var(--color-fg-dim)]">{copy.legendBlocking}</p>
        </div>
      )}
    </section>
  );
}
