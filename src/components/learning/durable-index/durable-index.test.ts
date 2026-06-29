import { describe, expect, it } from 'vitest';
import {
  planWrite,
  simulateCrash,
  serialize,
  deserialize,
  roundTripLogicalEquals,
  roundTripBytesEqual,
  type IndexState,
} from './durable-index';

// A tiny index : three nodes already on disk, two more inserted in memory.
// "new" extends "old" : same first three nodes, plus two appended. This single
// evolution is replayable by every strategy (full rewrite or incremental append).
const OLD: IndexState = [
  { id: 0, vector: [0.10, 0.20], neighbors: [1, 2] },
  { id: 1, vector: [0.30, 0.40], neighbors: [0, 2] },
  { id: 2, vector: [0.50, 0.60], neighbors: [0, 1] },
];
const NEW: IndexState = [
  { id: 0, vector: [0.10, 0.20], neighbors: [1, 2] },
  { id: 1, vector: [0.30, 0.40], neighbors: [0, 2] },
  { id: 2, vector: [0.50, 0.60], neighbors: [0, 1] },
  { id: 3, vector: [0.70, 0.80], neighbors: [1, 2] },
  { id: 4, vector: [0.90, 0.11], neighbors: [2, 3] },
];

describe('planWrite : the ordered low-level steps a strategy performs', () => {
  it('in-place overwrite writes every block into main, then a final fsync', () => {
    const steps = planWrite('inPlaceOverwrite', OLD, NEW);
    expect(steps).toHaveLength(NEW.length + 1);
    expect(steps.slice(0, NEW.length).every((s) => s.kind === 'writeBlock' && s.target === 'main')).toBe(true);
    expect(steps[steps.length - 1]).toMatchObject({ kind: 'fsync', target: 'main' });
  });

  it('atomic rename writes a temp file, fsyncs it, then renames it over main', () => {
    const steps = planWrite('atomicRename', OLD, NEW);
    expect(steps).toHaveLength(NEW.length + 2);
    expect(steps.slice(0, NEW.length).every((s) => s.kind === 'writeBlock' && s.target === 'temp')).toBe(true);
    expect(steps[NEW.length]).toMatchObject({ kind: 'fsync', target: 'temp' });
    expect(steps[steps.length - 1]).toMatchObject({ kind: 'rename', target: 'main' });
  });

  it('append-only log appends only the delta records, then a final fsync', () => {
    const steps = planWrite('appendOnlyLog', OLD, NEW);
    const delta = NEW.length - OLD.length;
    expect(steps).toHaveLength(delta + 1);
    expect(steps.slice(0, delta).every((s) => s.kind === 'appendRecord' && s.target === 'log')).toBe(true);
    expect(steps[steps.length - 1]).toMatchObject({ kind: 'fsync', target: 'log' });
  });

  it('snapshot writes a full new copy, fsyncs it, then renames it over main', () => {
    const steps = planWrite('snapshot', OLD, NEW);
    expect(steps).toHaveLength(NEW.length + 2);
    expect(steps[NEW.length]).toMatchObject({ kind: 'fsync', target: 'snapshot' });
    expect(steps[steps.length - 1]).toMatchObject({ kind: 'rename', target: 'main' });
  });
});

describe('simulateCrash : in-place overwrite is the only strategy that can tear', () => {
  const total = planWrite('inPlaceOverwrite', OLD, NEW).length;

  it('a crash before any step leaves the old index fully intact', () => {
    const r = simulateCrash('inPlaceOverwrite', OLD, NEW, 0);
    expect(r.status).toBe('oldIntact');
    expect(r.recovered).toEqual(OLD);
    expect(r.isNewDurable).toBe(false);
  });

  it('a crash mid-write corrupts main : a torn mix of old and new blocks', () => {
    const r = simulateCrash('inPlaceOverwrite', OLD, NEW, 2);
    expect(r.status).toBe('corrupted');
    expect(r.recovered).toBeNull();
    expect(r.isNewDurable).toBe(false);
  });

  it('all blocks written but the final fsync missing is still not complete', () => {
    const r = simulateCrash('inPlaceOverwrite', OLD, NEW, NEW.length);
    expect(r.status).toBe('corrupted');
  });

  it('only after the final fsync is the new index intact and durable', () => {
    const r = simulateCrash('inPlaceOverwrite', OLD, NEW, total);
    expect(r.status).toBe('newIntact');
    expect(r.recovered).toEqual(NEW);
    expect(r.isNewDurable).toBe(true);
  });
});

