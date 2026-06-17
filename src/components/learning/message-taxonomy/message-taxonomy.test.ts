import { describe, expect, it } from 'vitest';
import {
  classifyByAxes,
  familyOf,
  scoreAssignments,
  type MessageFamily,
  type TaxonomyMessage,
} from './message-taxonomy';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const message = (
  id: string,
  isBroadcast: boolean,
  mutatesState: boolean,
): TaxonomyMessage => ({
  id,
  isBroadcast,
  mutatesState,
});

const catalog: readonly TaxonomyMessage[] = [
  message('charge-payment', false, true), // command
  message('order-total', false, false), // query
  message('order-placed', true, false), // event
  message('cancel-order', false, true), // command
  message('stock-depleted', true, true), // event (broadcast wins)
];

// ---------------------------------------------------------------------------
// classifyByAxes
// ---------------------------------------------------------------------------

describe('classifyByAxes', () => {
  it('command: point to point and mutating', () => {
    expect(classifyByAxes({ isBroadcast: false, mutatesState: true })).toBe<MessageFamily>(
      'command',
    );
  });

  it('query: point to point and read only', () => {
    expect(classifyByAxes({ isBroadcast: false, mutatesState: false })).toBe<MessageFamily>(
      'query',
    );
  });

  it('event: broadcast and read only is an event', () => {
    expect(classifyByAxes({ isBroadcast: true, mutatesState: false })).toBe<MessageFamily>(
      'event',
    );
  });

  it('event: broadcast and mutating is still an event (broadcast axis wins)', () => {
    expect(classifyByAxes({ isBroadcast: true, mutatesState: true })).toBe<MessageFamily>(
      'event',
    );
  });
});

// ---------------------------------------------------------------------------
// familyOf
// ---------------------------------------------------------------------------

describe('familyOf', () => {
  it('is consistent with classifyByAxes over the catalog', () => {
    for (const item of catalog) {
      expect(familyOf(item)).toBe(
        classifyByAxes({ isBroadcast: item.isBroadcast, mutatesState: item.mutatesState }),
      );
    }
  });

  it('derives the expected family per fixture', () => {
    expect(familyOf(message('a', false, true))).toBe<MessageFamily>('command');
    expect(familyOf(message('b', false, false))).toBe<MessageFamily>('query');
    expect(familyOf(message('c', true, false))).toBe<MessageFamily>('event');
    expect(familyOf(message('d', true, true))).toBe<MessageFamily>('event');
  });
});

// ---------------------------------------------------------------------------
// scoreAssignments
// ---------------------------------------------------------------------------

describe('scoreAssignments', () => {
  it('all correct: full score', () => {
    const assignments: Record<string, MessageFamily | null> = {
      'charge-payment': 'command',
      'order-total': 'query',
      'order-placed': 'event',
      'cancel-order': 'command',
      'stock-depleted': 'event',
    };
    const score = scoreAssignments(catalog, assignments);
    expect(score.total).toBe(5);
    expect(score.correct).toBe(5);
    expect(score.results.every((result) => result.isCorrect)).toBe(true);
  });

  it('all wrong: zero correct', () => {
    const assignments: Record<string, MessageFamily | null> = {
      'charge-payment': 'query',
      'order-total': 'event',
      'order-placed': 'command',
      'cancel-order': 'query',
      'stock-depleted': 'command',
    };
    const score = scoreAssignments(catalog, assignments);
    expect(score.total).toBe(5);
    expect(score.correct).toBe(0);
    expect(score.results.every((result) => !result.isCorrect)).toBe(true);
  });

  it('an unassigned message (null) counts as incorrect', () => {
    const assignments: Record<string, MessageFamily | null> = {
      'charge-payment': 'command',
      'order-total': null,
    };
    const score = scoreAssignments(catalog, assignments);
    const orderTotal = score.results.find((result) => result.id === 'order-total');
    expect(orderTotal?.guess).toBeNull();
    expect(orderTotal?.isCorrect).toBe(false);
  });

  it('a missing key in the map behaves like null and counts as incorrect', () => {
    const score = scoreAssignments(catalog, { 'charge-payment': 'command' });
    const orderPlaced = score.results.find((result) => result.id === 'order-placed');
    expect(orderPlaced?.guess).toBeNull();
    expect(orderPlaced?.isCorrect).toBe(false);
    expect(score.correct).toBe(1);
  });

  it('empty catalog returns a zero score with no results', () => {
    const score = scoreAssignments([], {});
    expect(score).toEqual({ correct: 0, total: 0, results: [] });
  });

  it('results follow the catalog order', () => {
    const score = scoreAssignments(catalog, {});
    expect(score.results.map((result) => result.id)).toEqual([
      'charge-payment',
      'order-total',
      'order-placed',
      'cancel-order',
      'stock-depleted',
    ]);
  });

  it('correct counts only the right subset', () => {
    const assignments: Record<string, MessageFamily | null> = {
      'charge-payment': 'command', // correct
      'order-total': 'query', // correct
      'order-placed': 'command', // wrong
      'cancel-order': null, // wrong
      'stock-depleted': 'event', // correct
    };
    const score = scoreAssignments(catalog, assignments);
    expect(score.correct).toBe(3);
    expect(score.total).toBe(5);
  });
});
