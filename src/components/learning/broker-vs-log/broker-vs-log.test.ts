import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  isCaughtUp,
  queueDepth,
  reduce,
  unreadCount,
  type BrokerLogState,
} from './broker-vs-log';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const empty = (): BrokerLogState => createInitialState();

const withWorkers = (...ids: string[]): BrokerLogState =>
  createInitialState({ workerIds: ids });

const withGroups = (...ids: string[]): BrokerLogState =>
  createInitialState({ groupIds: ids });

const produced = (state: BrokerLogState, ...labels: string[]): BrokerLogState =>
  labels.reduce((s, label) => reduce(s, { type: 'produce', label }), state);

// ---------------------------------------------------------------------------
// produce
// ---------------------------------------------------------------------------

describe('produce', () => {
  it('appends a message with seq 0 for the first produce', () => {
    const s = reduce(empty(), { type: 'produce', label: 'msg-a' });
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]).toMatchObject({ id: 'm0', seq: 0, label: 'msg-a' });
  });

  it('increments seq deterministically (m0, m1, m2)', () => {
    const s = produced(empty(), 'a', 'b', 'c');
    expect(s.messages.map((m) => m.id)).toEqual(['m0', 'm1', 'm2']);
    expect(s.messages.map((m) => m.seq)).toEqual([0, 1, 2]);
  });

  it('also pushes the id onto the queue', () => {
    const s = produced(empty(), 'x', 'y');
    expect(s.queue).toEqual(['m0', 'm1']);
  });

  it('does not use Math.random: same label same id on same position', () => {
    const s1 = reduce(empty(), { type: 'produce', label: 'hello' });
    const s2 = reduce(empty(), { type: 'produce', label: 'hello' });
    expect(s1.messages[0].id).toBe(s2.messages[0].id);
  });
});

// ---------------------------------------------------------------------------
// deliverNext (round-robin)
// ---------------------------------------------------------------------------

describe('deliverNext', () => {
  it('is a no-op when the queue is empty', () => {
    const s = withWorkers('w1');
    const next = reduce(s, { type: 'deliverNext' });
    expect(next).toBe(s); // exact same reference
  });

  it('is a no-op when there are no workers', () => {
    const s = produced(empty(), 'msg');
    const next = reduce(s, { type: 'deliverNext' });
    expect(next).toBe(s);
  });

  it('delivers the head of the queue to the first worker', () => {
    const s0 = produced(withWorkers('w1', 'w2'), 'a');
    const s1 = reduce(s0, { type: 'deliverNext' });
    expect(s1.queue).toHaveLength(0);
    const w1 = s1.workers.find((w) => w.id === 'w1')!;
    expect(w1.handledIds).toContain('m0');
    const w2 = s1.workers.find((w) => w.id === 'w2')!;
    expect(w2.handledIds).toHaveLength(0);
  });

  it('delivers round-robin across 2 workers', () => {
    const s0 = produced(withWorkers('w1', 'w2'), 'a', 'b');
    const s1 = reduce(s0, { type: 'deliverNext' });
    const s2 = reduce(s1, { type: 'deliverNext' });
    const w1 = s2.workers.find((w) => w.id === 'w1')!;
    const w2 = s2.workers.find((w) => w.id === 'w2')!;
    expect(w1.handledIds).toEqual(['m0']);
    expect(w2.handledIds).toEqual(['m1']);
  });

  it('delivers round-robin across 3 workers wrapping correctly', () => {
    const s0 = produced(withWorkers('w1', 'w2', 'w3'), 'a', 'b', 'c', 'd');
    const s1 = reduce(reduce(reduce(reduce(s0,
      { type: 'deliverNext' }),
      { type: 'deliverNext' }),
      { type: 'deliverNext' }),
      { type: 'deliverNext' },
    );
    const w1 = s1.workers.find((w) => w.id === 'w1')!;
    const w2 = s1.workers.find((w) => w.id === 'w2')!;
    const w3 = s1.workers.find((w) => w.id === 'w3')!;
    // round-robin: w1->m0, w2->m1, w3->m2, w1->m3
    expect(w1.handledIds).toEqual(['m0', 'm3']);
    expect(w2.handledIds).toEqual(['m1']);
    expect(w3.handledIds).toEqual(['m2']);
  });

  it('removes the delivered id from the queue but keeps it in messages', () => {
    const s0 = produced(withWorkers('w1'), 'a', 'b');
    const s1 = reduce(s0, { type: 'deliverNext' });
    expect(s1.queue).toEqual(['m1']); // m0 removed from queue
    expect(s1.messages).toHaveLength(2); // log untouched
    expect(s1.messages.map((m) => m.id)).toContain('m0');
  });
});

