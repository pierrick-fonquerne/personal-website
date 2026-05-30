import { useEffect, useRef, useState, type JSX } from 'react';

export type ComputeMode = 'dense' | 'sparse';

export interface DenseVsSparseLabels {
  helpText?: string;
  denseLabel?: string;
  sparseLabel?: string;
  activeLabel?: string;
  costLabel?: string;
  tickLabel?: string;
  resetLabel?: string;
  pauseLabel?: string;
  autoLabel?: string;
  runLabel?: string;
  modeGroupLabel?: string;
  gridLabel?: string;
  ratioLabel?: string;
}

export interface DenseVsSparseComputeProps {
  gridSize?: number;
  labels?: DenseVsSparseLabels;
}

interface SimState {
  tick: number;
  denseCost: number;
  sparseCost: number;
  activeCells: Set<number>;
  stimulusIndex: number;
}

function getNeighborhood(index: number, gridSize: number): Set<number> {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const result = new Set<number>();
  result.add(index);
  if (row > 0) result.add(index - gridSize);
  if (row < gridSize - 1) result.add(index + gridSize);
  if (col > 0) result.add(index - 1);
  if (col < gridSize - 1) result.add(index + 1);
  return result;
}

function advanceStimulus(current: number, step: number, total: number): number {
  return (current + step * 7 + 3) % total;
}

function buildInitialState(gridSize: number): SimState {
  const total = gridSize * gridSize;
  return {
    tick: 0,
    denseCost: 0,
    sparseCost: 0,
    activeCells: new Set<number>(),
    stimulusIndex: Math.floor(total / 2),
  };
}

function tickState(state: SimState, mode: ComputeMode, gridSize: number): SimState {
  const total = gridSize * gridSize;
  const nextTick = state.tick + 1;

  if (mode === 'dense') {
    const allCells = new Set<number>();
    for (let i = 0; i < total; i += 1) {
      allCells.add(i);
    }
    return {
      tick: nextTick,
      denseCost: state.denseCost + total,
      sparseCost: state.sparseCost,
      activeCells: allCells,
      stimulusIndex: state.stimulusIndex,
    };
  }

  const nextStimulus = advanceStimulus(state.stimulusIndex, nextTick, total);
  const neighborhood = getNeighborhood(nextStimulus, gridSize);
  return {
    tick: nextTick,
    denseCost: state.denseCost,
    sparseCost: state.sparseCost + neighborhood.size,
    activeCells: neighborhood,
    stimulusIndex: nextStimulus,
  };
}

