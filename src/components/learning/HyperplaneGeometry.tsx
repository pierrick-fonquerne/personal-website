import { useMemo, useState, type JSX, type MouseEvent } from 'react';

type Locale = 'fr' | 'en';

interface HyperplaneGeometryProps {
  locale?: Locale;
  initialW1?: number;
  initialW2?: number;
  initialB?: number;
}

interface Dictionary {
  readonly title: string;
  readonly hyperplaneEq: string;
  readonly sliderW1: string;
  readonly sliderW2: string;
  readonly sliderB: string;
  readonly probeIntro: string;
  readonly probeCoords: string;
  readonly signedDistance: string;
  readonly resetProbe: string;
  readonly emptyProbeHint: string;
  readonly degenerateHint: string;
  readonly positiveSide: string;
  readonly negativeSide: string;
  readonly normalLabel: string;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: "Géométrie de l'hyperplan",
    hyperplaneEq: "Hyperplan : w · x + b = 0",
    sliderW1: 'w₁',
    sliderW2: 'w₂',
    sliderB: 'b',
    probeIntro: 'Clique dans la grille pour placer un point sondé.',
    probeCoords: 'Point sondé',
    signedDistance: 'Distance signée',
    resetProbe: 'Retirer le point',
    emptyProbeHint: 'Aucun point sondé pour le moment.',
    degenerateHint: 'Pas d\'hyperplan : w est nul.',
    positiveSide: 'Côté positif',
    negativeSide: 'Côté négatif',
    normalLabel: 'w (normal)',
  },
  en: {
    title: 'Hyperplane geometry',
    hyperplaneEq: 'Hyperplane: w · x + b = 0',
    sliderW1: 'w₁',
    sliderW2: 'w₂',
    sliderB: 'b',
    probeIntro: 'Click inside the grid to place a probe point.',
    probeCoords: 'Probe point',
    signedDistance: 'Signed distance',
    resetProbe: 'Remove probe',
    emptyProbeHint: 'No probe point yet.',
    degenerateHint: 'No hyperplane: w is zero.',
    positiveSide: 'Positive side',
    negativeSide: 'Negative side',
    normalLabel: 'w (normal)',
  },
};

const EPSILON = 1e-9;
const VIEW = 420;
const PAD = 40;
const DATA_MIN = -2;
const DATA_MAX = 2;
const DATA_RANGE = DATA_MAX - DATA_MIN;
const INNER = VIEW - 2 * PAD;

const dataToSvgX = (dx: number): number => PAD + ((dx - DATA_MIN) / DATA_RANGE) * INNER;
const dataToSvgY = (dy: number): number => VIEW - PAD - ((dy - DATA_MIN) / DATA_RANGE) * INNER;
const svgToDataX = (sx: number): number => DATA_MIN + ((sx - PAD) / INNER) * DATA_RANGE;
const svgToDataY = (sy: number): number => DATA_MIN + ((VIEW - PAD - sy) / INNER) * DATA_RANGE;

