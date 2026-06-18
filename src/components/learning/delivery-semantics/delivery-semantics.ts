/**
 * delivery-semantics.ts
 *
 * Pure engine for the DeliverySemanticsSimulator component.
 *
 * Models how three acknowledgement strategies interact with worker crashes
 * to produce different delivery outcomes for a single message (e.g. "charge payment").
 *
 * AT-MOST-ONCE:
 *   The broker acks the message on receipt, before the worker processes it.
 *   The broker never redelivers. A crash before processing loses the message.
 *
 * AT-LEAST-ONCE:
 *   The worker acks after successful processing. If the worker crashes before acking,
 *   the broker redelivers. A crash after processing but before acking causes a duplicate.
 *
 * EFFECTIVELY-ONCE:
 *   Like at-least-once, but the processing is idempotent: the worker records a
 *   "seen" marker atomically with the effect. On redelivery, the marker is detected
 *   and processing is skipped (skip-duplicate), then the ack is sent.
 *
 * Crash points:
 *   'none'           - no crash, happy path.
 *   'before-process' - crash after receipt, before the side effect.
 *   'after-process'  - crash after the side effect, before acking.
 *                      (for at-most-once, ack already happened on receipt, so
 *                       no redelivery occurs.)
 *
 * Redelivery rule:
 *   If the message was NOT acked when the worker crashes, the broker redelivers
 *   exactly once. The second attempt runs without a crash (convergence).
 *   If already acked, no redelivery.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type DeliverySemantic = 'at-most-once' | 'at-least-once' | 'effectively-once';
export type CrashPoint = 'none' | 'before-process' | 'after-process';
export type Verdict = 'lost' | 'duplicate' | 'exactly-once';
export type DeliveryStepKind =
  | 'deliver'
  | 'redeliver'
  | 'process'
  | 'skip-duplicate'
  | 'ack'
  | 'crash'
  | 'lost';

export interface DeliveryStep {
  readonly kind: DeliveryStepKind;
  readonly attempt: number;
}

export interface DeliveryScenario {
  readonly semantic: DeliverySemantic;
  readonly crash: CrashPoint;
}

export interface DeliveryOutcome {
  /** Number of times the side effect (charge) was applied = count of 'process' steps. */
  readonly effectCount: number;
  /** Number of (re)deliveries = count of 'deliver' + 'redeliver' steps. */
  readonly deliveryCount: number;
  /** True if the message ended acknowledged/removed from the broker. */
  readonly acknowledged: boolean;
  /** 'lost' if effectCount===0, 'duplicate' if effectCount>=2, else 'exactly-once'. */
  readonly verdict: Verdict;
  readonly steps: readonly DeliveryStep[];
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Builds the step sequence for at-most-once (ack-before-process).
 * The broker acks eagerly on receipt, so it never redelivers.
 */
function simulateAtMostOnce(crash: CrashPoint): readonly DeliveryStep[] {
  const steps: DeliveryStep[] = [];

  // Attempt 1: deliver then ack immediately (eager ack)
  steps.push({ kind: 'deliver', attempt: 1 });
  steps.push({ kind: 'ack', attempt: 1 });

  if (crash === 'before-process') {
    // Worker dies before processing: message is lost (already acked, no redeliver)
    steps.push({ kind: 'crash', attempt: 1 });
    steps.push({ kind: 'lost', attempt: 1 });
    return steps;
  }

  // Process the message (crash=none or crash=after-process)
  steps.push({ kind: 'process', attempt: 1 });

  if (crash === 'after-process') {
    // Crash happens after processing but ack was already done at reception
    steps.push({ kind: 'crash', attempt: 1 });
  }

  return steps;
}

/**
 * Builds the step sequence for at-least-once (ack-after-process).
 * The broker redelivers if the message is not acked after a crash.
 */
