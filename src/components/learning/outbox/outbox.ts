/**
 * outbox.ts
 *
 * Pure engine for the OutboxPatternSimulator component.
 *
 * Models the transactional outbox pattern compared to naive dual-write,
 * showing how atomicity of the outbox insert protects consistency
 * even when a crash occurs between the database write and broker publish.
 *
 * DUAL-WRITE (two separate writes, database then broker, no atomicity):
 *   The application commits the order to the database, then publishes
 *   directly to the broker in a separate, non-atomic call.
 *   A crash between the two leaves the database with the order but the
 *   broker without the message: the system is inconsistent.
 *
 * OUTBOX (business state + outbox row in one atomic transaction, relay publishes):
 *   The application commits both the order row and an outbox row inside
 *   a single database transaction. A background relay polls pending outbox
 *   rows and publishes them to the broker, then marks them as sent.
 *   A crash after the atomic commit but before broker publish is harmless:
 *   the relay restarts, finds the pending row, and publishes. Consistency
 *   is guaranteed eventually regardless of when the crash occurs.
 *
 * Crash point:
 *   'none' - no crash, happy path.
 *   'mid'  - crash after durable write(s), before broker receives the message.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type Mode = 'dual-write' | 'outbox';
export type CrashPoint = 'none' | 'mid';

export type StepKind =
  | 'commit-db'
  | 'insert-outbox'
  | 'publish'
  | 'claim'
  | 'mark-sent'
  | 'crash'
  | 'recover-relay';

export interface OutboxStep {
  readonly kind: StepKind;
  readonly atomic: boolean;
}

export type Verdict =
  | 'consistent-by-luck'
  | 'inconsistent-lost'
  | 'consistent'
  | 'consistent-eventual';

export interface Outcome {
  readonly steps: readonly OutboxStep[];
  readonly dbHasOrder: boolean;
  readonly brokerHasMessage: boolean;
  readonly consistent: boolean;
  readonly eventuallyDelivered: boolean;
  readonly verdict: Verdict;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Builds the step sequence for dual-write mode.
 * No atomicity: the database commit and broker publish are independent calls.
 * A crash between them leaves the system in an inconsistent state.
 */
function simulateDualWrite(crash: CrashPoint): readonly OutboxStep[] {
  const steps: OutboxStep[] = [];

  steps.push({ kind: 'commit-db', atomic: false });

  if (crash === 'mid') {
    // Crash occurs after the database commit but before the broker publish.
    // The message is lost: the broker never receives it.
    steps.push({ kind: 'crash', atomic: false });
    return steps;
  }

  // Happy path: publish reaches the broker.
  steps.push({ kind: 'publish', atomic: false });
  return steps;
}

/**
 * Builds the step sequence for outbox mode.
 * The order row and the outbox row are committed atomically in one transaction.
 * A background relay claims pending outbox rows and publishes them.
 * A mid-crash restarts the relay, which recovers the pending row and publishes.
 */
function simulateOutboxMode(crash: CrashPoint): readonly OutboxStep[] {
  const steps: OutboxStep[] = [];

  // Atomic transaction: both writes succeed or neither does.
  steps.push({ kind: 'commit-db', atomic: true });
  steps.push({ kind: 'insert-outbox', atomic: true });

  if (crash === 'mid') {
    // Crash occurs after the atomic commit, before the relay publishes.
    // The outbox row is still pending: the relay recovers on restart.
    steps.push({ kind: 'crash', atomic: false });
    steps.push({ kind: 'recover-relay', atomic: false });
  }

  // Relay (or restarted relay) publishes the pending outbox row.
  steps.push({ kind: 'claim', atomic: false });
  steps.push({ kind: 'publish', atomic: false });
  steps.push({ kind: 'mark-sent', atomic: false });

  return steps;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pure, deterministic simulation of a single order creation scenario.
 * Models whether a database write and a broker publish end up consistent
 * after a crash, depending on whether the outbox pattern is used.
 *
 * Same inputs always produce identical outputs.
 */
export function simulateOutbox(mode: Mode, crash: CrashPoint): Outcome {
  const steps =
    mode === 'dual-write' ? simulateDualWrite(crash) : simulateOutboxMode(crash);

  // The database always has the order if commit-db ran (it always does in both paths).
  const dbHasOrder = steps.some((s) => s.kind === 'commit-db');

  // The broker has the message only if publish was reached.
  const brokerHasMessage = steps.some((s) => s.kind === 'publish');

  // Consistent when both views agree.
  const consistent = dbHasOrder === brokerHasMessage;

  // Eventually delivered reflects the final broker state.
  const eventuallyDelivered = brokerHasMessage;

  let verdict: Verdict;
  if (mode === 'dual-write' && crash === 'none') {
    verdict = 'consistent-by-luck';
  } else if (mode === 'dual-write' && crash === 'mid') {
    verdict = 'inconsistent-lost';
  } else if (mode === 'outbox' && crash === 'none') {
    verdict = 'consistent';
  } else {
    verdict = 'consistent-eventual';
  }

  return { steps, dbHasOrder, brokerHasMessage, consistent, eventuallyDelivered, verdict };
}
