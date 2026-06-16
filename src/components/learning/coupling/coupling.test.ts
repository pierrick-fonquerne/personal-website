import { describe, expect, it } from 'vitest';
import {
  evaluateCoupling,
  ENQUEUE_MS,
  type Consumer,
  type CouplingMode,
} from './coupling';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const healthy = (id: string, latencyMs: number): Consumer => ({
  id,
  label: id,
  latencyMs,
  isHealthy: true,
});

const down = (id: string, latencyMs: number): Consumer => ({
  id,
  label: id,
  latencyMs,
  isHealthy: false,
});

const allHealthy: readonly Consumer[] = [
  healthy('payment', 50),
  healthy('stock', 30),
  healthy('shipping', 20),
  healthy('email', 10),
  healthy('loyalty', 15),
];

// ---------------------------------------------------------------------------
// SYNC
// ---------------------------------------------------------------------------

describe('evaluateCoupling - sync mode', () => {
  it('empty consumer list returns zero blocking time and success', () => {
    const result = evaluateCoupling('sync', []);
    expect(result.mode).toBe<CouplingMode>('sync');
    expect(result.callerBlockingMs).toBe(0);
    expect(result.callerSucceeds).toBe(true);
    expect(result.processed).toEqual([]);
    expect(result.pending).toEqual([]);
    expect(result.blockedBy).toEqual([]);
  });

  it('all healthy: blocks for the sum of all latencies', () => {
    const result = evaluateCoupling('sync', allHealthy);
    const total = 50 + 30 + 20 + 10 + 15;
    expect(result.callerBlockingMs).toBe(total);
    expect(result.callerSucceeds).toBe(true);
    expect(result.processed).toEqual(['payment', 'stock', 'shipping', 'email', 'loyalty']);
    expect(result.pending).toEqual([]);
    expect(result.blockedBy).toEqual([]);
  });

  it('first consumer is down: chain fails immediately, nothing processed', () => {
    const consumers: readonly Consumer[] = [
      down('payment', 50),
      healthy('stock', 30),
      healthy('shipping', 20),
    ];
    const result = evaluateCoupling('sync', consumers);
    expect(result.callerSucceeds).toBe(false);
    expect(result.blockedBy).toEqual(['payment']);
    expect(result.processed).toEqual([]);
    expect(result.callerBlockingMs).toBe(0);
    expect(result.pending).toEqual([]);
  });

  it('last consumer is down: processes all before it then fails', () => {
    const consumers: readonly Consumer[] = [
      healthy('payment', 50),
      healthy('stock', 30),
      down('shipping', 20),
    ];
    const result = evaluateCoupling('sync', consumers);
    expect(result.callerSucceeds).toBe(false);
    expect(result.blockedBy).toEqual(['shipping']);
    expect(result.processed).toEqual(['payment', 'stock']);
    expect(result.callerBlockingMs).toBe(50 + 30);
    expect(result.pending).toEqual([]);
  });

  it('middle consumer is down: stops at failure, ignores subsequent consumers', () => {
    const consumers: readonly Consumer[] = [
      healthy('payment', 50),
      down('stock', 30),
      healthy('shipping', 20),
      healthy('email', 10),
    ];
    const result = evaluateCoupling('sync', consumers);
    expect(result.callerSucceeds).toBe(false);
    expect(result.blockedBy).toEqual(['stock']);
    expect(result.processed).toEqual(['payment']);
    expect(result.callerBlockingMs).toBe(50);
    expect(result.pending).toEqual([]);
  });

  it('all consumers are down: fails on the first, nothing processed', () => {
    const consumers: readonly Consumer[] = [
      down('payment', 50),
      down('stock', 30),
    ];
    const result = evaluateCoupling('sync', consumers);
    expect(result.callerSucceeds).toBe(false);
    expect(result.blockedBy).toEqual(['payment']);
    expect(result.processed).toEqual([]);
    expect(result.callerBlockingMs).toBe(0);
  });

  it('single healthy consumer: processes it, blocking equals its latency', () => {
    const result = evaluateCoupling('sync', [healthy('payment', 80)]);
    expect(result.callerSucceeds).toBe(true);
    expect(result.callerBlockingMs).toBe(80);
    expect(result.processed).toEqual(['payment']);
  });
});

// ---------------------------------------------------------------------------
// ASYNC
// ---------------------------------------------------------------------------

describe('evaluateCoupling - async mode', () => {
  it('empty consumer list: caller blocks only for enqueue cost and succeeds', () => {
    const result = evaluateCoupling('async', []);
    expect(result.mode).toBe<CouplingMode>('async');
    expect(result.callerBlockingMs).toBe(ENQUEUE_MS);
    expect(result.callerSucceeds).toBe(true);
    expect(result.processed).toEqual([]);
    expect(result.pending).toEqual([]);
    expect(result.blockedBy).toEqual([]);
  });

  it('all healthy: caller blocks only for enqueue cost, all consumers processed', () => {
    const result = evaluateCoupling('async', allHealthy);
    expect(result.callerBlockingMs).toBe(ENQUEUE_MS);
    expect(result.callerSucceeds).toBe(true);
    expect(result.processed).toEqual(['payment', 'stock', 'shipping', 'email', 'loyalty']);
    expect(result.pending).toEqual([]);
    expect(result.blockedBy).toEqual([]);
  });

  it('one down: caller still succeeds, down consumer lands in pending', () => {
    const consumers: readonly Consumer[] = [
      healthy('payment', 50),
      down('stock', 30),
      healthy('shipping', 20),
    ];
    const result = evaluateCoupling('async', consumers);
    expect(result.callerSucceeds).toBe(true);
    expect(result.callerBlockingMs).toBe(ENQUEUE_MS);
    expect(result.processed).toEqual(['payment', 'shipping']);
    expect(result.pending).toEqual(['stock']);
    expect(result.blockedBy).toEqual([]);
  });

  it('all down: caller still succeeds, all consumers pending', () => {
    const consumers: readonly Consumer[] = [
      down('payment', 50),
      down('stock', 30),
    ];
    const result = evaluateCoupling('async', consumers);
    expect(result.callerSucceeds).toBe(true);
    expect(result.callerBlockingMs).toBe(ENQUEUE_MS);
    expect(result.processed).toEqual([]);
    expect(result.pending).toEqual(['payment', 'stock']);
    expect(result.blockedBy).toEqual([]);
  });

  it('custom enqueueMs overrides the default constant', () => {
    const result = evaluateCoupling('async', [healthy('payment', 50)], 12);
    expect(result.callerBlockingMs).toBe(12);
  });
});
