import { useState, type DragEvent, type JSX } from 'react';
import {
  familyOf,
  scoreAssignments,
  type MessageFamily,
  type TaxonomyMessage,
} from './message-taxonomy/message-taxonomy';

// ---------------------------------------------------------------------------
// Public types (exported so MDX config can be typed)
// ---------------------------------------------------------------------------

/** Input descriptor for one message card. */
export interface MessageItemDef {
  readonly id: string;
  /** Visible text of the card, e.g. "Charge the payment". */
  readonly label: string;
  readonly isBroadcast: boolean;
  readonly mutatesState: boolean;
}

/** All user-visible text strings. None are hardcoded in the component. */
export interface MessageTaxonomyCopy {
  /** Section header. */
  readonly heading: string;
  /** Short instruction line. */
  readonly instructions: string;
  /** Header above the pool of cards still to sort. */
  readonly unassignedHeader: string;
  /** Label of the command bin. */
  readonly binCommand: string;
  /** Label of the query bin. */
  readonly binQuery: string;
  /** Label of the event bin. */
  readonly binEvent: string;
  /** Action verb used to assign a card to a bin, e.g. "Range dans". */
  readonly assignLabel: string;
  /** Label to remove a card from a bin. */
  readonly removeLabel: string;
  /** Label of the check button. */
  readonly checkLabel: string;
  /** Label of the reset button. */
  readonly resetLabel: string;
  /** Prefix before the "correct/total" score, e.g. "Bien classes". */
  readonly scoreLabel: string;
  /** Badge for a correctly sorted card. */
  readonly correctLabel: string;
  /** Badge for an incorrectly sorted card. */
  readonly incorrectLabel: string;
  /** Axis explanation: broadcast to unknown subscribers. */
  readonly axisBroadcast: string;
  /** Axis explanation: single known recipient. */
  readonly axisPointToPoint: string;
  /** Axis explanation: writes state. */
  readonly axisWrites: string;
  /** Axis explanation: reads state. */
  readonly axisReads: string;
  /** Prefix before the expected family name, e.g. "Bonne famille :". */
  readonly expectedPrefix: string;
}

