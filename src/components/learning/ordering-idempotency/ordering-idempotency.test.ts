/**
 * ordering-idempotency.test.ts
 *
 * TDD tests for the OrderingIdempotencyLab engine.
 * Covers the 4 oracle cases (dedup x ordering), DELIVERED_SEQUENCE shape,
 * determinism, skip-duplicate step presence, and ordering-sort guarantee.
 */

import { describe, expect, it } from 'vitest';
import {
  DELIVERED_SEQUENCE,
  simulateOrderingIdempotency,
  type Settings,
} from './ordering-idempotency';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function settings(dedup: boolean, ordering: boolean): Settings {
  return { dedup, ordering };
}

// ---------------------------------------------------------------------------
// DELIVERED_SEQUENCE shape
// ---------------------------------------------------------------------------

describe('DELIVERED_SEQUENCE', () => {
  it('has exactly 4 elements', () => {
    expect(DELIVERED_SEQUENCE).toHaveLength(4);
  });

  it('first event is create m1', () => {
    expect(DELIVERED_SEQUENCE[0]).toEqual({ kind: 'create', messageId: 'm1' });
  });

  it('second event is ship m3 (out-of-order delivery)', () => {
    expect(DELIVERED_SEQUENCE[1]).toEqual({ kind: 'ship', messageId: 'm3' });
  });

  it('third event is pay m2', () => {
    expect(DELIVERED_SEQUENCE[2]).toEqual({ kind: 'pay', messageId: 'm2' });
  });

  it('fourth event is pay m2 again (duplicate, same messageId)', () => {
    expect(DELIVERED_SEQUENCE[3]).toEqual({ kind: 'pay', messageId: 'm2' });
  });

  it('the two pay events share the same messageId m2', () => {
    const pays = DELIVERED_SEQUENCE.filter((e) => e.kind === 'pay');
    expect(pays).toHaveLength(2);
    expect(pays[0].messageId).toBe('m2');
    expect(pays[1].messageId).toBe('m2');
  });
});

// ---------------------------------------------------------------------------
// Oracle case 1: dedup=false, ordering=false
// Delivered as-is: create, ship, pay, pay
// ---------------------------------------------------------------------------

