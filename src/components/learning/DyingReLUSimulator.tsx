import { useMemo, useState, type JSX } from 'react';

interface Props {
  initialW?: number;
  initialB?: number;
  labels?: {
    weightLabel?: string;
    biasLabel?: string;
    helpText?: string;
    activeLabel?: string;
    deadLabel?: string;
  };
}

const PLOT_W = 360;
const PLOT_H = 220;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 30;
const X_RANGE = 3;
const Y_RANGE = 3;
const DATASET_X = Array.from({ length: 12 }, (_, i) => -2 + (i * 4) / 11);

function relu(z: number): number {
  return Math.max(0, z);
}

function formatNumber(n: number): string {
  return n.toFixed(2);
}

export default function DyingReLUSimulator({
  initialW = 1,
  initialB = 0,
  labels = {},
}: Props): JSX.Element {
  const [w, setW] = useState<number>(initialW);
  const [b, setB] = useState<number>(initialB);

  const innerW = PLOT_W - PAD_LEFT - PAD_RIGHT;
  const innerH = PLOT_H - PAD_TOP - PAD_BOTTOM;
  const xToPx = (x: number): number => PAD_LEFT + ((x + X_RANGE) / (2 * X_RANGE)) * innerW;
  const yToPx = (y: number): number => PAD_TOP + (1 - (y + Y_RANGE) / (2 * Y_RANGE)) * innerH;

  const datasetPoints = useMemo(
    () =>
      DATASET_X.map((x) => {
        const z = w * x + b;
        const y = relu(z);
        return { x, y, active: z > 0 };
      }),
    [w, b],
  );

  const activeCount = datasetPoints.filter((p) => p.active).length;
  const total = datasetPoints.length;
  const activeRatio = activeCount / total;

  const curveSamples = useMemo(() => {
    const arr: { x: number; y: number }[] = [];
    const N = 80;
    for (let i = 0; i <= N; i += 1) {
      const x = -X_RANGE + (i * 2 * X_RANGE) / N;
      arr.push({ x, y: relu(w * x + b) });
    }
    return arr;
  }, [w, b]);

  const polylinePoints = curveSamples
    .map(({ x, y }) => `${xToPx(x)},${yToPx(Math.min(Y_RANGE, y))}`)
    .join(' ');

  const weightLabel = labels.weightLabel ?? 'Poids w';
  const biasLabel = labels.biasLabel ?? 'Biais b';
  const activeLabel = labels.activeLabel ?? 'actifs';
  const deadLabel = labels.deadLabel ?? 'inactifs';
  const helpText =
    labels.helpText ??
    "Diminue le biais pour pousser le neurone vers la mort. Si la sortie ReLU est nulle sur tout le dataset, son gradient l'est aussi et il n'apprendra plus.";

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <div className="grid items-start gap-6 sm:grid-cols-[360px_1fr]">
        <svg
          viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
          className="mx-auto block w-full max-w-[360px]"
          role="img"
          aria-label="Courbe ReLU(wx + b) avec les points du dataset"
        >
          <rect x="0" y="0" width={PLOT_W} height={PLOT_H} fill="var(--color-bg)" rx="6" />

          {[-3, -2, -1, 0, 1, 2, 3].map((gx) => (
            <line
              key={`gx-${gx}`}
              x1={xToPx(gx)}
              y1={PAD_TOP}
              x2={xToPx(gx)}
              y2={PAD_TOP + innerH}
              stroke="var(--color-line)"
              strokeWidth="0.5"
              strokeDasharray={gx === 0 ? '' : '3 3'}
            />
          ))}
          {[-3, -2, -1, 0, 1, 2, 3].map((gy) => (
            <line
              key={`gy-${gy}`}
              x1={PAD_LEFT}
              y1={yToPx(gy)}
              x2={PAD_LEFT + innerW}
              y2={yToPx(gy)}
              stroke="var(--color-line)"
              strokeWidth="0.5"
              strokeDasharray={gy === 0 ? '' : '3 3'}
            />
          ))}

          <line
            x1={PAD_LEFT}
            y1={yToPx(0)}
            x2={PAD_LEFT + innerW}
            y2={yToPx(0)}
            stroke="var(--color-fg-dim)"
            strokeWidth="1"
          />
          <line
            x1={xToPx(0)}
            y1={PAD_TOP}
            x2={xToPx(0)}
            y2={PAD_TOP + innerH}
            stroke="var(--color-fg-dim)"
            strokeWidth="1"
          />

          <text x={PAD_LEFT + innerW - 4} y={yToPx(0) - 6} fill="var(--color-fg-dim)" fontSize="11" fontFamily="var(--font-mono)" textAnchor="end">
            x
          </text>
          <text x={xToPx(0) + 6} y={PAD_TOP + 8} fill="var(--color-fg-dim)" fontSize="11" fontFamily="var(--font-mono)">
            ReLU
          </text>

          <polyline points={polylinePoints} fill="none" stroke="var(--color-accent)" strokeWidth="2" />

          {datasetPoints.map((p, i) => (
            <g key={`pt-${i}`}>
              <line
                x1={xToPx(p.x)}
                y1={yToPx(0)}
                x2={xToPx(p.x)}
                y2={yToPx(p.y)}
                stroke={p.active ? '#34d399' : '#ef4444'}
                strokeWidth="1"
                strokeOpacity="0.4"
              />
              <circle
                cx={xToPx(p.x)}
                cy={yToPx(p.y)}
                r="3.5"
                fill={p.active ? '#34d399' : '#ef4444'}
                stroke="var(--color-bg)"
                strokeWidth="1.5"
              />
            </g>
          ))}
        </svg>

        <div className="space-y-3">
          <label className="block">
            <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
              {weightLabel} = <span className="text-[var(--color-accent)]">{formatNumber(w)}</span>
            </span>
            <input
              type="range"
              min={-2}
              max={2}
              step={0.05}
              value={w}
              onChange={(e) => setW(Number(e.target.value))}
              className="learning-slider"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
              {biasLabel} = <span className="text-[var(--color-accent)]">{formatNumber(b)}</span>
            </span>
            <input
              type="range"
              min={-3}
              max={3}
              step={0.05}
              value={b}
              onChange={(e) => setB(Number(e.target.value))}
              className="learning-slider"
            />
          </label>

          <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg)] p-3 font-mono text-[12px] leading-relaxed">
            <div className="text-[var(--color-fg-muted)]">
              <span style={{ color: '#34d399' }}>●</span> {activeCount} / {total} {activeLabel}
              {'   '}
              <span style={{ color: '#ef4444' }}>●</span> {total - activeCount} {deadLabel}
            </div>
            <div className="mt-1 text-[var(--color-fg)]">
              {activeRatio === 0 ? (
                <span className="font-semibold text-red-400">Neurone mort</span>
              ) : activeRatio < 0.25 ? (
                <span className="font-semibold text-amber-400">Quasi-mort</span>
              ) : activeRatio < 0.75 ? (
                <span className="text-[var(--color-fg-muted)]">Sélectif</span>
              ) : (
                <span className="font-semibold text-[var(--color-accent)]">Toujours actif</span>
              )}
            </div>
          </div>

          <p className="text-[12px] text-[var(--color-fg-dim)] italic">{helpText}</p>
        </div>
      </div>
    </figure>
  );
}