export interface MessageTaxonomyExplorerProps {
  readonly messages: readonly MessageItemDef[];
  readonly copy: MessageTaxonomyCopy;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BINS: readonly MessageFamily[] = ['command', 'query', 'event'];

const BIN_STYLES: Record<MessageFamily, { border: string; text: string; chip: string }> = {
  command: {
    border: 'border-[var(--color-accent)]/40',
    text: 'text-[var(--color-accent)]',
    chip: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  },
  query: {
    border: 'border-sky-400/40',
    text: 'text-sky-400',
    chip: 'bg-sky-400/10 text-sky-400',
  },
  event: {
    border: 'border-amber-400/40',
    text: 'text-amber-400',
    chip: 'bg-amber-400/10 text-amber-400',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Assignments = Record<string, MessageFamily | null>;

function binLabel(family: MessageFamily, copy: MessageTaxonomyCopy): string {
  if (family === 'command') return copy.binCommand;
  if (family === 'query') return copy.binQuery;
  return copy.binEvent;
}

function axesExplanation(item: MessageItemDef, copy: MessageTaxonomyCopy): string {
  const reach = item.isBroadcast ? copy.axisBroadcast : copy.axisPointToPoint;
  const effect = item.mutatesState ? copy.axisWrites : copy.axisReads;
  return `${reach}, ${effect}`;
}

function toTaxonomyMessage(item: MessageItemDef): TaxonomyMessage {
  return {
    id: item.id,
    isBroadcast: item.isBroadcast,
    mutatesState: item.mutatesState,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MessageTaxonomyExplorer({
  messages,
  copy,
}: MessageTaxonomyExplorerProps): JSX.Element {
  const [assignments, setAssignments] = useState<Assignments>(() =>
    Object.fromEntries(messages.map((item) => [item.id, null])),
  );
  const [isChecked, setIsChecked] = useState(false);

  const assign = (id: string, family: MessageFamily): void => {
    setAssignments((prev) => ({ ...prev, [id]: family }));
    setIsChecked(false);
  };

  const unassign = (id: string): void => {
    setAssignments((prev) => ({ ...prev, [id]: null }));
    setIsChecked(false);
  };

  const handleCheck = (): void => {
    setIsChecked(true);
  };

  const handleReset = (): void => {
    setAssignments(Object.fromEntries(messages.map((item) => [item.id, null])));
    setIsChecked(false);
  };

  const handleDrop = (family: MessageFamily) => (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain');
    if (id) {
      assign(id, family);
    }
  };

  const handleDragStart = (id: string) => (event: DragEvent<HTMLLIElement>): void => {
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'move';
  };

  const score = scoreAssignments(messages.map(toTaxonomyMessage), assignments);
  const unassigned = messages.filter((item) => assignments[item.id] == null);

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

      {/* Pool of unassigned cards */}
      <div className="mb-5">
        <p className="mb-2 font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-dim)] uppercase">
          {copy.unassignedHeader}
        </p>
        <ul className="flex flex-col gap-2" role="list">
          {unassigned.map((item) => (
            <li
              key={item.id}
              draggable
              onDragStart={handleDragStart(item.id)}
              className="flex flex-col gap-2 rounded-md border border-[var(--color-line)] bg-[var(--color-bg)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-mono text-[13px] text-[var(--color-fg)]">{item.label}</span>
              <div className="flex flex-wrap gap-2">
                {BINS.map((family) => (
                  <button
                    key={family}
                    type="button"
                    onClick={() => assign(item.id, family)}
                    aria-label={`${item.label}: ${copy.assignLabel} ${binLabel(family, copy)}`}
                    className={`rounded border px-2 py-0.5 font-mono text-[11px] transition-colors ${BIN_STYLES[family].border} ${BIN_STYLES[family].text} hover:opacity-80`}
                  >
                    {binLabel(family, copy)}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Bins */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {BINS.map((family) => {
          const styles = BIN_STYLES[family];
          const binned = messages.filter((item) => assignments[item.id] === family);
          return (
            <div
              key={family}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop(family)}
              className={`rounded-md border border-dashed bg-[var(--color-bg)] p-3 ${styles.border}`}
            >
              <p className={`mb-2 font-mono text-[11px] tracking-[0.12em] uppercase ${styles.text}`}>
                {binLabel(family, copy)}
              </p>
              <ul className="flex flex-col gap-2" role="list">
                {binned.map((item) => {
                  const expected = familyOf(toTaxonomyMessage(item));
                  const isCorrect = expected === family;
                  return (
                    <li
                      key={item.id}
                      className="rounded border border-[var(--color-line)] bg-[var(--color-bg-elevated)] px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[12px] text-[var(--color-fg)]">
                          {item.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => unassign(item.id)}
                          aria-label={`${copy.removeLabel}: ${item.label}`}
                          className="rounded border border-[var(--color-line)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-fg-dim)] transition-colors hover:border-[var(--color-fg-muted)]"
                        >
                          {copy.removeLabel}
                        </button>
                      </div>

                      {/* Correction, revealed after checking */}
                      {isChecked && (
                        <div className="mt-2">
                          <span
                            className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] ${
                              isCorrect
                                ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                                : 'bg-red-400/10 text-red-400'
                            }`}
                          >
                            {isCorrect ? copy.correctLabel : copy.incorrectLabel}
                          </span>
                          {!isCorrect && (
                            <p className="mt-1 font-mono text-[10px] text-[var(--color-fg-dim)]">
                              {copy.expectedPrefix} {binLabel(expected, copy)}
                              {' - '}
                              {axesExplanation(item, copy)}
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mb-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCheck}
          className="rounded-md bg-[var(--color-accent)] px-5 py-2 font-mono text-[13px] text-white transition-opacity hover:opacity-80"
        >
          {copy.checkLabel}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-[var(--color-line)] px-5 py-2 font-mono text-[13px] text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-fg-dim)]"
        >
          {copy.resetLabel}
        </button>
      </div>

      {/* Score */}
      {isChecked && (
        <div
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg)] px-5 py-3"
          role="status"
          aria-live="polite"
        >
          <span className="font-mono text-[13px] text-[var(--color-fg)]">
            {copy.scoreLabel}&nbsp;
            <span className="font-semibold text-[var(--color-accent)]">
              {score.correct}/{score.total}
            </span>
          </span>
        </div>
      )}
    </section>
  );
}