// ---------------------------------------------------------------------------
// addWorker - late-joiner pedagogic point
// ---------------------------------------------------------------------------

describe('addWorker', () => {
  it('adds a worker with empty handledIds', () => {
    const s = reduce(empty(), { type: 'addWorker', id: 'w-late' });
    expect(s.workers).toHaveLength(1);
    expect(s.workers[0]).toEqual({ id: 'w-late', handledIds: [] });
  });

  it('a late worker added after all messages are delivered receives nothing', () => {
    // produce 2, deliver both to w1, then add w2
    const s0 = produced(withWorkers('w1'), 'a', 'b');
    const s1 = reduce(reduce(s0, { type: 'deliverNext' }), { type: 'deliverNext' });
    expect(s1.queue).toHaveLength(0);
    const s2 = reduce(s1, { type: 'addWorker', id: 'w2' });
    const w2 = s2.workers.find((w) => w.id === 'w2')!;
    expect(w2.handledIds).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// advanceGroup
// ---------------------------------------------------------------------------

describe('advanceGroup', () => {
  it('increments offset by 1 when there are unread messages', () => {
    const s0 = produced(withGroups('g1'), 'a', 'b', 'c');
    const s1 = reduce(s0, { type: 'advanceGroup', id: 'g1' });
    const g1 = s1.groups.find((g) => g.id === 'g1')!;
    expect(g1.offset).toBe(1);
  });

  it('is a no-op when the group is already caught up', () => {
    const s0 = produced(withGroups('g1'), 'a');
    const s1 = reduce(s0, { type: 'advanceGroup', id: 'g1' }); // offset 1 of 1
    const s2 = reduce(s1, { type: 'advanceGroup', id: 'g1' }); // should not advance
    const g1 = s2.groups.find((g) => g.id === 'g1')!;
    expect(g1.offset).toBe(1);
  });

  it('advances only the targeted group, leaving others unchanged', () => {
    const s0 = produced(withGroups('g1', 'g2'), 'a', 'b');
    const s1 = reduce(s0, { type: 'advanceGroup', id: 'g1' });
    const g1 = s1.groups.find((g) => g.id === 'g1')!;
    const g2 = s1.groups.find((g) => g.id === 'g2')!;
    expect(g1.offset).toBe(1);
    expect(g2.offset).toBe(0); // untouched
  });

  it('two groups advance independently', () => {
    const s0 = produced(withGroups('g1', 'g2'), 'a', 'b', 'c');
    const s1 = reduce(reduce(s0,
      { type: 'advanceGroup', id: 'g1' }),
      { type: 'advanceGroup', id: 'g1' },
    );
    const s2 = reduce(s1, { type: 'advanceGroup', id: 'g2' });
    const g1 = s2.groups.find((g) => g.id === 'g1')!;
    const g2 = s2.groups.find((g) => g.id === 'g2')!;
    expect(g1.offset).toBe(2);
    expect(g2.offset).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// addGroup
// ---------------------------------------------------------------------------

describe('addGroup', () => {
  it('adds a group at offset 0 by default', () => {
    const s = reduce(empty(), { type: 'addGroup', id: 'g-new' });
    const g = s.groups.find((g) => g.id === 'g-new')!;
    expect(g.offset).toBe(0);
  });

  it('a group added at offset 0 after N produces has unreadCount === N', () => {
    const s0 = produced(empty(), 'a', 'b', 'c');
    const s1 = reduce(s0, { type: 'addGroup', id: 'g-new' });
    expect(unreadCount(s1, 'g-new')).toBe(3);
  });

  it('respects a custom startOffset', () => {
    const s0 = produced(empty(), 'a', 'b', 'c');
    const s1 = reduce(s0, { type: 'addGroup', id: 'g-mid', startOffset: 2 });
    const g = s1.groups.find((g) => g.id === 'g-mid')!;
    expect(g.offset).toBe(2);
    expect(unreadCount(s1, 'g-mid')).toBe(1);
  });

  it('clamps startOffset to [0, messages.length]', () => {
    const s0 = produced(empty(), 'a');
    const s1 = reduce(s0, { type: 'addGroup', id: 'g-over', startOffset: 999 });
    const g = s1.groups.find((g) => g.id === 'g-over')!;
    expect(g.offset).toBe(1); // clamped to messages.length
  });
});

// ---------------------------------------------------------------------------
// rewindGroup
// ---------------------------------------------------------------------------

describe('rewindGroup', () => {
  it('resets offset to 0 by default, enabling full replay', () => {
    const s0 = produced(withGroups('g1'), 'a', 'b', 'c');
    const s1 = reduce(reduce(reduce(s0,
      { type: 'advanceGroup', id: 'g1' }),
      { type: 'advanceGroup', id: 'g1' }),
      { type: 'advanceGroup', id: 'g1' },
    ); // caught up
    expect(isCaughtUp(s1, 'g1')).toBe(true);
    const s2 = reduce(s1, { type: 'rewindGroup', id: 'g1' });
    const g1 = s2.groups.find((g) => g.id === 'g1')!;
    expect(g1.offset).toBe(0);
    expect(unreadCount(s2, 'g1')).toBe(3);
  });

  it('accepts a custom toOffset', () => {
    const s0 = produced(withGroups('g1'), 'a', 'b', 'c');
    const s1 = reduce(s0, { type: 'rewindGroup', id: 'g1', toOffset: 1 });
    const g1 = s1.groups.find((g) => g.id === 'g1')!;
    expect(g1.offset).toBe(1);
  });

  it('clamps toOffset to [0, messages.length]', () => {
    const s0 = produced(withGroups('g1'), 'a', 'b');
    const s1 = reduce(s0, { type: 'rewindGroup', id: 'g1', toOffset: -5 });
    const g1 = s1.groups.find((g) => g.id === 'g1')!;
    expect(g1.offset).toBe(0);
  });

  it('only rewinds the targeted group', () => {
    const s0 = produced(withGroups('g1', 'g2'), 'a', 'b');
    const s1 = reduce(reduce(s0,
      { type: 'advanceGroup', id: 'g2' }),
      { type: 'advanceGroup', id: 'g2' },
    ); // g2 at offset 2
    const s2 = reduce(s1, { type: 'rewindGroup', id: 'g1' });
    const g2 = s2.groups.find((g) => g.id === 'g2')!;
    expect(g2.offset).toBe(2); // g2 untouched
  });
});

// ---------------------------------------------------------------------------
// Invariant: messages array never shrinks
// ---------------------------------------------------------------------------

describe('log immutability invariant', () => {
  it('deliverNext does not shrink messages', () => {
    const s0 = produced(withWorkers('w1'), 'a', 'b', 'c');
    const before = s0.messages.length;
    const s1 = reduce(reduce(reduce(s0,
      { type: 'deliverNext' }),
      { type: 'deliverNext' }),
      { type: 'deliverNext' },
    );
    expect(s1.messages.length).toBe(before);
    expect(s1.queue).toHaveLength(0);
  });

  it('multiple produces only grow messages, never shrink it', () => {
    let s = empty();
    for (let i = 0; i < 5; i++) {
      s = reduce(s, { type: 'produce', label: `msg-${i}` });
      expect(s.messages.length).toBe(i + 1);
    }
  });
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

describe('queueDepth', () => {
  it('returns 0 on empty state', () => {
    expect(queueDepth(empty())).toBe(0);
  });

  it('equals the number of undelivered messages', () => {
    const s0 = produced(withWorkers('w1'), 'a', 'b', 'c');
    expect(queueDepth(s0)).toBe(3);
    const s1 = reduce(s0, { type: 'deliverNext' });
    expect(queueDepth(s1)).toBe(2);
  });
});

describe('unreadCount', () => {
  it('returns 0 for unknown group id', () => {
    expect(unreadCount(empty(), 'ghost')).toBe(0);
  });

  it('equals messages.length - offset', () => {
    const s0 = produced(withGroups('g1'), 'a', 'b', 'c');
    expect(unreadCount(s0, 'g1')).toBe(3);
    const s1 = reduce(s0, { type: 'advanceGroup', id: 'g1' });
    expect(unreadCount(s1, 'g1')).toBe(2);
  });
});

describe('isCaughtUp', () => {
  it('returns true for unknown group id (conservative default)', () => {
    expect(isCaughtUp(empty(), 'ghost')).toBe(true);
  });

  it('returns true on empty log', () => {
    const s = withGroups('g1');
    expect(isCaughtUp(s, 'g1')).toBe(true);
  });

  it('returns false when messages exist and group has not advanced', () => {
    const s = produced(withGroups('g1'), 'a');
    expect(isCaughtUp(s, 'g1')).toBe(false);
  });

  it('returns true after advancing through all messages', () => {
    const s0 = produced(withGroups('g1'), 'a', 'b');
    const s1 = reduce(reduce(s0,
      { type: 'advanceGroup', id: 'g1' }),
      { type: 'advanceGroup', id: 'g1' },
    );
    expect(isCaughtUp(s1, 'g1')).toBe(true);
  });
});
