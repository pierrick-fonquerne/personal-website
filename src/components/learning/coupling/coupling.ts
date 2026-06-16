/**
 * Pure engine for the CouplingPlayground interactive component.
 *
 * Models two dispatch strategies for a caller that must notify multiple
 * downstream consumers (e.g. an order service notifying payment, stock,
 * shipping, email, and loyalty subsystems):
 *
 * - sync: the caller invokes consumers sequentially, in order. A single
 *   unhealthy consumer breaks the entire chain and the caller fails.
 * - async: the caller publishes a message to a broker queue and returns
 *   immediately. Unhealthy consumers receive their message later (pending);
 *   the caller always succeeds as long as the broker is available.
 */

/** Dispatch strategy: direct synchronous call vs. message-based async. */
export type CouplingMode = 'sync' | 'async';

/** A downstream consumer that the order service must notify. */
export interface Consumer {
  readonly id: string;
  readonly label: string;
  /** Processing time of this consumer, in milliseconds. */
  readonly latencyMs: number;
  /** False means the consumer is down or erroring. */
  readonly isHealthy: boolean;
}

/** Full outcome of one dispatch round. */
export interface CouplingOutcome {
  readonly mode: CouplingMode;
  /** How long the caller (the "Pay" click) stays blocked. */
  readonly callerBlockingMs: number;
  /** Whether the user-facing operation succeeds. */
  readonly callerSucceeds: boolean;
  /** Consumer ids that completed their work. */
  readonly processed: readonly string[];
  /** Consumer ids whose message waits in the queue (async, unhealthy). */
  readonly pending: readonly string[];
  /** Consumer ids that broke the synchronous chain. */
  readonly blockedBy: readonly string[];
}

/** Near-constant cost of publishing/enqueuing one message. */
export const ENQUEUE_MS = 5;

/**
 * Evaluates the outcome of dispatching to a list of consumers under a given
 * coupling mode.
 *
 * @param mode - 'sync' for sequential direct calls, 'async' for message queue.
 * @param consumers - Ordered list of downstream consumers.
 * @param enqueueMs - Publish cost used in async mode (defaults to ENQUEUE_MS).
 */
export function evaluateCoupling(
  mode: CouplingMode,
  consumers: readonly Consumer[],
  enqueueMs: number = ENQUEUE_MS,
): CouplingOutcome {
  if (mode === 'sync') {
    return evaluateSync(consumers);
  }
  return evaluateAsync(consumers, enqueueMs);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function evaluateSync(consumers: readonly Consumer[]): CouplingOutcome {
  const processed: string[] = [];
  let callerBlockingMs = 0;

  for (const consumer of consumers) {
    if (!consumer.isHealthy) {
      return {
        mode: 'sync',
        callerBlockingMs,
        callerSucceeds: false,
        processed,
        pending: [],
        blockedBy: [consumer.id],
      };
    }
    processed.push(consumer.id);
    callerBlockingMs += consumer.latencyMs;
  }

  return {
    mode: 'sync',
    callerBlockingMs,
    callerSucceeds: true,
    processed,
    pending: [],
    blockedBy: [],
  };
}

function evaluateAsync(consumers: readonly Consumer[], enqueueMs: number): CouplingOutcome {
  const processed: string[] = [];
  const pending: string[] = [];

  for (const consumer of consumers) {
    if (consumer.isHealthy) {
      processed.push(consumer.id);
    } else {
      pending.push(consumer.id);
    }
  }

  return {
    mode: 'async',
    callerBlockingMs: enqueueMs,
    callerSucceeds: true,
    processed,
    pending,
    blockedBy: [],
  };
}