function simulateAtLeastOnce(crash: CrashPoint): readonly DeliveryStep[] {
  const steps: DeliveryStep[] = [];

  // Attempt 1: deliver, then process (if no crash before), then ack (if no crash after)
  steps.push({ kind: 'deliver', attempt: 1 });

  if (crash === 'before-process') {
    // Worker crashes before processing: no ack, broker redelivers
    steps.push({ kind: 'crash', attempt: 1 });
    // Attempt 2: redeliver, process, ack (no crash on retry)
    steps.push({ kind: 'redeliver', attempt: 2 });
    steps.push({ kind: 'process', attempt: 2 });
    steps.push({ kind: 'ack', attempt: 2 });
    return steps;
  }

  if (crash === 'after-process') {
    // Worker processes then crashes before acking: broker redelivers
    steps.push({ kind: 'process', attempt: 1 });
    steps.push({ kind: 'crash', attempt: 1 });
    // Attempt 2: redeliver, process again (no idempotency guard), ack
    steps.push({ kind: 'redeliver', attempt: 2 });
    steps.push({ kind: 'process', attempt: 2 });
    steps.push({ kind: 'ack', attempt: 2 });
    return steps;
  }

  // Happy path (crash=none)
  steps.push({ kind: 'process', attempt: 1 });
  steps.push({ kind: 'ack', attempt: 1 });
  return steps;
}

/**
 * Builds the step sequence for effectively-once (at-least-once + idempotent processing).
 * On redelivery, if the effect was already applied, a 'skip-duplicate' is emitted instead.
 */
function simulateEffectivelyOnce(crash: CrashPoint): readonly DeliveryStep[] {
  const steps: DeliveryStep[] = [];

  steps.push({ kind: 'deliver', attempt: 1 });

  if (crash === 'before-process') {
    // Worker crashes before processing: no effect recorded, no ack, broker redelivers
    steps.push({ kind: 'crash', attempt: 1 });
    // Attempt 2: redeliver, no prior effect -> process normally, then ack
    steps.push({ kind: 'redeliver', attempt: 2 });
    steps.push({ kind: 'process', attempt: 2 });
    steps.push({ kind: 'ack', attempt: 2 });
    return steps;
  }

  if (crash === 'after-process') {
    // Worker processes (effect + seen marker committed atomically), then crashes before acking
    steps.push({ kind: 'process', attempt: 1 });
    steps.push({ kind: 'crash', attempt: 1 });
    // Attempt 2: redeliver, seen marker detected -> skip-duplicate (no second effect), ack
    steps.push({ kind: 'redeliver', attempt: 2 });
    steps.push({ kind: 'skip-duplicate', attempt: 2 });
    steps.push({ kind: 'ack', attempt: 2 });
    return steps;
  }

  // Happy path (crash=none)
  steps.push({ kind: 'process', attempt: 1 });
  steps.push({ kind: 'ack', attempt: 1 });
  return steps;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pure, deterministic simulation of a single message delivery scenario.
 * Same inputs always produce identical outputs.
 */
export function simulateDelivery(scenario: DeliveryScenario): DeliveryOutcome {
  let steps: readonly DeliveryStep[];

  switch (scenario.semantic) {
    case 'at-most-once':
      steps = simulateAtMostOnce(scenario.crash);
      break;
    case 'at-least-once':
      steps = simulateAtLeastOnce(scenario.crash);
      break;
    case 'effectively-once':
      steps = simulateEffectivelyOnce(scenario.crash);
      break;
  }

  const effectCount = steps.filter((s) => s.kind === 'process').length;
  const deliveryCount = steps.filter((s) => s.kind === 'deliver' || s.kind === 'redeliver').length;
  const acknowledged = steps.some((s) => s.kind === 'ack');

  let verdict: Verdict;
  if (effectCount === 0) {
    verdict = 'lost';
  } else if (effectCount >= 2) {
    verdict = 'duplicate';
  } else {
    verdict = 'exactly-once';
  }

  return { effectCount, deliveryCount, acknowledged, verdict, steps };
}
