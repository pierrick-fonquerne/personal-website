/**
 * delivery-semantics.test.ts
 *
 * TDD tests for the DeliverySemanticsSimulator engine.
 * All 9 scenario cells from the spec are covered, plus step sequence assertions.
 */

import { describe, expect, it } from 'vitest';
import { simulateDelivery, type DeliveryScenario } from './delivery-semantics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scenario(
  semantic: DeliveryScenario['semantic'],
  crash: DeliveryScenario['crash'],
): DeliveryScenario {
  return { semantic, crash };
}

// ---------------------------------------------------------------------------
// at-most-once
// ---------------------------------------------------------------------------

describe('at-most-once', () => {
  it('none: effectCount 1, deliveryCount 1, acknowledged true, verdict exactly-once', () => {
    const outcome = simulateDelivery(scenario('at-most-once', 'none'));
    expect(outcome.effectCount).toBe(1);
    expect(outcome.deliveryCount).toBe(1);
    expect(outcome.acknowledged).toBe(true);
    expect(outcome.verdict).toBe('exactly-once');
  });

  it('none: steps sequence [deliver#1, ack#1, process#1]', () => {
    const { steps } = simulateDelivery(scenario('at-most-once', 'none'));
    expect(steps).toEqual([
      { kind: 'deliver', attempt: 1 },
      { kind: 'ack', attempt: 1 },
      { kind: 'process', attempt: 1 },
    ]);
  });

  it('before-process: effectCount 0, deliveryCount 1, acknowledged true, verdict lost', () => {
    const outcome = simulateDelivery(scenario('at-most-once', 'before-process'));
    expect(outcome.effectCount).toBe(0);
    expect(outcome.deliveryCount).toBe(1);
    expect(outcome.acknowledged).toBe(true);
    expect(outcome.verdict).toBe('lost');
  });

  it('before-process: steps sequence [deliver#1, ack#1, crash#1, lost#1]', () => {
    const { steps } = simulateDelivery(scenario('at-most-once', 'before-process'));
    expect(steps).toEqual([
      { kind: 'deliver', attempt: 1 },
      { kind: 'ack', attempt: 1 },
      { kind: 'crash', attempt: 1 },
      { kind: 'lost', attempt: 1 },
    ]);
  });

  it('after-process: effectCount 1, deliveryCount 1, acknowledged true, verdict exactly-once', () => {
    const outcome = simulateDelivery(scenario('at-most-once', 'after-process'));
    expect(outcome.effectCount).toBe(1);
    expect(outcome.deliveryCount).toBe(1);
    expect(outcome.acknowledged).toBe(true);
    expect(outcome.verdict).toBe('exactly-once');
  });

  it('after-process: steps sequence [deliver#1, ack#1, process#1, crash#1]', () => {
    const { steps } = simulateDelivery(scenario('at-most-once', 'after-process'));
    expect(steps).toEqual([
      { kind: 'deliver', attempt: 1 },
      { kind: 'ack', attempt: 1 },
      { kind: 'process', attempt: 1 },
      { kind: 'crash', attempt: 1 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// at-least-once
// ---------------------------------------------------------------------------

describe('at-least-once', () => {
  it('none: effectCount 1, deliveryCount 1, acknowledged true, verdict exactly-once', () => {
    const outcome = simulateDelivery(scenario('at-least-once', 'none'));
    expect(outcome.effectCount).toBe(1);
    expect(outcome.deliveryCount).toBe(1);
    expect(outcome.acknowledged).toBe(true);
    expect(outcome.verdict).toBe('exactly-once');
  });

  it('none: steps sequence [deliver#1, process#1, ack#1]', () => {
    const { steps } = simulateDelivery(scenario('at-least-once', 'none'));
    expect(steps).toEqual([
      { kind: 'deliver', attempt: 1 },
      { kind: 'process', attempt: 1 },
      { kind: 'ack', attempt: 1 },
    ]);
  });

  it('before-process: effectCount 1, deliveryCount 2, acknowledged true, verdict exactly-once', () => {
    const outcome = simulateDelivery(scenario('at-least-once', 'before-process'));
    expect(outcome.effectCount).toBe(1);
    expect(outcome.deliveryCount).toBe(2);
    expect(outcome.acknowledged).toBe(true);
    expect(outcome.verdict).toBe('exactly-once');
  });

  it('before-process: steps sequence [deliver#1, crash#1, redeliver#2, process#2, ack#2]', () => {
    const { steps } = simulateDelivery(scenario('at-least-once', 'before-process'));
    expect(steps).toEqual([
      { kind: 'deliver', attempt: 1 },
      { kind: 'crash', attempt: 1 },
      { kind: 'redeliver', attempt: 2 },
      { kind: 'process', attempt: 2 },
      { kind: 'ack', attempt: 2 },
    ]);
  });

  it('after-process: effectCount 2, deliveryCount 2, acknowledged true, verdict duplicate', () => {
    const outcome = simulateDelivery(scenario('at-least-once', 'after-process'));
    expect(outcome.effectCount).toBe(2);
    expect(outcome.deliveryCount).toBe(2);
    expect(outcome.acknowledged).toBe(true);
    expect(outcome.verdict).toBe('duplicate');
  });

  it('after-process: steps sequence [deliver#1, process#1, crash#1, redeliver#2, process#2, ack#2]', () => {
    const { steps } = simulateDelivery(scenario('at-least-once', 'after-process'));
    expect(steps).toEqual([
      { kind: 'deliver', attempt: 1 },
      { kind: 'process', attempt: 1 },
      { kind: 'crash', attempt: 1 },
      { kind: 'redeliver', attempt: 2 },
      { kind: 'process', attempt: 2 },
      { kind: 'ack', attempt: 2 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// effectively-once
// ---------------------------------------------------------------------------

describe('effectively-once', () => {
  it('none: effectCount 1, deliveryCount 1, acknowledged true, verdict exactly-once', () => {
    const outcome = simulateDelivery(scenario('effectively-once', 'none'));
    expect(outcome.effectCount).toBe(1);
    expect(outcome.deliveryCount).toBe(1);
    expect(outcome.acknowledged).toBe(true);
    expect(outcome.verdict).toBe('exactly-once');
  });

  it('none: steps sequence [deliver#1, process#1, ack#1]', () => {
    const { steps } = simulateDelivery(scenario('effectively-once', 'none'));
    expect(steps).toEqual([
      { kind: 'deliver', attempt: 1 },
      { kind: 'process', attempt: 1 },
      { kind: 'ack', attempt: 1 },
    ]);
  });

  it('before-process: effectCount 1, deliveryCount 2, acknowledged true, verdict exactly-once', () => {
    const outcome = simulateDelivery(scenario('effectively-once', 'before-process'));
    expect(outcome.effectCount).toBe(1);
    expect(outcome.deliveryCount).toBe(2);
    expect(outcome.acknowledged).toBe(true);
    expect(outcome.verdict).toBe('exactly-once');
  });

  it('before-process: steps sequence [deliver#1, crash#1, redeliver#2, process#2, ack#2]', () => {
    const { steps } = simulateDelivery(scenario('effectively-once', 'before-process'));
    expect(steps).toEqual([
      { kind: 'deliver', attempt: 1 },
      { kind: 'crash', attempt: 1 },
      { kind: 'redeliver', attempt: 2 },
      { kind: 'process', attempt: 2 },
      { kind: 'ack', attempt: 2 },
    ]);
  });

  it('after-process: effectCount 1, deliveryCount 2, acknowledged true, verdict exactly-once', () => {
    const outcome = simulateDelivery(scenario('effectively-once', 'after-process'));
    expect(outcome.effectCount).toBe(1);
    expect(outcome.deliveryCount).toBe(2);
    expect(outcome.acknowledged).toBe(true);
    expect(outcome.verdict).toBe('exactly-once');
  });

  it('after-process: steps sequence [deliver#1, process#1, crash#1, redeliver#2, skip-duplicate#2, ack#2]', () => {
    const { steps } = simulateDelivery(scenario('effectively-once', 'after-process'));
    expect(steps).toEqual([
      { kind: 'deliver', attempt: 1 },
      { kind: 'process', attempt: 1 },
      { kind: 'crash', attempt: 1 },
      { kind: 'redeliver', attempt: 2 },
      { kind: 'skip-duplicate', attempt: 2 },
      { kind: 'ack', attempt: 2 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Derived fields consistency
// ---------------------------------------------------------------------------

describe('outcome consistency', () => {
  const allScenarios: DeliveryScenario[] = [
    { semantic: 'at-most-once', crash: 'none' },
    { semantic: 'at-most-once', crash: 'before-process' },
    { semantic: 'at-most-once', crash: 'after-process' },
    { semantic: 'at-least-once', crash: 'none' },
    { semantic: 'at-least-once', crash: 'before-process' },
    { semantic: 'at-least-once', crash: 'after-process' },
    { semantic: 'effectively-once', crash: 'none' },
    { semantic: 'effectively-once', crash: 'before-process' },
    { semantic: 'effectively-once', crash: 'after-process' },
  ];

  for (const s of allScenarios) {
    it(`effectCount matches process step count for ${s.semantic}/${s.crash}`, () => {
      const outcome = simulateDelivery(s);
      const processCount = outcome.steps.filter((step) => step.kind === 'process').length;
      expect(outcome.effectCount).toBe(processCount);
    });

    it(`deliveryCount matches deliver+redeliver step count for ${s.semantic}/${s.crash}`, () => {
      const outcome = simulateDelivery(s);
      const deliveryCount = outcome.steps.filter(
        (step) => step.kind === 'deliver' || step.kind === 'redeliver',
      ).length;
      expect(outcome.deliveryCount).toBe(deliveryCount);
    });

    it(`verdict is consistent with effectCount for ${s.semantic}/${s.crash}`, () => {
      const outcome = simulateDelivery(s);
      if (outcome.effectCount === 0) {
        expect(outcome.verdict).toBe('lost');
      } else if (outcome.effectCount >= 2) {
        expect(outcome.verdict).toBe('duplicate');
      } else {
        expect(outcome.verdict).toBe('exactly-once');
      }
    });

    it(`simulateDelivery is pure (same inputs -> same outputs) for ${s.semantic}/${s.crash}`, () => {
      const a = simulateDelivery(s);
      const b = simulateDelivery(s);
      expect(a).toEqual(b);
    });
  }
});