describe('dedup=false, ordering=false', () => {
  it('processedOrder is [create, ship, pay, pay]', () => {
    const outcome = simulateOrderingIdempotency(settings(false, false));
    expect(outcome.processedOrder).toEqual(['create', 'ship', 'pay', 'pay']);
  });

  it('chargeCount is 2', () => {
    const outcome = simulateOrderingIdempotency(settings(false, false));
    expect(outcome.chargeCount).toBe(2);
  });

  it('shippedBeforePaid is true', () => {
    const outcome = simulateOrderingIdempotency(settings(false, false));
    expect(outcome.shippedBeforePaid).toBe(true);
  });

  it('finalState is paid', () => {
    const outcome = simulateOrderingIdempotency(settings(false, false));
    expect(outcome.finalState).toBe('paid');
  });

  it('verdict is corrupt', () => {
    const outcome = simulateOrderingIdempotency(settings(false, false));
    expect(outcome.verdict).toBe('corrupt');
  });

  it('steps has 4 apply entries and no skip-duplicate', () => {
    const { steps } = simulateOrderingIdempotency(settings(false, false));
    expect(steps.filter((s) => s.kind === 'apply')).toHaveLength(4);
    expect(steps.filter((s) => s.kind === 'skip-duplicate')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Oracle case 2: dedup=true, ordering=false
// Delivered as-is: create, ship, pay, pay(dup)
// ---------------------------------------------------------------------------

describe('dedup=true, ordering=false', () => {
  it('processedOrder is [create, ship, pay]', () => {
    const outcome = simulateOrderingIdempotency(settings(true, false));
    expect(outcome.processedOrder).toEqual(['create', 'ship', 'pay']);
  });

  it('chargeCount is 1', () => {
    const outcome = simulateOrderingIdempotency(settings(true, false));
    expect(outcome.chargeCount).toBe(1);
  });

  it('shippedBeforePaid is true', () => {
    const outcome = simulateOrderingIdempotency(settings(true, false));
    expect(outcome.shippedBeforePaid).toBe(true);
  });

  it('finalState is paid', () => {
    const outcome = simulateOrderingIdempotency(settings(true, false));
    expect(outcome.finalState).toBe('paid');
  });

  it('verdict is disordered', () => {
    const outcome = simulateOrderingIdempotency(settings(true, false));
    expect(outcome.verdict).toBe('disordered');
  });

  it('has exactly one skip-duplicate step for messageId m2', () => {
    const { steps } = simulateOrderingIdempotency(settings(true, false));
    const skips = steps.filter((s) => s.kind === 'skip-duplicate');
    expect(skips).toHaveLength(1);
    expect(skips[0].messageId).toBe('m2');
  });
});

// ---------------------------------------------------------------------------
// Oracle case 3: dedup=false, ordering=true
// Sorted by production order: create, pay, pay(dup), ship
// ---------------------------------------------------------------------------

describe('dedup=false, ordering=true', () => {
  it('processedOrder is [create, pay, pay, ship]', () => {
    const outcome = simulateOrderingIdempotency(settings(false, true));
    expect(outcome.processedOrder).toEqual(['create', 'pay', 'pay', 'ship']);
  });

  it('chargeCount is 2', () => {
    const outcome = simulateOrderingIdempotency(settings(false, true));
    expect(outcome.chargeCount).toBe(2);
  });

  it('shippedBeforePaid is false', () => {
    const outcome = simulateOrderingIdempotency(settings(false, true));
    expect(outcome.shippedBeforePaid).toBe(false);
  });

  it('finalState is shipped', () => {
    const outcome = simulateOrderingIdempotency(settings(false, true));
    expect(outcome.finalState).toBe('shipped');
  });

  it('verdict is duplicate', () => {
    const outcome = simulateOrderingIdempotency(settings(false, true));
    expect(outcome.verdict).toBe('duplicate');
  });

  it('sorted sequence has the two pay events grouped before ship', () => {
    const { steps } = simulateOrderingIdempotency(settings(false, true));
    const applied = steps.filter((s) => s.kind === 'apply');
    const kinds = applied.map((s) => s.event);
    expect(kinds.indexOf('ship')).toBeGreaterThan(kinds.lastIndexOf('pay'));
  });
});

// ---------------------------------------------------------------------------
// Oracle case 4: dedup=true, ordering=true
// Sorted: create, pay, pay(dup skipped), ship
// ---------------------------------------------------------------------------

describe('dedup=true, ordering=true', () => {
  it('processedOrder is [create, pay, ship]', () => {
    const outcome = simulateOrderingIdempotency(settings(true, true));
    expect(outcome.processedOrder).toEqual(['create', 'pay', 'ship']);
  });

  it('chargeCount is 1', () => {
    const outcome = simulateOrderingIdempotency(settings(true, true));
    expect(outcome.chargeCount).toBe(1);
  });

  it('shippedBeforePaid is false', () => {
    const outcome = simulateOrderingIdempotency(settings(true, true));
    expect(outcome.shippedBeforePaid).toBe(false);
  });

  it('finalState is shipped', () => {
    const outcome = simulateOrderingIdempotency(settings(true, true));
    expect(outcome.finalState).toBe('shipped');
  });

  it('verdict is correct', () => {
    const outcome = simulateOrderingIdempotency(settings(true, true));
    expect(outcome.verdict).toBe('correct');
  });

  it('has exactly one skip-duplicate step for messageId m2', () => {
    const { steps } = simulateOrderingIdempotency(settings(true, true));
    const skips = steps.filter((s) => s.kind === 'skip-duplicate');
    expect(skips).toHaveLength(1);
    expect(skips[0].messageId).toBe('m2');
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe('determinism', () => {
  const allSettings: Settings[] = [
    { dedup: false, ordering: false },
    { dedup: true, ordering: false },
    { dedup: false, ordering: true },
    { dedup: true, ordering: true },
  ];

  for (const s of allSettings) {
    it(`same inputs produce same outputs for dedup=${s.dedup} ordering=${s.ordering}`, () => {
      const a = simulateOrderingIdempotency(s);
      const b = simulateOrderingIdempotency(s);
      expect(a).toEqual(b);
    });
  }
});

// ---------------------------------------------------------------------------
// Ordering sort guarantee
// ---------------------------------------------------------------------------

describe('ordering sort guarantee', () => {
  it('with ordering=true the sorted sequence matches production order (m1 < m2 < m3)', () => {
    const { steps } = simulateOrderingIdempotency(settings(false, true));
    const messageIdOrder = steps.map((s) => s.messageId);
    const createIdx = messageIdOrder.indexOf('m1');
    const firstPayIdx = messageIdOrder.indexOf('m2');
    const shipIdx = messageIdOrder.lastIndexOf('m3');
    expect(createIdx).toBeLessThan(firstPayIdx);
    expect(firstPayIdx).toBeLessThan(shipIdx);
  });

  it('with ordering=false ship (m3) appears before pay (m2) in steps', () => {
    const { steps } = simulateOrderingIdempotency(settings(false, false));
    const messageIds = steps.map((s) => s.messageId);
    expect(messageIds.indexOf('m3')).toBeLessThan(messageIds.indexOf('m2'));
  });
});