describe('simulateCrash : atomic rename is all-or-nothing, never corrupted', () => {
  const total = planWrite('atomicRename', OLD, NEW).length;

  it('any crash before the rename leaves the old index intact', () => {
    for (let s = 0; s < total; s += 1) {
      const r = simulateCrash('atomicRename', OLD, NEW, s);
      expect(r.status).toBe('oldIntact');
      expect(r.recovered).toEqual(OLD);
    }
  });

  it('after the rename the new index is intact and durable', () => {
    const r = simulateCrash('atomicRename', OLD, NEW, total);
    expect(r.status).toBe('newIntact');
    expect(r.recovered).toEqual(NEW);
    expect(r.isNewDurable).toBe(true);
  });

  it('never reports corruption at any crash point', () => {
    for (let s = 0; s <= total; s += 1) {
      expect(simulateCrash('atomicRename', OLD, NEW, s).status).not.toBe('corrupted');
    }
  });
});

describe('simulateCrash : append-only log recovers a consistent prefix', () => {
  const delta = NEW.length - OLD.length;
  const total = planWrite('appendOnlyLog', OLD, NEW).length;

  it('a crash before any append leaves the old index intact', () => {
    expect(simulateCrash('appendOnlyLog', OLD, NEW, 0).status).toBe('oldIntact');
  });

  it('a crash mid-append yields a stale-but-intact index, never corruption', () => {
    const r = simulateCrash('appendOnlyLog', OLD, NEW, 1);
    expect(r.status).toBe('staleButIntact');
    expect(r.recovered).toEqual(OLD.concat(NEW.slice(OLD.length, OLD.length + 1)));
  });

  it('once every record is appended the new index is intact', () => {
    expect(simulateCrash('appendOnlyLog', OLD, NEW, delta).status).toBe('newIntact');
    expect(simulateCrash('appendOnlyLog', OLD, NEW, total).status).toBe('newIntact');
  });

  it('never reports corruption : a torn tail record is simply truncated on replay', () => {
    for (let s = 0; s <= total; s += 1) {
      expect(simulateCrash('appendOnlyLog', OLD, NEW, s).status).not.toBe('corrupted');
    }
  });
});

describe('simulateCrash : snapshot publishes atomically like a full-copy rename', () => {
  const total = planWrite('snapshot', OLD, NEW).length;

  it('any crash before the rename keeps the previous snapshot intact', () => {
    expect(simulateCrash('snapshot', OLD, NEW, total - 1).status).toBe('oldIntact');
  });

  it('after the swap the new snapshot is intact', () => {
    expect(simulateCrash('snapshot', OLD, NEW, total).status).toBe('newIntact');
  });

  it('never reports corruption', () => {
    for (let s = 0; s <= total; s += 1) {
      expect(simulateCrash('snapshot', OLD, NEW, s).status).not.toBe('corrupted');
    }
  });
});

describe('serialize / deserialize are exact inverses in the canonical case', () => {
  it('a round trip reproduces the state value for value', () => {
    expect(deserialize(serialize(NEW))).toEqual(NEW);
  });

  it('canonical serialization sorts neighbors ascending and is stable', () => {
    const scrambled: IndexState = [
      { id: 0, vector: [0.1, 0.2], neighbors: [2, 1] },
    ];
    const canonical: IndexState = [
      { id: 0, vector: [0.1, 0.2], neighbors: [1, 2] },
    ];
    expect(serialize(scrambled)).toBe(serialize(canonical));
  });
});

describe('the round-trip oracle : a logical check is blind where the byte oracle sees', () => {
  it('with no bug, both the logical check and the byte oracle pass', () => {
    expect(roundTripLogicalEquals(NEW)).toBe(true);
    expect(roundTripBytesEqual(NEW)).toBe(true);
  });

  it('lossy float rounding is caught by BOTH oracles : the values truly change', () => {
    expect(roundTripLogicalEquals(NEW, { lossyFloat: true })).toBe(false);
    expect(roundTripBytesEqual(NEW, { lossyFloat: true })).toBe(false);
  });

  it('a non-deterministic neighbor order fools the logical check but not the byte oracle', () => {
    // Logically the same nodes and neighbor sets : the logical check stays green.
    expect(roundTripLogicalEquals(NEW, { nonDeterministicOrder: true })).toBe(true);
    // But the bytes no longer match the canonical reference : the oracle fires.
    expect(roundTripBytesEqual(NEW, { nonDeterministicOrder: true })).toBe(false);
  });
});
