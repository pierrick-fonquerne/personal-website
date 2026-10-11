import { useCallback, useEffect, useState } from 'react';

export const RUN_INTERVAL_MILLISECONDS = 400;

export interface DescentRunnerOptions {
  readonly maxIterations: number;
  readonly isDiverged: (iteration: number) => boolean;
}

export interface DescentRunner {
  readonly iteration: number;
  readonly isRunning: boolean;
  readonly isFinished: boolean;
  readonly step: () => void;
  readonly toggle: () => void;
  readonly restart: () => void;
}

export function useDescentRunner({
  maxIterations,
  isDiverged,
}: DescentRunnerOptions): DescentRunner {
  const [iteration, setIteration] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const isFinished = iteration >= maxIterations || isDiverged(iteration);

  useEffect(() => {
    if (!isRunning) return undefined;
    if (isFinished) {
      setIsRunning(false);
      return undefined;
    }
    const timerId = window.setInterval(() => {
      setIteration((previous) => previous + 1);
    }, RUN_INTERVAL_MILLISECONDS);
    return () => window.clearInterval(timerId);
  }, [isRunning, isFinished]);

  const step = useCallback((): void => {
    if (isFinished) return;
    setIteration((previous) => previous + 1);
  }, [isFinished]);

  const toggle = useCallback((): void => {
    if (isFinished && !isRunning) return;
    setIsRunning((previous) => !previous);
  }, [isFinished, isRunning]);

  const restart = useCallback((): void => {
    setIteration(0);
    setIsRunning(false);
  }, []);

  return { iteration, isRunning, isFinished, step, toggle, restart };
}
