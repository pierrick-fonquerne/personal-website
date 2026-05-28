import { useMemo, useState, type JSX } from 'react';

interface Point {
  x: number;
  y: number;
  label: 0 | 1;
}

type DatasetKind = 'and' | 'or' | 'xor';

interface Props {
  dataset?: DatasetKind;
  initialSlope?: number;
  initialIntercept?: number;
  labels?: {
    slope?: string;
    intercept?: string;
    classified?: string;
    line?: string;
    impossible?: string;
  };
}

const DATASETS: Record<DatasetKind, { points: Point[]; label: string }> = {
  and: {
    label: 'AND',
    points: [
      { x: 0, y: 0, label: 0 },
      { x: 1, y: 0, label: 0 },
      { x: 0, y: 1, label: 0 },
      { x: 1, y: 1, label: 1 },
    ],
  },
  or: {
    label: 'OR',
    points: [
      { x: 0, y: 0, label: 0 },
      { x: 1, y: 0, label: 1 },
      { x: 0, y: 1, label: 1 },
      { x: 1, y: 1, label: 1 },
    ],
  },
  xor: {
    label: 'XOR',
    points: [
      { x: 0, y: 0, label: 0 },
      { x: 1, y: 0, label: 1 },
      { x: 0, y: 1, label: 1 },
      { x: 1, y: 1, label: 0 },
    ],
  },
};

const PLOT_SIZE = 320;
const PAD = 40;
const INNER = PLOT_SIZE - 2 * PAD;

function toPx(value: number): { px: number } {
  return { px: PAD + value * INNER };
}

function classify(pt: Point, slope: number, intercept: number): 0 | 1 {
  return pt.y > slope * pt.x + intercept ? 1 : 0;
}

function lineEndpoints(slope: number, intercept: number): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
} {
  const samples: { x: number; y: number }[] = [];
  for (let x = -0.5; x <= 1.5; x += 0.01) {
    const y = slope * x + intercept;
    if (y >= -0.5 && y <= 1.5) samples.push({ x, y });
  }
  if (samples.length === 0) return { x1: 0, y1: 0, x2: 0, y2: 0 };
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  return { x1: first.x, y1: first.y, x2: last.x, y2: last.y };
}

