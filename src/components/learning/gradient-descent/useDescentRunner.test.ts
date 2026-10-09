import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDescentRunner } from './useDescentRunner';

const INTERVAL_MILLISECONDS = 400;

function advanceTicks(tickCount: number): void {
  for (let tick = 0; tick < tickCount; tick += 1) {
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MILLISECONDS);
    });
  }
}

function renderRunner(maxIterations = 30, divergenceIteration = Number.POSITIVE_INFINITY) {
  return renderHook(() =>
    useDescentRunner({
      maxIterations,
      isDiverged: (iteration) => iteration >= divergenceIteration,
    }),
  );
}

describe('useDescentRunner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle at iteration 0', () => {
    const { result } = renderRunner();
    expect(result.current.iteration).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isFinished).toBe(false);
  });

  it('advances one iteration every 400 ms while running', () => {
    const { result } = renderRunner();
    act(() => result.current.toggle());
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MILLISECONDS);
    });
    expect(result.current.iteration).toBe(1);
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MILLISECONDS);
    });
    expect(result.current.iteration).toBe(2);
  });

  it('steps manually', () => {
    const { result } = renderRunner();
    act(() => result.current.step());
    expect(result.current.iteration).toBe(1);
  });

  it('pauses when toggled a second time', () => {
    const { result } = renderRunner();
    act(() => result.current.toggle());
    act(() => {
      vi.advanceTimersByTime(INTERVAL_MILLISECONDS);
    });
    act(() => result.current.toggle());
    expect(result.current.isRunning).toBe(false);
    advanceTicks(3);
    expect(result.current.iteration).toBe(1);
  });

  it('stops at the maximum number of iterations', () => {
    const { result } = renderRunner(5);
    act(() => result.current.toggle());
    advanceTicks(10);
    expect(result.current.iteration).toBe(5);
    expect(result.current.isFinished).toBe(true);
    expect(result.current.isRunning).toBe(false);
  });

  it('stops when the descent diverges', () => {
    const { result } = renderRunner(30, 3);
    act(() => result.current.toggle());
    advanceTicks(10);
    expect(result.current.iteration).toBe(3);
    expect(result.current.isFinished).toBe(true);
    expect(result.current.isRunning).toBe(false);
  });

  it('ignores step and toggle once finished', () => {
    const { result } = renderRunner(2);
    act(() => result.current.step());
    act(() => result.current.step());
    act(() => result.current.step());
    expect(result.current.iteration).toBe(2);
    act(() => result.current.toggle());
    expect(result.current.isRunning).toBe(false);
  });

  it('restarts at iteration 0 and stops running', () => {
    const { result } = renderRunner();
    act(() => result.current.toggle());
    advanceTicks(2);
    act(() => result.current.restart());
    expect(result.current.iteration).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it('leaves no timer behind after unmount', () => {
    const { result, unmount } = renderRunner();
    act(() => result.current.toggle());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
