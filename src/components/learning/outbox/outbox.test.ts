/**
 * outbox.test.ts
 *
 * TDD tests for the outbox pattern engine.
 * All 4 scenario cells from the spec are covered,
 * plus step sequence assertions, atomicity guarantees,
 * a cross-mode consistency comparison, and determinism.
 */

import { describe, expect, it } from 'vitest';
import { simulateOutbox, type Mode, type CrashPoint } from './outbox';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function kinds(mode: Mode, crash: CrashPoint): string[] {
  return simulateOutbox(mode, crash).steps.map((s) => s.kind);
}

// ---------------------------------------------------------------------------
// dual-write + none
// ---------------------------------------------------------------------------

describe('dual-write + none', () => {
  it('dbHasOrder true, brokerHasMessage true', () => {
    const outcome = simulateOutbox('dual-write', 'none');
    expect(outcome.dbHasOrder).toBe(true);
    expect(outcome.brokerHasMessage).toBe(true);
  });

  it('consistent true, eventuallyDelivered true', () => {
    const outcome = simulateOutbox('dual-write', 'none');
    expect(outcome.consistent).toBe(true);
    expect(outcome.eventuallyDelivered).toBe(true);
  });

  it('verdict consistent-by-luck', () => {
    expect(simulateOutbox('dual-write', 'none').verdict).toBe('consistent-by-luck');
  });

  it('steps sequence [commit-db, publish]', () => {
    expect(kinds('dual-write', 'none')).toEqual(['commit-db', 'publish']);
  });

  it('no step has atomic === true in dual-write mode', () => {
    const { steps } = simulateOutbox('dual-write', 'none');
    expect(steps.every((s) => s.atomic === false)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// dual-write + mid
// ---------------------------------------------------------------------------

describe('dual-write + mid', () => {
  it('dbHasOrder true, brokerHasMessage false', () => {
    const outcome = simulateOutbox('dual-write', 'mid');
    expect(outcome.dbHasOrder).toBe(true);
    expect(outcome.brokerHasMessage).toBe(false);
  });

  it('consistent false, eventuallyDelivered false', () => {
    const outcome = simulateOutbox('dual-write', 'mid');
    expect(outcome.consistent).toBe(false);
    expect(outcome.eventuallyDelivered).toBe(false);
  });

  it('verdict inconsistent-lost', () => {
    expect(simulateOutbox('dual-write', 'mid').verdict).toBe('inconsistent-lost');
  });

  it('steps sequence [commit-db, crash]', () => {
    expect(kinds('dual-write', 'mid')).toEqual(['commit-db', 'crash']);
  });

  it('no step has atomic === true in dual-write mode', () => {
    const { steps } = simulateOutbox('dual-write', 'mid');
    expect(steps.every((s) => s.atomic === false)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// outbox + none
// ---------------------------------------------------------------------------

describe('outbox + none', () => {
  it('dbHasOrder true, brokerHasMessage true', () => {
    const outcome = simulateOutbox('outbox', 'none');
    expect(outcome.dbHasOrder).toBe(true);
    expect(outcome.brokerHasMessage).toBe(true);
  });

  it('consistent true, eventuallyDelivered true', () => {
    const outcome = simulateOutbox('outbox', 'none');
    expect(outcome.consistent).toBe(true);
    expect(outcome.eventuallyDelivered).toBe(true);
  });

  it('verdict consistent', () => {
    expect(simulateOutbox('outbox', 'none').verdict).toBe('consistent');
  });

  it('steps sequence [commit-db, insert-outbox, claim, publish, mark-sent]', () => {
    expect(kinds('outbox', 'none')).toEqual([
      'commit-db',
      'insert-outbox',
      'claim',
      'publish',
      'mark-sent',
    ]);
  });

  it('commit-db and insert-outbox have atomic === true', () => {
    const { steps } = simulateOutbox('outbox', 'none');
    const commitDb = steps.find((s) => s.kind === 'commit-db');
    const insertOutbox = steps.find((s) => s.kind === 'insert-outbox');
    expect(commitDb?.atomic).toBe(true);
    expect(insertOutbox?.atomic).toBe(true);
  });

  it('claim, publish, mark-sent have atomic === false', () => {
    const { steps } = simulateOutbox('outbox', 'none');
    const relay = steps.filter((s) => ['claim', 'publish', 'mark-sent'].includes(s.kind));
    expect(relay.every((s) => s.atomic === false)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// outbox + mid
// ---------------------------------------------------------------------------

describe('outbox + mid', () => {
  it('dbHasOrder true, brokerHasMessage true', () => {
    const outcome = simulateOutbox('outbox', 'mid');
    expect(outcome.dbHasOrder).toBe(true);
    expect(outcome.brokerHasMessage).toBe(true);
  });

  it('consistent true, eventuallyDelivered true', () => {
    const outcome = simulateOutbox('outbox', 'mid');
    expect(outcome.consistent).toBe(true);
    expect(outcome.eventuallyDelivered).toBe(true);
  });

  it('verdict consistent-eventual', () => {
    expect(simulateOutbox('outbox', 'mid').verdict).toBe('consistent-eventual');
  });

  it('steps sequence [commit-db, insert-outbox, crash, recover-relay, claim, publish, mark-sent]', () => {
    expect(kinds('outbox', 'mid')).toEqual([
      'commit-db',
      'insert-outbox',
      'crash',
      'recover-relay',
      'claim',
      'publish',
      'mark-sent',
    ]);
  });

  it('contains a recover-relay step', () => {
    const { steps } = simulateOutbox('outbox', 'mid');
    expect(steps.some((s) => s.kind === 'recover-relay')).toBe(true);
  });

  it('commit-db and insert-outbox have atomic === true', () => {
    const { steps } = simulateOutbox('outbox', 'mid');
    const commitDb = steps.find((s) => s.kind === 'commit-db');
    const insertOutbox = steps.find((s) => s.kind === 'insert-outbox');
    expect(commitDb?.atomic).toBe(true);
    expect(insertOutbox?.atomic).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cross-mode pedagogical comparison: same crash point, different resilience
// ---------------------------------------------------------------------------

describe('cross-mode comparison under crash mid', () => {
  it('dual-write ends inconsistent while outbox ends consistent for the same mid crash', () => {
    const dualWrite = simulateOutbox('dual-write', 'mid');
    const outbox = simulateOutbox('outbox', 'mid');

    expect(dualWrite.consistent).toBe(false);
    expect(dualWrite.brokerHasMessage).toBe(false);
    expect(dualWrite.verdict).toBe('inconsistent-lost');

    expect(outbox.consistent).toBe(true);
    expect(outbox.brokerHasMessage).toBe(true);
    expect(outbox.verdict).toBe('consistent-eventual');
  });
});

// ---------------------------------------------------------------------------
// Determinism: pure function, same inputs produce identical outputs
// ---------------------------------------------------------------------------

describe('determinism', () => {
  const cases: Array<[Mode, CrashPoint]> = [
    ['dual-write', 'none'],
    ['dual-write', 'mid'],
    ['outbox', 'none'],
    ['outbox', 'mid'],
  ];

  for (const [mode, crash] of cases) {
    it(`simulateOutbox('${mode}', '${crash}') is pure`, () => {
      const a = simulateOutbox(mode, crash);
      const b = simulateOutbox(mode, crash);
      expect(a).toEqual(b);
    });
  }
});