export default function LinearSeparabilityViewer({
  dataset = 'xor',
  initialSlope = -1,
  initialIntercept = 1.5,
  labels = {},
}: Props): JSX.Element {
  const [datasetKind, setDatasetKind] = useState<DatasetKind>(dataset);
  const [slope, setSlope] = useState<number>(initialSlope);
  const [intercept, setIntercept] = useState<number>(initialIntercept);

  const { points, label: datasetLabel } = DATASETS[datasetKind];

  const stats = useMemo(() => {
    let correct = 0;
    points.forEach((p) => {
      if (classify(p, slope, intercept) === p.label) correct += 1;
    });
    return { correct, total: points.length };
  }, [points, slope, intercept]);

  const line = useMemo(() => lineEndpoints(slope, intercept), [slope, intercept]);

  const slopeLabel = labels.slope ?? 'Pente';
  const interceptLabel = labels.intercept ?? 'Ordonnée à l’origine';
  const classifiedLabel = labels.classified ?? 'bien classés';
  const lineLabel = labels.line ?? 'Équation';
  const impossibleHint =
    labels.impossible ??
    "Sur XOR, aucune droite ne sépare correctement les quatre points. Essaie : tu n'arriveras jamais à 4 sur 4.";

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['and', 'or', 'xor'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setDatasetKind(kind)}
            className={[
              'rounded-md border px-3 py-1 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors',
              kind === datasetKind
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-[var(--color-line)] text-[var(--color-fg-muted)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-fg)]',
            ].join(' ')}
          >
            {DATASETS[kind].label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 sm:grid-cols-[320px_1fr]">
        <svg
          viewBox={`0 0 ${PLOT_SIZE} ${PLOT_SIZE}`}
          className="mx-auto block w-full max-w-[320px]"
          role="img"
          aria-label={`Plan 2D du dataset ${datasetLabel} avec sa droite séparatrice`}
        >
          <rect x="0" y="0" width={PLOT_SIZE} height={PLOT_SIZE} fill="var(--color-bg)" rx="8" />

          {[0, 0.5, 1].map((g) => {
            const { px } = toPx(g);
            return (
              <g key={`grid-${g}`}>
                <line
                  x1={PAD}
                  y1={PLOT_SIZE - px}
                  x2={PLOT_SIZE - PAD}
                  y2={PLOT_SIZE - px}
                  stroke="var(--color-line)"
                  strokeWidth="0.5"
                  strokeDasharray="3 3"
                />
                <line
                  x1={px}
                  y1={PAD}
                  x2={px}
                  y2={PLOT_SIZE - PAD}
                  stroke="var(--color-line)"
                  strokeWidth="0.5"
                  strokeDasharray="3 3"
                />
              </g>
            );
          })}

          <line
            x1={PAD}
            y1={PLOT_SIZE - PAD}
            x2={PLOT_SIZE - PAD}
            y2={PLOT_SIZE - PAD}
            stroke="var(--color-fg-dim)"
            strokeWidth="1"
          />
          <line
            x1={PAD}
            y1={PAD}
            x2={PAD}
            y2={PLOT_SIZE - PAD}
            stroke="var(--color-fg-dim)"
            strokeWidth="1"
          />
          <text
            x={PLOT_SIZE - PAD + 6}
            y={PLOT_SIZE - PAD + 4}
            fill="var(--color-fg-dim)"
            fontSize="12"
            fontFamily="var(--font-mono)"
          >
            A
          </text>
          <text
            x={PAD - 12}
            y={PAD - 6}
            fill="var(--color-fg-dim)"
            fontSize="12"
            fontFamily="var(--font-mono)"
          >
            B
          </text>
          {[0, 1].map((tick) => {
            const { px } = toPx(tick);
            return (
              <g key={`tick-${tick}`}>
                <text
                  x={px}
                  y={PLOT_SIZE - PAD + 18}
                  fill="var(--color-fg-dim)"
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                >
                  {tick}
                </text>
                <text
                  x={PAD - 8}
                  y={PLOT_SIZE - px + 4}
                  fill="var(--color-fg-dim)"
                  fontSize="11"
                  fontFamily="var(--font-mono)"
                  textAnchor="end"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          <line
            x1={toPx(line.x1).px}
            y1={PLOT_SIZE - toPx(line.y1).px}
            x2={toPx(line.x2).px}
            y2={PLOT_SIZE - toPx(line.y2).px}
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeOpacity="0.85"
          />

          {points.map((p) => {
            const cx = toPx(p.x).px;
            const cy = PLOT_SIZE - toPx(p.y).px;
            const predicted = classify(p, slope, intercept);
            const correct = predicted === p.label;
            const fill = p.label === 1 ? '#34d399' : '#475569';
            const stroke = correct ? 'var(--color-bg)' : '#ef4444';
            const ringStrokeWidth = correct ? 2 : 3;
            return (
              <g key={`pt-${p.x}-${p.y}`}>
                {!correct && (
                  <circle cx={cx} cy={cy} r="14" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" />
                )}
                <circle cx={cx} cy={cy} r="8" fill={fill} stroke={stroke} strokeWidth={ringStrokeWidth} />
                <text
                  x={cx}
                  y={cy + 3}
                  fill={p.label === 1 ? '#0b0b0b' : '#e5e5e5'}
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                  fontWeight="700"
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="space-y-4">
          <label className="block">
            <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
              {slopeLabel} = <span className="text-[var(--color-accent)]">{slope.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={-5}
              max={5}
              step={0.05}
              value={slope}
              onChange={(e) => setSlope(Number(e.target.value))}
              className="learning-slider"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
              {interceptLabel} = <span className="text-[var(--color-accent)]">{intercept.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={-2}
              max={3}
              step={0.05}
              value={intercept}
              onChange={(e) => setIntercept(Number(e.target.value))}
              className="learning-slider"
            />
          </label>

          <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg)] p-3 font-mono text-[12px] leading-relaxed">
            <div className="text-[var(--color-fg-muted)]">
              {lineLabel} : B = {slope.toFixed(2)}·A + {intercept.toFixed(2)}
            </div>
            <div className="mt-2 text-[var(--color-fg)]">
              <span
                className={
                  stats.correct === stats.total
                    ? 'text-[var(--color-accent)] font-semibold'
                    : 'text-[var(--color-fg)]'
                }
              >
                {stats.correct} / {stats.total}
              </span>{' '}
              {classifiedLabel}
            </div>
            {datasetKind === 'xor' && stats.correct < stats.total && (
              <div className="mt-2 text-[11px] text-[var(--color-fg-dim)] italic">{impossibleHint}</div>
            )}
          </div>
        </div>
      </div>
    </figure>
  );
}
