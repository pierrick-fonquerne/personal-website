import { useMemo, useState, type JSX } from 'react';

interface Props {
  labelX?: string;
  labelW?: string;
  initialX?: [number, number];
  initialW?: [number, number];
  range?: number;
  labels?: {
    dotLabel?: string;
    normLabel?: string;
    angleLabel?: string;
    helpText?: string;
  };
}

const SIZE = 320;
const PAD = 28;

function formatNumber(n: number): string {
  return n.toFixed(2);
}

export default function DotProductViewer({
  labelX = 'x',
  labelW = 'w',
  initialX = [1, 0.5],
  initialW = [0.5, 1],
  range = 2,
  labels = {},
}: Props): JSX.Element {
  const [x, setX] = useState<[number, number]>(initialX);
  const [w, setW] = useState<[number, number]>(initialW);

  const stats = useMemo(() => {
    const dot = x[0] * w[0] + x[1] * w[1];
    const normX = Math.sqrt(x[0] ** 2 + x[1] ** 2);
    const normW = Math.sqrt(w[0] ** 2 + w[1] ** 2);
    const denom = normX * normW;
    const cosTheta = denom > 1e-9 ? Math.max(-1, Math.min(1, dot / denom)) : 0;
    const angleDeg = denom > 1e-9 ? (Math.acos(cosTheta) * 180) / Math.PI : 0;
    return { dot, normX, normW, angleDeg };
  }, [x, w]);

  const dotLabel = labels.dotLabel ?? 'Produit scalaire';
  const normLabel = labels.normLabel ?? 'Norme';
  const angleLabel = labels.angleLabel ?? 'Angle';
  const helpText =
    labels.helpText ??
    "Joue avec les coordonnées. Quand les flèches pointent dans la même direction, le produit scalaire est maximal. Quand elles sont perpendiculaires, il vaut zéro.";

  const center = SIZE / 2;
  const scale = (SIZE - 2 * PAD) / (2 * range);
  const toPxX = (val: number): number => center + val * scale;
  const toPxY = (val: number): number => center - val * scale;

  const setCoord = (
    setter: (v: [number, number]) => void,
    current: [number, number],
    idx: 0 | 1,
    value: number,
  ): void => {
    const next: [number, number] = [current[0], current[1]];
    next[idx] = value;
    setter(next);
  };

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <div className="grid items-start gap-6 sm:grid-cols-[320px_1fr]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto block w-full max-w-[320px]"
          role="img"
          aria-label="Plan 2D avec deux vecteurs"
        >
          <rect x="0" y="0" width={SIZE} height={SIZE} fill="var(--color-bg)" rx="8" />

          {[-2, -1, 0, 1, 2].map((g) => (
            <g key={`grid-${g}`}>
              <line
                x1={PAD}
                y1={toPxY(g)}
                x2={SIZE - PAD}
                y2={toPxY(g)}
                stroke="var(--color-line)"
                strokeWidth="0.5"
                strokeDasharray={g === 0 ? '' : '3 3'}
              />
              <line
                x1={toPxX(g)}
                y1={PAD}
                x2={toPxX(g)}
                y2={SIZE - PAD}
                stroke="var(--color-line)"
                strokeWidth="0.5"
                strokeDasharray={g === 0 ? '' : '3 3'}
              />
            </g>
          ))}

          <line
            x1={PAD}
            y1={center}
            x2={SIZE - PAD}
            y2={center}
            stroke="var(--color-fg-dim)"
            strokeWidth="1"
          />
          <line
            x1={center}
            y1={PAD}
            x2={center}
            y2={SIZE - PAD}
            stroke="var(--color-fg-dim)"
            strokeWidth="1"
          />

          <defs>
            <marker
              id="dpv-arrow-x"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--color-accent)" />
            </marker>
            <marker
              id="dpv-arrow-w"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="#60a5fa" />
            </marker>
          </defs>

          <line
            x1={center}
            y1={center}
            x2={toPxX(x[0])}
            y2={toPxY(x[1])}
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            markerEnd="url(#dpv-arrow-x)"
          />
          <text
            x={toPxX(x[0]) + 6}
            y={toPxY(x[1]) - 6}
            fill="var(--color-accent)"
            fontSize="13"
            fontFamily="var(--font-mono)"
            fontWeight="700"
          >
            {labelX}
          </text>

          <line
            x1={center}
            y1={center}
            x2={toPxX(w[0])}
            y2={toPxY(w[1])}
            stroke="#60a5fa"
            strokeWidth="2.5"
            markerEnd="url(#dpv-arrow-w)"
          />
          <text
            x={toPxX(w[0]) + 6}
            y={toPxY(w[1]) - 6}
            fill="#60a5fa"
            fontSize="13"
            fontFamily="var(--font-mono)"
            fontWeight="700"
          >
            {labelW}
          </text>

          <text
            x={SIZE - PAD - 4}
            y={center - 6}
            fill="var(--color-fg-dim)"
            fontSize="11"
            fontFamily="var(--font-mono)"
            textAnchor="end"
          >
            x
          </text>
          <text
            x={center + 6}
            y={PAD + 4}
            fill="var(--color-fg-dim)"
            fontSize="11"
            fontFamily="var(--font-mono)"
          >
            y
          </text>
        </svg>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((idx) => (
              <label key={`x-${idx}`} className="block">
                <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
                  {labelX}
                  <sub>{idx + 1}</sub> ={' '}
                  <span className="text-[var(--color-accent)]">
                    {formatNumber(x[idx] ?? 0)}
                  </span>
                </span>
                <input
                  type="range"
                  min={-range}
                  max={range}
                  step={0.05}
                  value={x[idx]}
                  onChange={(e) => setCoord(setX, x, idx as 0 | 1, Number(e.target.value))}
                  className="learning-slider"
                />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((idx) => (
              <label key={`w-${idx}`} className="block">
                <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
                  {labelW}
                  <sub>{idx + 1}</sub> ={' '}
                  <span style={{ color: '#60a5fa' }}>{formatNumber(w[idx] ?? 0)}</span>
                </span>
                <input
                  type="range"
                  min={-range}
                  max={range}
                  step={0.05}
                  value={w[idx]}
                  onChange={(e) => setCoord(setW, w, idx as 0 | 1, Number(e.target.value))}
                  className="learning-slider"
                />
              </label>
            ))}
          </div>

          <div className="mt-2 rounded-md border border-[var(--color-line)] bg-[var(--color-bg)] p-3 font-mono text-[12px] leading-relaxed">
            <div className="text-[var(--color-fg-muted)]">
              {dotLabel} {labelX}·{labelW} ={' '}
              <span className="font-semibold text-[var(--color-fg)]">
                {formatNumber(stats.dot)}
              </span>
            </div>
            <div className="text-[var(--color-fg-muted)]">
              {normLabel} ‖{labelX}‖ ={' '}
              <span className="text-[var(--color-fg)]">{formatNumber(stats.normX)}</span>
              {'  '}‖{labelW}‖ ={' '}
              <span className="text-[var(--color-fg)]">{formatNumber(stats.normW)}</span>
            </div>
            <div className="text-[var(--color-fg-muted)]">
              {angleLabel} θ ={' '}
              <span className="text-[var(--color-fg)]">{stats.angleDeg.toFixed(1)}°</span>
            </div>
          </div>

          <p className="text-[12px] text-[var(--color-fg-dim)] italic">{helpText}</p>
        </div>
      </div>
    </figure>
  );
}
