import { useState, type JSX } from 'react';
import {
  createInitialState,
  isCaughtUp,
  queueDepth,
  reduce,
  unreadCount,
  type BrokerLogState,
} from './broker-vs-log/broker-vs-log';

// ---------------------------------------------------------------------------
// Public types (exported so MDX config can be typed)
// ---------------------------------------------------------------------------

/** All user-visible text strings. None are hardcoded in the component. */
export interface BrokerVsLogCopy {
  /** Section heading, displayed in the header. */
  readonly heading: string;
  /** Short instruction line. */
  readonly instructions: string;
  /** Column header for the broker side. */
  readonly brokerTitle: string;
  /** Column header for the log side. */
  readonly logTitle: string;
  /** Label above the broker queue. */
  readonly queueLabel: string;
  /** Label above the broker workers list. */
  readonly workersLabel: string;
  /** Button label: produce a new message. */
  readonly produceLabel: string;
  /** Button label: deliver the next queued message (broker). */
  readonly deliverLabel: string;
  /** Button label: add a competing consumer (broker). */
  readonly addWorkerLabel: string;
  /** Button label: advance a consumer group offset by 1 (log). */
  readonly advanceLabel: string;
  /** Button label: add a late consumer group starting at offset 0 (log). */
  readonly addGroupLabel: string;
  /** Button label: rewind a group back to offset 0. */
  readonly rewindLabel: string;
  /** Button label: reset the whole simulation. */
  readonly resetLabel: string;
  /** Suffix after the worker handled-message counter, e.g. "traites". */
  readonly handledLabel: string;
  /** Label prefix for a group's current offset. */
  readonly offsetLabel: string;
  /** Suffix shown when a group has unread messages, e.g. "non lus". */
  readonly unreadLabel: string;
  /** Badge shown when a group is fully caught up. */
  readonly caughtUpLabel: string;
  /** Placeholder shown in the broker queue when it is empty. */
  readonly emptyQueueLabel: string;
  /** Placeholder shown in the log column when no messages have been produced. */
  readonly emptyLogLabel: string;
}

