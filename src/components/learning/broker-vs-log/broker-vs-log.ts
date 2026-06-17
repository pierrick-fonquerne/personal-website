/**
 * broker-vs-log.ts
 *
 * Pure engine for the BrokerVsLogVisualizer component.
 *
 * Two mental models run over the SAME produced stream:
 *
 * BROKER (e.g. RabbitMQ):
 *   - Each message is delivered to exactly ONE competing consumer (round-robin).
 *   - After acknowledgement, the message is erased from the queue.
 *   - The broker owns the delivery state: consumers are stateless.
 *   - A late-joining worker receives nothing already delivered.
 *
 * LOG (e.g. Kafka):
 *   - Every message is appended to an immutable, append-only log.
 *   - Each consumer group tracks its own offset (next position to read).
 *   - A group added after N messages were produced starts at offset 0 by
 *     default and can replay the full history.
 *   - The log never shrinks; only consumer offsets advance.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A message produced into the shared stream. Its seq is its 0-based offset position in the log. */
export interface BrokerLogMessage {
  readonly id: string;
  readonly seq: number;
  readonly label: string;
}

/** A competing consumer on the broker side. handledIds lists the messages it consumed then acked. */
export interface Worker {
  readonly id: string;
  readonly handledIds: readonly string[];
}

/** A consumer group on the log side. offset is the next position to read: messages [0, offset) are already read. */
export interface ConsumerGroup {
  readonly id: string;
  readonly offset: number;
}

/** Full state shared by the two columns (broker and log) over the SAME produced stream. */
export interface BrokerLogState {
  readonly messages: readonly BrokerLogMessage[]; // the log: append-only, never shrinks
  readonly queue: readonly string[];              // broker: ids pending delivery (not yet acked); shrinks on delivery
  readonly workers: readonly Worker[];            // broker: competing consumers
  readonly nextWorkerIndex: number;               // broker: round-robin cursor
  readonly groups: readonly ConsumerGroup[];      // log: consumer groups, each with its own offset
}

export type BrokerLogAction =
  | { readonly type: 'produce'; readonly label: string }       // append to log AND enqueue on broker
  | { readonly type: 'deliverNext' }                           // broker: head -> next worker (round-robin), ack + erase from queue
  | { readonly type: 'addWorker'; readonly id: string }        // broker: add a competing consumer
  | { readonly type: 'advanceGroup'; readonly id: string }     // log: that group reads its next message (offset++ if any unread)
  | { readonly type: 'addGroup'; readonly id: string; readonly startOffset?: number } // log: add a group (default offset 0 = relit tout)
  | { readonly type: 'rewindGroup'; readonly id: string; readonly toOffset?: number }; // log: reset a group offset (default 0)

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Builds the initial state. Optionally seed workers and groups by id (groups start at offset 0).
 */
export function createInitialState(config?: {
  readonly workerIds?: readonly string[];
  readonly groupIds?: readonly string[];
}): BrokerLogState {
  const workers: readonly Worker[] = (config?.workerIds ?? []).map((id) => ({
    id,
    handledIds: [],
  }));
  const groups: readonly ConsumerGroup[] = (config?.groupIds ?? []).map((id) => ({
    id,
    offset: 0,
  }));

  return {
    messages: [],
    queue: [],
    workers,
    nextWorkerIndex: 0,
    groups,
  };
}

// ---------------------------------------------------------------------------
// Pure reducer
// ---------------------------------------------------------------------------

/**
 * Pure reducer: returns a new state, never mutates. Unknown/no-op actions return the state unchanged.
 */
export function reduce(state: BrokerLogState, action: BrokerLogAction): BrokerLogState {
  switch (action.type) {
    case 'produce': {
      const seq = state.messages.length;
      const id = `m${seq}`;
      const newMessage: BrokerLogMessage = { id, seq, label: action.label };
      return {
        ...state,
        messages: [...state.messages, newMessage],
        queue: [...state.queue, id],
      };
    }

    case 'deliverNext': {
      if (state.queue.length === 0 || state.workers.length === 0) {
        return state;
      }
      const [headId, ...remainingQueue] = state.queue;
      const workerIndex = state.nextWorkerIndex % state.workers.length;
      const updatedWorkers = state.workers.map((worker, index) => {
        if (index !== workerIndex) return worker;
        return { ...worker, handledIds: [...worker.handledIds, headId] };
      });
      return {
        ...state,
        queue: remainingQueue,
        workers: updatedWorkers,
        nextWorkerIndex: state.nextWorkerIndex + 1,
      };
    }

    case 'addWorker': {
      const newWorker: Worker = { id: action.id, handledIds: [] };
      return {
        ...state,
        workers: [...state.workers, newWorker],
      };
    }

    case 'advanceGroup': {
      const groups = state.groups.map((group) => {
        if (group.id !== action.id) return group;
        if (group.offset >= state.messages.length) return group; // already caught up, no-op
        return { ...group, offset: group.offset + 1 };
      });
      return { ...state, groups };
    }

    case 'addGroup': {
      const startOffset = action.startOffset ?? 0;
      const clampedOffset = Math.max(0, Math.min(startOffset, state.messages.length));
      const newGroup: ConsumerGroup = { id: action.id, offset: clampedOffset };
      return {
        ...state,
        groups: [...state.groups, newGroup],
      };
    }

    case 'rewindGroup': {
      const toOffset = action.toOffset ?? 0;
      const clampedOffset = Math.max(0, Math.min(toOffset, state.messages.length));
      const groups = state.groups.map((group) => {
        if (group.id !== action.id) return group;
        return { ...group, offset: clampedOffset };
      });
      return { ...state, groups };
    }

    default: {
      return state;
    }
  }
}

// ---------------------------------------------------------------------------
// Selectors (pure)
// ---------------------------------------------------------------------------

/** Number of messages still pending in the broker queue. */
export function queueDepth(state: BrokerLogState): number {
  return state.queue.length;
}

/** Messages a group has not read yet (messages.length - offset). */
export function unreadCount(state: BrokerLogState, groupId: string): number {
  const group = state.groups.find((g) => g.id === groupId);
  if (group == null) return 0;
  return state.messages.length - group.offset;
}

/** True when a group has read everything currently in the log (offset === messages.length). */
export function isCaughtUp(state: BrokerLogState, groupId: string): boolean {
  const group = state.groups.find((g) => g.id === groupId);
  if (group == null) return true;
  return group.offset === state.messages.length;
}
