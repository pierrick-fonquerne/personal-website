/**
 * ordering-idempotency.ts
 *
 * Pure engine for the OrderingIdempotencyLab component.
 *
 * Models how two broker-side guarantees (ordering replay + deduplication)
 * interact when a single order's events are delivered out of order and with
 * a duplicate, as an at-least-once broker would.
 *
 * DELIVERED_SEQUENCE represents the as-delivered stream for one order:
 *   create (m1) -> ship (m3) -> pay (m2) -> pay (m2, duplicate)
 * The causal production order is: create (m1) -> pay (m2) -> ship (m3).
 *
 * SETTINGS:
 *   ordering=true  - replay events sorted by production order before processing.
 *   ordering=false - process in delivery order.
 *   dedup=true     - skip any event whose messageId was already applied.
 *   dedup=false    - apply every event unconditionally.
 *
 * The handler is intentionally naive: it does not inspect state before acting.
 * This lets the simulation expose the consequences of missing guarantees.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type EventKind = 'create' | 'pay' | 'ship';

export interface DeliveredEvent {
  readonly kind: EventKind;
  readonly messageId: string;
}

export interface Settings {
  readonly dedup: boolean;
  readonly ordering: boolean;
}

export type StepKind = 'apply' | 'skip-duplicate';

export interface OrderingStep {
  readonly kind: StepKind;
  readonly event: EventKind;
  readonly messageId: string;
  readonly outOfOrder: boolean;
}

export type Verdict = 'correct' | 'duplicate' | 'disordered' | 'corrupt';

export interface Outcome {
  readonly processedOrder: readonly EventKind[];
  readonly steps: readonly OrderingStep[];
  readonly chargeCount: number;
  readonly shippedBeforePaid: boolean;
  readonly finalState: 'created' | 'paid' | 'shipped';
  readonly verdict: Verdict;
}

// ---------------------------------------------------------------------------
// Constant: delivered sequence (at-least-once broker output)
// ---------------------------------------------------------------------------

/**
 * The at-least-once delivery stream for a single order.
 * Production order: create (m1) -> pay (m2) -> ship (m3).
 * Delivered with ship before pay (inversion) and pay duplicated (same messageId).
 */
export const DELIVERED_SEQUENCE: readonly DeliveredEvent[] = [
  { kind: 'create', messageId: 'm1' },
  { kind: 'ship', messageId: 'm3' },
  { kind: 'pay', messageId: 'm2' },
  { kind: 'pay', messageId: 'm2' },
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Production rank for each messageId: lower rank = produced earlier. */
const PRODUCTION_RANK: Readonly<Record<string, number>> = {
  m1: 0,
  m2: 1,
  m3: 2,
};

/**
 * Returns a stable-sorted copy of the delivered sequence in production order.
 * Events with the same messageId keep their relative positions (stable sort).
 */
function sortByProductionOrder(events: readonly DeliveredEvent[]): readonly DeliveredEvent[] {
  return [...events].sort(
    (a, b) => (PRODUCTION_RANK[a.messageId] ?? 0) - (PRODUCTION_RANK[b.messageId] ?? 0),
  );
}

// ---------------------------------------------------------------------------
// Internal mutable state (local to each simulation call)
// ---------------------------------------------------------------------------

interface ProcessingState {
  paid: boolean;
  shipped: boolean;
  chargeCount: number;
  shippedBeforePaid: boolean;
  state: 'created' | 'paid' | 'shipped';
}

function initialState(): ProcessingState {
  return {
    paid: false,
    shipped: false,
    chargeCount: 0,
    shippedBeforePaid: false,
    state: 'created',
  };
}

/**
 * Applies a single event to the processing state (naive handler).
 * Returns true if the event caused shippedBeforePaid (ship applied while not paid).
 */
function applyEvent(event: DeliveredEvent, st: ProcessingState): boolean {
  switch (event.kind) {
    case 'create':
      st.state = 'created';
      return false;
    case 'pay':
      st.chargeCount += 1;
      st.paid = true;
      st.state = 'paid';
      return false;
    case 'ship': {
      const wasDisordered = !st.paid;
      if (wasDisordered) {
        st.shippedBeforePaid = true;
      }
      st.shipped = true;
      st.state = 'shipped';
      return wasDisordered;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pure, deterministic simulation of ordering and idempotency guarantees.
 * Same inputs always produce identical outputs.
 */
export function simulateOrderingIdempotency(settings: Settings): Outcome {
  const sequence = settings.ordering
    ? sortByProductionOrder(DELIVERED_SEQUENCE)
    : DELIVERED_SEQUENCE;

  const st = initialState();
  const steps: OrderingStep[] = [];
  const applied = new Set<string>();

  for (const event of sequence) {
    if (settings.dedup && applied.has(event.messageId)) {
      steps.push({ kind: 'skip-duplicate', event: event.kind, messageId: event.messageId, outOfOrder: false });
      continue;
    }

    const outOfOrder = event.kind === 'ship' ? !st.paid : false;
    applyEvent(event, st);
    applied.add(event.messageId);

    steps.push({ kind: 'apply', event: event.kind, messageId: event.messageId, outOfOrder });
  }

  const processedOrder = steps
    .filter((s) => s.kind === 'apply')
    .map((s) => s.event);

  const hasDuplicate = st.chargeCount >= 2;
  const isDisordered = st.shippedBeforePaid;

  let verdict: Verdict;
  if (hasDuplicate && isDisordered) {
    verdict = 'corrupt';
  } else if (hasDuplicate && !isDisordered) {
    verdict = 'duplicate';
  } else if (!hasDuplicate && isDisordered) {
    verdict = 'disordered';
  } else {
    verdict = 'correct';
  }

  return {
    processedOrder,
    steps,
    chargeCount: st.chargeCount,
    shippedBeforePaid: st.shippedBeforePaid,
    finalState: st.state,
    verdict,
  };
}