export default function DenseVsSparseCompute({
  gridSize = 12,
  labels = {},
}: DenseVsSparseComputeProps): JSX.Element {
  const [mode, setMode] = useState<ComputeMode>('dense');
  const [sim, setSim] = useState<SimState>(() => buildInitialState(gridSize));
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modeRef = useRef<ComputeMode>(mode);
  const gridSizeRef = useRef<number>(gridSize);

  modeRef.current = mode;
  gridSizeRef.current = gridSize;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSim((prev) => tickState(prev, modeRef.current, gridSizeRef.current));
      }, 600);
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  const handleTick = (): void => {
    setSim((prev) => tickState(prev, mode, gridSize));
  };

  const handleReset = (): void => {
    setRunning(false);
    setSim(buildInitialState(gridSize));
  };

  const handleModeChange = (next: ComputeMode): void => {
    setMode(next);
  };

  const toggleRunning = (): void => {
    setRunning((prev) => !prev);
  };

  const helpText =
    labels.helpText ??
    'Un LLM calcule tout, partout, tout le temps. Le cerveau ne calcule que le strict nécessaire. Avance les ticks et regarde le coût diverger.';
  const denseLabel = labels.denseLabel ?? 'Tout, partout (dense)';
  const sparseLabel = labels.sparseLabel ?? 'Le strict nécessaire (creux)';
  const activeLabel = labels.activeLabel ?? 'Cellules actives';
  const costLabel = labels.costLabel ?? 'Coût cumulé';
  const tickLabel = labels.tickLabel ?? 'Tick';
  const resetLabel = labels.resetLabel ?? 'Réinitialiser';
  const pauseLabel = labels.pauseLabel ?? 'Pause';
  const autoLabel = labels.autoLabel ?? 'Auto';
  const runLabel = labels.runLabel ?? 'Lancer';
  const modeGroupLabel = labels.modeGroupLabel ?? 'Mode de calcul';
  const gridLabel = labels.gridLabel ?? 'Grille';
  const ratioLabel = labels.ratioLabel ?? 'en faveur du creux';

  const total = gridSize * gridSize;
  const activeCellsCount = sim.activeCells.size;
  const currentCost = mode === 'dense' ? sim.denseCost : sim.sparseCost;
  const otherCost = mode === 'dense' ? sim.sparseCost : sim.denseCost;
  const otherLabel = mode === 'dense' ? sparseLabel : denseLabel;

  const CELL_SIZE = 320 / gridSize;
  const SVG_SIZE = CELL_SIZE * gridSize;
  const GAP = CELL_SIZE > 6 ? 1 : 0;

  const buttonClass =
    'rounded-sm border border-[var(--color-line)] px-3 py-1.5 font-mono text-[12px] tracking-[0.04em] text-[var(--color-fg)] transition-colors duration-200 hover:border-[var(--color-line-strong)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40';

  const modeButtonClass = (m: ComputeMode): string => {
    const active =
      mode === m
        ? ' border-[var(--color-accent)] text-[var(--color-accent)]'
        : ' border-[var(--color-line)] text-[var(--color-fg)]';
    return (
      'rounded-sm border px-3 py-1.5 font-mono text-[12px] tracking-[0.04em] transition-colors duration-200 hover:border-[var(--color-line-strong)] hover:text-[var(--color-accent)]' +
      active
    );
  };

  const gridAriaLabel = `${gridLabel} ${gridSize}x${gridSize}, mode ${mode === 'dense' ? denseLabel : sparseLabel}, tick ${sim.tick}, ${activeCellsCount} cellules actives`;

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <div className="flex flex-col gap-5">
        <p className="text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{helpText}</p>

        <div className="flex flex-wrap gap-2" role="group" aria-label={modeGroupLabel}>
          <button
            type="button"
            className={modeButtonClass('dense')}
            onClick={() => handleModeChange('dense')}
            aria-label={denseLabel}
            aria-pressed={mode === 'dense'}
          >
            {denseLabel}
          </button>
          <button
            type="button"
            className={modeButtonClass('sparse')}
            onClick={() => handleModeChange('sparse')}
            aria-label={sparseLabel}
            aria-pressed={mode === 'sparse'}
          >
            {sparseLabel}
          </button>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="shrink-0">
            <svg
              width={SVG_SIZE}
              height={SVG_SIZE}
              viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
              role="img"
              aria-label={gridAriaLabel}
              className="w-full max-w-[320px]"
            >
              {Array.from({ length: total }, (_, i) => {
                const row = Math.floor(i / gridSize);
                const col = i % gridSize;
                const isActive = sim.activeCells.has(i);
                return (
                  <rect
                    key={i}
                    x={col * CELL_SIZE + GAP}
                    y={row * CELL_SIZE + GAP}
                    width={CELL_SIZE - GAP * 2}
                    height={CELL_SIZE - GAP * 2}
                    fill={
                      isActive ? 'var(--color-accent)' : 'var(--color-bg)'
                    }
                    stroke="var(--color-line)"
                    strokeWidth={0.5}
                    rx={1}
                  />
                );
              })}
            </svg>
          </div>

          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-[12px] tracking-[0.06em] text-[var(--color-fg-dim)] uppercase sm:grid-cols-1">
              <div className="flex items-baseline gap-2">
                <dt>{tickLabel}</dt>
                <dd className="text-[18px] text-[var(--color-fg)]">{sim.tick}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt>{activeLabel}</dt>
                <dd className="text-[18px] text-[var(--color-fg)]">{activeCellsCount}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt>{costLabel}</dt>
                <dd className="text-[22px] text-[var(--color-accent)]">{currentCost}</dd>
              </div>
              {otherCost > 0 && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[10px]">{costLabel} ({otherLabel})</dt>
                  <dd className="text-[16px] text-[var(--color-fg-muted)]">{otherCost}</dd>
                </div>
              )}
            </dl>

            {sim.tick > 0 && otherCost > 0 && (
              <p className="text-[12px] leading-[1.5] text-[var(--color-fg-muted)]">
                {mode === 'dense'
                  ? `Dense: ${currentCost} vs creux: ${otherCost}. Ratio: x${(currentCost / Math.max(otherCost, 1)).toFixed(1)}.`
                  : `Creux: ${currentCost} vs dense: ${otherCost}. Ratio: x${(otherCost / Math.max(currentCost, 1)).toFixed(1)} ${ratioLabel}.`}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonClass}
                onClick={handleTick}
                aria-label={`Avancer d'un tick (${tickLabel} ${sim.tick + 1})`}
              >
                +1 {tickLabel}
              </button>
              <button
                type="button"
                className={buttonClass}
                onClick={toggleRunning}
                aria-label={running ? pauseLabel : runLabel}
              >
                {running ? pauseLabel : autoLabel}
              </button>
              <button
                type="button"
                className={buttonClass}
                onClick={handleReset}
                aria-label={resetLabel}
              >
                {resetLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
