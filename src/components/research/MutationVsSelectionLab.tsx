import { useEffect, useRef, useState, type JSX } from 'react';

interface Props {
  labels?: {
    run?: string;
    reset?: string;
    running?: string;
    random?: string;
    selection?: string;
    fitness?: string;
    step?: string;
    help?: string;
    randomFinal?: string;
    selectionFinal?: string;
  };
}

const WIDTH = 480;
const HEIGHT = 220;
const PAD = 30;
const MAX_STEPS = 90;
const STEP_SIZE = 0.08;
const PEAK = 0.78;
const SPREAD = 0.13;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function fitness(x: number): number {
  return Math.exp(-((x - PEAK) ** 2) / (2 * SPREAD ** 2));
}

interface History {
  random: number[];
  selection: number[];
}

export default function MutationVsSelectionLab({ labels = {} }: Props): JSX.Element {
  const [history, setHistory] = useState<History>({ random: [], selection: [] });
  const [running, setRunning] = useState(false);
  const randomX = useRef(0.12);
  const selectionX = useRef(0.12);

  useEffect(() => {
    if (!running) {
      return;
    }
    const id = setInterval(() => {
      setHistory((prev) => {
        if (prev.random.length >= MAX_STEPS) {
          return prev;
        }
        randomX.current = clamp01(randomX.current + (Math.random() - 0.5) * STEP_SIZE);
        const candidate = clamp01(selectionX.current + (Math.random() - 0.5) * STEP_SIZE);
        if (fitness(candidate) > fitness(selectionX.current)) {
          selectionX.current = candidate;
        }
        return {
          random: [...prev.random, fitness(randomX.current)],
          selection: [...prev.selection, fitness(selectionX.current)],
        };
      });
    }, 55);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && history.random.length >= MAX_STEPS) {
      setRunning(false);
    }
  }, [running, history]);

  const reset = (): void => {
    setRunning(false);
    randomX.current = 0.12;
    selectionX.current = 0.12;
    setHistory({ random: [], selection: [] });
  };

  const start = (): void => {
    if (history.random.length >= MAX_STEPS) {
      reset();
    }
    setRunning(true);
  };

  const runLabel = labels.run ?? "Lancer l'évolution";
  const resetLabel = labels.reset ?? 'Réinitialiser';
  const runningLabel = labels.running ?? 'En cours...';
  const randomLabel = labels.random ?? 'Mutation au hasard';
  const selectionLabel = labels.selection ?? 'Mutation + sélection';
  const fitnessLabel = labels.fitness ?? 'Performance';
  const stepLabel = labels.step ?? 'Étape';
  const helpText =
    labels.help ??
    'Les deux partent du même point. À gauche on garde chaque mutation au hasard ; à droite on ne garde que celles qui améliorent. La sélection grimpe, le hasard erre.';

  const toX = (index: number): number => PAD + (index / (MAX_STEPS - 1)) * (WIDTH - 2 * PAD);
  const toY = (value: number): number => HEIGHT - PAD - value * (HEIGHT - 2 * PAD);

  const buildPath = (series: number[]): string =>
    series
      .map((value, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(value)}`)
      .join(' ');

  const lastRandom = history.random.at(-1) ?? 0;
  const lastSelection = history.selection.at(-1) ?? 0;
  const step = history.random.length;

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <p className="mb-4 text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{helpText}</p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${fitnessLabel}: ${randomLabel} ${(lastRandom * 100).toFixed(0)}%, ${selectionLabel} ${(lastSelection * 100).toFixed(0)}%`}
        className="w-full"
      >
        <line
          x1={PAD}
          y1={HEIGHT - PAD}
          x2={WIDTH - PAD}
          y2={HEIGHT - PAD}
          stroke="var(--color-line)"
          strokeWidth={1}
        />
        <line
          x1={PAD}
          y1={PAD}
          x2={PAD}
          y2={HEIGHT - PAD}
          stroke="var(--color-line)"
          strokeWidth={1}
        />
        <text x={PAD} y={PAD - 10} fill="var(--color-fg-dim)" fontSize="10" fontFamily="monospace">
          {fitnessLabel}
        </text>
        {history.random.length > 1 && (
          <path
            d={buildPath(history.random)}
            fill="none"
            stroke="var(--color-fg-dim)"
            strokeWidth={2}
          />
        )}
        {history.selection.length > 1 && (
          <path
            d={buildPath(history.selection)}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
          />
        )}
      </svg>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <dl className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[12px]">
          <div className="flex items-center gap-2">
            <span className="inline-block h-[2px] w-4 bg-[var(--color-fg-dim)]" />
            <dt className="text-[var(--color-fg-dim)]">{randomLabel}</dt>
            <dd className="text-[var(--color-fg)]">{(lastRandom * 100).toFixed(0)}%</dd>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-[2px] w-4 bg-[var(--color-accent)]" />
            <dt className="text-[var(--color-fg-dim)]">{selectionLabel}</dt>
            <dd className="text-[var(--color-fg)]">{(lastSelection * 100).toFixed(0)}%</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-[var(--color-fg-dim)] uppercase">{stepLabel}</dt>
            <dd className="text-[var(--color-fg)]">
              {step} / {MAX_STEPS}
            </dd>
          </div>
        </dl>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={start}
            disabled={running}
            className="rounded-sm border border-[var(--color-line)] px-3 py-1.5 font-mono text-[12px] tracking-[0.04em] text-[var(--color-fg)] transition-colors duration-200 hover:border-[var(--color-line-strong)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? runningLabel : runLabel}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-sm border border-[var(--color-line)] px-3 py-1.5 font-mono text-[12px] tracking-[0.04em] text-[var(--color-fg)] transition-colors duration-200 hover:border-[var(--color-line-strong)] hover:text-[var(--color-accent)]"
          >
            {resetLabel}
          </button>
        </div>
      </div>
    </figure>
  );
}
