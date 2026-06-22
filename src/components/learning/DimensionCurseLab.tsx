import { useMemo, useState, type JSX } from 'react';
import {
  distanceContrast,
  distancesToQuery,
  histogram,
  meanAndStd,
  mulberry32,
  pairwiseCosines,
  randomVectors,
} from './dimension-curse/dimension-curse';

export interface DimensionCurseLabProps {
  seed?: number;
  pointCount?: number;
  pairPointCount?: number;
  dimensions?: number[];
  initialDimension?: number;
  binCount?: number;
  labels: {
    concentrationTab: string;
    orthogonalityTab: string;
    dimensionLabel: string;
    reshuffleLabel: string;
    contrastLabel: string;
    spreadLabel: string;
    meanCosineLabel: string;
    concentrationCaption: string;
    orthogonalityCaption: string;
    distanceAxisLabel: string;
    cosineAxisLabel: string;
    countAxisLabel: string;
  };
}

type Tab = 'concentration' | 'orthogonality';

const SVG_W = 480;
const SVG_H = 240;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 36;

function formatN(n: number, decimals: number): string {
  return n.toFixed(decimals);
}

function tabButtonClass(active: boolean): string {
  return [
    'rounded px-2.5 py-1 text-[11px] font-mono border transition-colors',
    active
      ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-bg)] font-semibold'
      : 'border-[var(--color-line)] text-[var(--color-fg-muted)] bg-[var(--color-bg)] hover:border-[var(--color-accent)]',
  ].join(' ');
}