export interface BrokerVsLogVisualizerProps {
  readonly copy: BrokerVsLogCopy;
  /** Seed worker ids for the broker side (default: ['W-1', 'W-2']). */
  readonly initialWorkerIds?: readonly string[];
  /** Seed consumer group ids for the log side (default: ['G-A']). */
  readonly initialGroupIds?: readonly string[];
  /**
   * Labels proposed successively by the "Produce" button.
   * When exhausted or absent, a generic indexed label is used.
   */
  readonly messageLabels?: readonly string[];
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const BROKER_COLORS = {
  border: 'border-[var(--color-accent)]/40',
  text: 'text-[var(--color-accent)]',
  chip: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  btn: 'border-[var(--color-accent)]/50 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10',
};

const LOG_COLORS = {
  border: 'border-sky-400/40',
  text: 'text-sky-400',
  chip: 'bg-sky-400/10 text-sky-400',
  btn: 'border-sky-400/50 text-sky-400 hover:bg-sky-400/10',
};

const WORKER_COLORS = {
  border: 'border-amber-400/40',
  text: 'text-amber-400',
  chip: 'bg-amber-400/10 text-amber-400',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInitialState(
  workerIds: readonly string[],
  groupIds: readonly string[],
): BrokerLogState {
  return createInitialState({ workerIds, groupIds });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MessagePill({ label, id, dim }: { label: string; id: string; dim?: boolean }): JSX.Element {
  return (
    <span
      title={id}
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[11px] transition-opacity ${
        dim ? 'opacity-40' : ''
      } border-[var(--color-line)] bg-[var(--color-bg-elevated)] text-[var(--color-fg)]`}
    >
      <span className="text-[var(--color-fg-dim)]">{id}</span>
      <span>{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BrokerVsLogVisualizer({
  copy,
  initialWorkerIds = ['W-1', 'W-2'],
  initialGroupIds = ['G-A'],
  messageLabels,
}: BrokerVsLogVisualizerProps): JSX.Element {
  const [state, setState] = useState<BrokerLogState>(() =>
    makeInitialState(initialWorkerIds, initialGroupIds),
  );
  const [produceCount, setProduceCount] = useState(0);
  const [groupCounter, setGroupCounter] = useState(0);
  const [workerCounter, setWorkerCounter] = useState(initialWorkerIds.length);

  const dispatch = (action: Parameters<typeof reduce>[1]): void => {
    setState((prev) => reduce(prev, action));
  };

  const handleProduce = (): void => {
    const label =
      messageLabels != null && produceCount < messageLabels.length
        ? messageLabels[produceCount]
        : `msg-${produceCount}`;
    dispatch({ type: 'produce', label });
    setProduceCount((n) => n + 1);
  };

  const handleDeliverNext = (): void => {
    dispatch({ type: 'deliverNext' });
  };

  const handleAddWorker = (): void => {
    const id = `W-${workerCounter + 1}`;
    dispatch({ type: 'addWorker', id });
    setWorkerCounter((n) => n + 1);
  };

  const handleAdvanceGroup = (groupId: string): void => {
    dispatch({ type: 'advanceGroup', id: groupId });
  };

  const handleAddGroup = (): void => {
    const id = `G-${String.fromCharCode(65 + groupCounter + initialGroupIds.length)}`;
    dispatch({ type: 'addGroup', id, startOffset: 0 });
    setGroupCounter((n) => n + 1);
  };

  const handleRewindGroup = (groupId: string): void => {
    dispatch({ type: 'rewindGroup', id: groupId });
  };

  const handleReset = (): void => {
    setState(makeInitialState(initialWorkerIds, initialGroupIds));
    setProduceCount(0);
    setGroupCounter(0);
    setWorkerCounter(initialWorkerIds.length);
  };

  const depth = queueDepth(state);

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

      {/* Shared produce toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleProduce}
          className={`rounded border px-3 py-1.5 font-mono text-[12px] transition-colors ${BROKER_COLORS.btn} cursor-pointer`}
        >
          {copy.produceLabel}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="cursor-pointer rounded border border-[var(--color-line)] px-3 py-1.5 font-mono text-[12px] text-[var(--color-fg-dim)] transition-colors hover:text-[var(--color-fg)]"
        >
          {copy.resetLabel}
        </button>
      </div>

      {/* Two columns */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* --- BROKER column --- */}
        <div className={`rounded-md border p-4 ${BROKER_COLORS.border}`}>
          <p className={`mb-4 font-mono text-[11px] tracking-[0.12em] uppercase ${BROKER_COLORS.text}`}>
            {copy.brokerTitle}
          </p>

          {/* Queue */}
          <div className="mb-4">
            <p className="mb-1 font-mono text-[10px] tracking-[0.1em] text-[var(--color-fg-dim)] uppercase">
              {copy.queueLabel}
            </p>
            {state.queue.length === 0 ? (
              <p className="font-mono text-[11px] italic text-[var(--color-fg-dim)]">
                {copy.emptyQueueLabel}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {state.queue.map((id) => {
                  const msg = state.messages.find((m) => m.id === id);
                  return msg != null ? (
                    <MessagePill key={id} id={id} label={msg.label} />
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Workers */}
          <div className="mb-4">
            <p className="mb-1 font-mono text-[10px] tracking-[0.1em] text-[var(--color-fg-dim)] uppercase">
              {copy.workersLabel}
            </p>
            {state.workers.length === 0 ? (
              <p className="font-mono text-[11px] italic text-[var(--color-fg-dim)]">-</p>
            ) : (
              <ul className="flex flex-col gap-1" role="list">
                {state.workers.map((worker) => (
                  <li
                    key={worker.id}
                    className={`rounded border px-3 py-2 ${WORKER_COLORS.border}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-mono text-[12px] ${WORKER_COLORS.text}`}>
                        {worker.id}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${WORKER_COLORS.chip}`}>
                        {worker.handledIds.length} {copy.handledLabel}
                      </span>
                    </div>
                    {worker.handledIds.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {worker.handledIds.map((id) => {
                          const msg = state.messages.find((m) => m.id === id);
                          return msg != null ? (
                            <MessagePill key={id} id={id} label={msg.label} dim />
                          ) : null;
                        })}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Broker actions */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDeliverNext}
              disabled={depth === 0 || state.workers.length === 0}
              aria-label={copy.deliverLabel}
              className={`cursor-pointer rounded border px-3 py-1.5 font-mono text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${BROKER_COLORS.btn}`}
            >
              {copy.deliverLabel}
            </button>
            <button
              type="button"
              onClick={handleAddWorker}
              aria-label={copy.addWorkerLabel}
              className={`cursor-pointer rounded border px-3 py-1.5 font-mono text-[12px] transition-colors ${BROKER_COLORS.btn}`}
            >
              {copy.addWorkerLabel}
            </button>
          </div>
        </div>

        {/* --- LOG column --- */}
        <div className={`rounded-md border p-4 ${LOG_COLORS.border}`}>
          <p className={`mb-4 font-mono text-[11px] tracking-[0.12em] uppercase ${LOG_COLORS.text}`}>
            {copy.logTitle}
          </p>

          {/* Log tape */}
          <div className="mb-4">
            {state.messages.length === 0 ? (
              <p className="font-mono text-[11px] italic text-[var(--color-fg-dim)]">
                {copy.emptyLogLabel}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {state.messages.map((msg) => (
                  <MessagePill key={msg.id} id={msg.id} label={msg.label} />
                ))}
              </div>
            )}
          </div>

          {/* Consumer groups */}
          <div className="mb-4">
            {state.groups.length === 0 ? (
              <p className="font-mono text-[11px] italic text-[var(--color-fg-dim)]">-</p>
            ) : (
              <ul className="flex flex-col gap-2" role="list">
                {state.groups.map((group) => {
                  const caught = isCaughtUp(state, group.id);
                  const unread = unreadCount(state, group.id);
                  return (
                    <li
                      key={group.id}
                      className={`rounded border px-3 py-2 ${LOG_COLORS.border}`}
                    >
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <span className={`font-mono text-[12px] ${LOG_COLORS.text}`}>
                          {group.id}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--color-fg-dim)]">
                          {copy.offsetLabel}: {group.offset}
                        </span>
                        {caught ? (
                          <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${LOG_COLORS.chip}`}>
                            {copy.caughtUpLabel}
                          </span>
                        ) : (
                          <span className="rounded bg-amber-400/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-400">
                            {unread} {copy.unreadLabel}
                          </span>
                        )}
                      </div>

                      {/* Offset markers on the log tape */}
                      {state.messages.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          {state.messages.map((msg) => (
                            <span
                              key={msg.id}
                              className={`inline-block h-1.5 w-6 rounded-full transition-colors ${
                                msg.seq < group.offset
                                  ? 'bg-sky-400/60'
                                  : 'bg-[var(--color-line)]'
                              }`}
                              title={`${msg.id} - ${msg.seq < group.offset ? 'read' : 'unread'}`}
                            />
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleAdvanceGroup(group.id)}
                          disabled={caught}
                          aria-label={`${copy.advanceLabel} - ${group.id}`}
                          className={`cursor-pointer rounded border px-2 py-1 font-mono text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${LOG_COLORS.btn}`}
                        >
                          {copy.advanceLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRewindGroup(group.id)}
                          disabled={group.offset === 0}
                          aria-label={`${copy.rewindLabel} - ${group.id}`}
                          className={`cursor-pointer rounded border px-2 py-1 font-mono text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${LOG_COLORS.btn}`}
                        >
                          {copy.rewindLabel}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Log actions */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAddGroup}
              aria-label={copy.addGroupLabel}
              className={`cursor-pointer rounded border px-3 py-1.5 font-mono text-[12px] transition-colors ${LOG_COLORS.btn}`}
            >
              {copy.addGroupLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