interface LineEnds {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

function computeHyperplaneEnds(w1: number, w2: number, b: number): LineEnds | null {
  if (Math.abs(w2) >= EPSILON) {
    const xLeft = DATA_MIN;
    const xRight = DATA_MAX;
    const yLeft = -(w1 * xLeft + b) / w2;
    const yRight = -(w1 * xRight + b) / w2;
    return {
      x1: dataToSvgX(xLeft),
      y1: dataToSvgY(yLeft),
      x2: dataToSvgX(xRight),
      y2: dataToSvgY(yRight),
    };
  }
  if (Math.abs(w1) >= EPSILON) {
    const x = -b / w1;
    if (x < DATA_MIN || x > DATA_MAX) return null;
    return {
      x1: dataToSvgX(x),
      y1: dataToSvgY(DATA_MIN),
      x2: dataToSvgX(x),
      y2: dataToSvgY(DATA_MAX),
    };
  }
  return null;
}

function formatSigned(n: number): string {
  if (Math.abs(n) < 0.005) return '0.00';
  return n.toFixed(2);
}

export default function HyperplaneGeometry({
  locale = 'fr',
  initialW1 = 1,
  initialW2 = 0.5,
  initialB = -0.5,
}: HyperplaneGeometryProps): JSX.Element {
  const t = DICT[locale];
  const [w1, setW1] = useState<number>(initialW1);
  const [w2, setW2] = useState<number>(initialW2);
  const [b, setB] = useState<number>(initialB);
  const [probe, setProbe] = useState<{ x: number; y: number } | null>(null);

  const lineEnds = useMemo(() => computeHyperplaneEnds(w1, w2, b), [w1, w2, b]);
  const normW = useMemo(() => Math.sqrt(w1 * w1 + w2 * w2), [w1, w2]);
  const hasNormal = normW >= EPSILON;

  const arrowDataEnd = useMemo(() => {
    if (!hasNormal) return null;
    const scale = 1;
    return { x: (w1 / normW) * scale, y: (w2 / normW) * scale };
  }, [hasNormal, w1, w2, normW]);

  const signedDistance = useMemo(() => {
    if (!probe || !hasNormal) return null;
    return (w1 * probe.x + w2 * probe.y + b) / normW;
  }, [probe, w1, w2, b, normW, hasNormal]);

  const probeProjection = useMemo(() => {
    if (!probe || signedDistance === null || !arrowDataEnd) return null;
    return {
      x: probe.x - signedDistance * arrowDataEnd.x,
      y: probe.y - signedDistance * arrowDataEnd.y,
    };
  }, [probe, signedDistance, arrowDataEnd]);

  const handleSvgClick = (e: MouseEvent<SVGSVGElement>): void => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * VIEW;
    const sy = ((e.clientY - rect.top) / rect.height) * VIEW;
    const dx = svgToDataX(sx);
    const dy = svgToDataY(sy);
    if (dx < DATA_MIN || dx > DATA_MAX || dy < DATA_MIN || dy > DATA_MAX) return;
    setProbe({ x: dx, y: dy });
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
        gap: '24px',
        alignItems: 'start',
        padding: '20px',
        background: 'var(--bg-secondary, #14142a)',
        border: '1px solid var(--border, #2d2d50)',
        borderRadius: '12px',
        margin: '24px 0',
      }}
    >
      <div>
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: 'auto', cursor: 'crosshair', display: 'block' }}
          onClick={handleSvgClick}
          role="img"
          aria-label={t.title}
        >
          <rect width={VIEW} height={VIEW} fill="var(--bg-primary, #0f0f1a)" rx={10} />
          {[-1, 0, 1].map((g) => (
            <g key={`grid-${g}`}>
              <line
                x1={dataToSvgX(g)}
                y1={PAD}
                x2={dataToSvgX(g)}
                y2={VIEW - PAD}
                stroke="var(--border, #2d2d50)"
                strokeWidth={0.6}
                strokeDasharray="3,3"
              />
              <line
                x1={PAD}
                y1={dataToSvgY(g)}
                x2={VIEW - PAD}
                y2={dataToSvgY(g)}
                stroke="var(--border, #2d2d50)"
                strokeWidth={0.6}
                strokeDasharray="3,3"
              />
            </g>
          ))}
          <line
            x1={PAD}
            y1={dataToSvgY(0)}
            x2={VIEW - PAD}
            y2={dataToSvgY(0)}
            stroke="var(--text-muted, #64748b)"
            strokeWidth={1.5}
          />
          <line
            x1={dataToSvgX(0)}
            y1={PAD}
            x2={dataToSvgX(0)}
            y2={VIEW - PAD}
            stroke="var(--text-muted, #64748b)"
            strokeWidth={1.5}
          />
          <text x={VIEW - PAD + 6} y={dataToSvgY(0) + 4} fill="var(--text-muted, #64748b)" fontSize={12}>
            x
          </text>
          <text x={dataToSvgX(0) - 4} y={PAD - 8} fill="var(--text-muted, #64748b)" fontSize={12} textAnchor="end">
            y
          </text>
          {lineEnds && (
            <line
              x1={lineEnds.x1}
              y1={lineEnds.y1}
              x2={lineEnds.x2}
              y2={lineEnds.y2}
              stroke="var(--accent-violet, #a78bfa)"
              strokeWidth={2.5}
            />
          )}
          {arrowDataEnd && (
            <g>
              <defs>
                <marker
                  id="hg-arrow"
                  viewBox="0 0 10 10"
                  refX={8}
                  refY={5}
                  markerWidth={6}
                  markerHeight={6}
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L10,5 L0,10 z" fill="var(--accent-orange, #fb923c)" />
                </marker>
              </defs>
              <line
                x1={dataToSvgX(0)}
                y1={dataToSvgY(0)}
                x2={dataToSvgX(arrowDataEnd.x)}
                y2={dataToSvgY(arrowDataEnd.y)}
                stroke="var(--accent-orange, #fb923c)"
                strokeWidth={2.5}
                markerEnd="url(#hg-arrow)"
              />
              <text
                x={dataToSvgX(arrowDataEnd.x) + 8}
                y={dataToSvgY(arrowDataEnd.y) - 8}
                fill="var(--accent-orange, #fb923c)"
                fontSize={12}
                fontWeight={600}
              >
                {t.normalLabel}
              </text>
              <text
                x={dataToSvgX(arrowDataEnd.x * 1.5)}
                y={dataToSvgY(arrowDataEnd.y * 1.5)}
                fill="var(--accent-green, #4ade80)"
                fontSize={14}
                fontWeight={700}
                textAnchor="middle"
              >
                +
              </text>
              <text
                x={dataToSvgX(-arrowDataEnd.x * 1.5)}
                y={dataToSvgY(-arrowDataEnd.y * 1.5)}
                fill="var(--accent-red, #f87171)"
                fontSize={14}
                fontWeight={700}
                textAnchor="middle"
              >
                −
              </text>
            </g>
          )}
          {probe && probeProjection && (
            <g>
              <line
                x1={dataToSvgX(probe.x)}
                y1={dataToSvgY(probe.y)}
                x2={dataToSvgX(probeProjection.x)}
                y2={dataToSvgY(probeProjection.y)}
                stroke="var(--accent-blue, #60a5fa)"
                strokeWidth={1.5}
                strokeDasharray="4,3"
              />
              <circle
                cx={dataToSvgX(probeProjection.x)}
                cy={dataToSvgY(probeProjection.y)}
                r={3}
                fill="var(--accent-blue, #60a5fa)"
              />
            </g>
          )}
          {probe && (
            <circle
              cx={dataToSvgX(probe.x)}
              cy={dataToSvgY(probe.y)}
              r={6}
              fill="var(--accent-blue, #60a5fa)"
              stroke="var(--bg-primary, #0f0f1a)"
              strokeWidth={2}
            />
          )}
        </svg>
        <div
          style={{
            marginTop: '10px',
            fontSize: '12px',
            color: 'var(--text-muted, #64748b)',
            textAlign: 'center',
          }}
        >
          {t.hyperplaneEq}
        </div>
      </div>
      <div>
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--text-primary, #e2e8f0)',
            marginTop: 0,
            marginBottom: '14px',
          }}
        >
          {t.title}
        </h3>
        {(
          [
            { label: t.sliderW1, value: w1, set: setW1 },
            { label: t.sliderW2, value: w2, set: setW2 },
            { label: t.sliderB, value: b, set: setB },
          ] as const
        ).map(({ label, value, set }) => (
          <div key={label} style={{ marginBottom: '14px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px',
                fontSize: '13px',
                color: 'var(--text-secondary, #94a3b8)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              <span>{label}</span>
              <span style={{ color: 'var(--accent-violet, #a78bfa)' }}>{formatSigned(value)}</span>
            </div>
            <input
              type="range"
              min={-2}
              max={2}
              step={0.05}
              value={value}
              onChange={(e) => set(Number(e.target.value))}
              aria-label={label}
              style={{ width: '100%' }}
            />
          </div>
        ))}
        <div
          style={{
            marginTop: '18px',
            padding: '12px 14px',
            background: 'var(--bg-primary, #0f0f1a)',
            border: '1px solid var(--border, #2d2d50)',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--text-secondary, #94a3b8)',
            lineHeight: 1.6,
          }}
        >
          {!hasNormal && (
            <div style={{ color: 'var(--accent-red, #f87171)' }}>{t.degenerateHint}</div>
          )}
          {hasNormal && !probe && <div>{t.probeIntro}</div>}
          {hasNormal && probe && signedDistance !== null && (
            <div>
              <div style={{ marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted, #64748b)' }}>{t.probeCoords}</span>{' '}
                <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                  ({formatSigned(probe.x)}, {formatSigned(probe.y)})
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted, #64748b)' }}>{t.signedDistance}</span>{' '}
                <span
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    color:
                      signedDistance > 0
                        ? 'var(--accent-green, #4ade80)'
                        : signedDistance < 0
                          ? 'var(--accent-red, #f87171)'
                          : 'var(--text-muted, #64748b)',
                    fontWeight: 700,
                  }}
                >
                  {formatSigned(signedDistance)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setProbe(null)}
                style={{
                  padding: '6px 10px',
                  background: 'transparent',
                  border: '1px solid var(--border, #2d2d50)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary, #94a3b8)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {t.resetProbe}
              </button>
            </div>
          )}
          {hasNormal && !probe && (
            <div style={{ marginTop: '8px', color: 'var(--text-muted, #64748b)', fontSize: '12px' }}>
              {t.emptyProbeHint}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