export default function DimensionCurseLab({
  seed = 2024,
  pointCount = 500,
  pairPointCount = 80,
  dimensions = [1, 2, 3, 5, 10, 25, 50, 100, 250, 500, 1000],
  initialDimension = 2,
  binCount = 24,
  labels,
}: DimensionCurseLabProps): JSX.Element {
  const initialIndex = Math.max(0, dimensions.indexOf(initialDimension));

  const [tab, setTab] = useState<Tab>('concentration');
  const [dimIndex, setDimIndex] = useState<number>(initialIndex);
  const [shuffleOffset, setShuffleOffset] = useState<number>(0);

  const currentDim = dimensions[dimIndex] ?? dimensions[0] ?? 2;
  const effectiveSeed = seed + shuffleOffset;

  const concentrationData = useMemo(() => {
    if (tab !== 'concentration') return null;
    const rng = mulberry32(effectiveSeed);
    const query = new Array<number>(currentDim).fill(0);
    const vectors = randomVectors(pointCount, currentDim, rng);
    const distances = distancesToQuery(query, vectors);
    const bins = histogram(distances, binCount);
    const contrast = distanceContrast(distances);
    const stats = meanAndStd(distances);
    const cv = stats.mean > 1e-12 ? stats.std / stats.mean : 0;
    return { bins, contrast, cv };
  }, [tab, currentDim, effectiveSeed, pointCount, binCount]);

  const orthogonalityData = useMemo(() => {
    if (tab !== 'orthogonality') return null;
    const rng = mulberry32(effectiveSeed);
    const vectors = randomVectors(pairPointCount, currentDim, rng);
    const cosines = pairwiseCosines(vectors);
    const bins = histogram(cosines, binCount);
    const stats = meanAndStd(cosines);
    return { bins, meanCosine: stats.mean, stdCosine: stats.std };
  }, [tab, currentDim, effectiveSeed, pairPointCount, binCount]);

  const activeBins =
    tab === 'concentration' ? (concentrationData?.bins ?? []) : (orthogonalityData?.bins ?? []);

  const maxCount = activeBins.reduce((m, b) => Math.max(m, b.count), 0);

  const chartW = SVG_W - PAD_LEFT - PAD_RIGHT;
  const chartH = SVG_H - PAD_TOP - PAD_BOTTOM;

  const xMin = activeBins[0]?.start ?? 0;
  const xMax = activeBins[activeBins.length - 1]?.end ?? 1;
  const xRange = xMax - xMin > 1e-12 ? xMax - xMin : 1;

  function toChartX(val: number): number {
    return PAD_LEFT + ((val - xMin) / xRange) * chartW;
  }

  function toChartY(count: number): number {
    if (maxCount === 0) return PAD_TOP + chartH;
    return PAD_TOP + chartH - (count / maxCount) * chartH;
  }

  const xAxisLabel =
    tab === 'concentration' ? labels.distanceAxisLabel : labels.cosineAxisLabel;

  const xTickCount = 5;
  const xTicks = Array.from({ length: xTickCount }, (_, i) => {
    const val = xMin + (i / (xTickCount - 1)) * xRange;
    return val;
  });

  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => {
    return Math.round((i / (yTickCount - 1)) * maxCount);
  });

  const handleReshuffle = (): void => {
    setShuffleOffset((prev) => prev + 1);
  };

  const handleDimChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setDimIndex(Number(e.target.value));
  };

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      {/* Onglets */}
      <div className="mb-4 flex flex-wrap gap-1.5" role="group">
        <button
          type="button"
          aria-pressed={tab === 'concentration'}
          onClick={() => setTab('concentration')}
          className={tabButtonClass(tab === 'concentration')}
        >
          {labels.concentrationTab}
        </button>
        <button
          type="button"
          aria-pressed={tab === 'orthogonality'}
          onClick={() => setTab('orthogonality')}
          className={tabButtonClass(tab === 'orthogonality')}
        >
          {labels.orthogonalityTab}
        </button>
      </div>

      {/* Controles : slider dimension + bouton reshuffle */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <label className="flex-1 min-w-[180px]">
          <span className="mb-1 block font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
            {labels.dimensionLabel}{' '}
            <span className="text-[var(--color-accent)] font-semibold">{currentDim}</span>
          </span>
          <input
            type="range"
            min={0}
            max={dimensions.length - 1}
            step={1}
            value={dimIndex}
            aria-label={labels.dimensionLabel}
            onChange={handleDimChange}
            className="learning-slider"
          />
        </label>

        <button
          type="button"
          onClick={handleReshuffle}
          className="rounded border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-1 font-mono text-[11px] text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          {labels.reshuffleLabel}
        </button>
      </div>

      {/* Histogramme SVG */}
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="block w-full"
        role="img"
        aria-label={xAxisLabel}
      >
        {/* Fond */}
        <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="var(--color-bg)" rx="6" />

        {/* Grille horizontale legere */}
        {yTicks.map((count, i) => {
          const y = toChartY(count);
          return (
            <g key={`ygrid-${i}`}>
              <line
                x1={PAD_LEFT}
                y1={y}
                x2={SVG_W - PAD_RIGHT}
                y2={y}
                stroke="var(--color-line)"
                strokeWidth="0.5"
                strokeDasharray={i === 0 ? '' : '3 3'}
              />
              <text
                x={PAD_LEFT - 4}
                y={y + 4}
                fill="var(--color-fg-dim)"
                fontSize="10"
                fontFamily="var(--font-mono)"
                textAnchor="end"
              >
                {count}
              </text>
            </g>
          );
        })}

        {/* Axe Y label */}
        <text
          x={10}
          y={PAD_TOP + chartH / 2}
          fill="var(--color-fg-dim)"
          fontSize="10"
          fontFamily="var(--font-mono)"
          textAnchor="middle"
          transform={`rotate(-90, 10, ${PAD_TOP + chartH / 2})`}
        >
          {labels.countAxisLabel}
        </text>

        {/* Barres */}
        {activeBins.map((bin, i) => {
          const x0 = toChartX(bin.start);
          const x1 = toChartX(bin.end);
          const barW = Math.max(1, x1 - x0 - 1);
          const barH = maxCount > 0 ? (bin.count / maxCount) * chartH : 0;
          const barY = PAD_TOP + chartH - barH;
          return (
            <rect
              key={`bar-${i}`}
              x={x0}
              y={barY}
              width={barW}
              height={barH}
              fill="var(--color-accent)"
              opacity="0.75"
            />
          );
        })}

        {/* Axe X */}
        <line
          x1={PAD_LEFT}
          y1={PAD_TOP + chartH}
          x2={SVG_W - PAD_RIGHT}
          y2={PAD_TOP + chartH}
          stroke="var(--color-fg-dim)"
          strokeWidth="1"
        />

        {/* Ticks X */}
        {xTicks.map((val, i) => {
          const x = PAD_LEFT + (i / (xTickCount - 1)) * chartW;
          return (
            <g key={`xtick-${i}`}>
              <line
                x1={x}
                y1={PAD_TOP + chartH}
                x2={x}
                y2={PAD_TOP + chartH + 4}
                stroke="var(--color-fg-dim)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={PAD_TOP + chartH + 14}
                fill="var(--color-fg-dim)"
                fontSize="10"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                {formatN(val, 2)}
              </text>
            </g>
          );
        })}

        {/* Label axe X */}
        <text
          x={PAD_LEFT + chartW / 2}
          y={SVG_H - 2}
          fill="var(--color-fg-muted)"
          fontSize="10"
          fontFamily="var(--font-mono)"
          textAnchor="middle"
        >
          {xAxisLabel}
        </text>
      </svg>

      {/* Metriques */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {tab === 'concentration' && concentrationData !== null && (
          <>
            <span className="font-mono text-[11px] text-[var(--color-fg-muted)]">
              <span className="uppercase tracking-[0.12em]">{labels.contrastLabel}</span>{' '}
              <span className="text-[var(--color-accent)] font-semibold">
                {formatN(concentrationData.contrast, 3)}
              </span>
            </span>
            <span className="font-mono text-[11px] text-[var(--color-fg-muted)]">
              <span className="uppercase tracking-[0.12em]">{labels.spreadLabel}</span>{' '}
              <span className="text-[var(--color-accent)] font-semibold">
                {formatN(concentrationData.cv, 3)}
              </span>
            </span>
          </>
        )}
        {tab === 'orthogonality' && orthogonalityData !== null && (
          <>
            <span className="font-mono text-[11px] text-[var(--color-fg-muted)]">
              <span className="uppercase tracking-[0.12em]">{labels.meanCosineLabel}</span>{' '}
              <span className="text-[var(--color-accent)] font-semibold">
                {formatN(orthogonalityData.meanCosine, 3)}
              </span>
            </span>
            <span className="font-mono text-[11px] text-[var(--color-fg-muted)]">
              <span className="uppercase tracking-[0.12em]">{labels.spreadLabel}</span>{' '}
              <span className="text-[var(--color-accent)] font-semibold">
                {formatN(orthogonalityData.stdCosine, 3)}
              </span>
            </span>
          </>
        )}
      </div>

      {/* Legende */}
      <figcaption className="mt-3 text-[12px] text-[var(--color-fg-dim)] italic">
        {tab === 'concentration' ? labels.concentrationCaption : labels.orthogonalityCaption}
      </figcaption>
    </figure>
  );
}
