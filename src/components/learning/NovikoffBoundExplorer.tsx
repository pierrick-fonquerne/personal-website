import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from 'react';
import {
  computeNovikoffMetrics,
  predict,
  runPerceptronToConvergence,
  type Sample,
  type Vector2,
} from '../../lib/perceptron';

type Locale = 'fr' | 'en';

interface NovikoffBoundExplorerProps {
  locale?: Locale;
  initialPoints?: readonly Sample[];
}

interface Dictionary {
  readonly title: string;
  readonly dragHint: string;
  readonly metricsHeader: string;
  readonly metricR: string;
  readonly metricGamma: string;
  readonly metricStepsActual: string;
  readonly metricStepsBound: string;
  readonly metricRatio: string;
  readonly nonSeparable: string;
  readonly errorsPerEpoch: string;
  readonly btnReset: string;
  readonly converged: string;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: 'Explorateur de la borne de Novikoff',
    dragHint: 'Glisse les points pour modifier R et γ.',
    metricsHeader: 'Métriques calculées en direct',
    metricR: 'R (rayon)',
    metricGamma: 'γ (marge atteinte)',
    metricStepsActual: 'T effectif',
    metricStepsBound: 'Borne (R/γ)²',
    metricRatio: 'Ratio',
    nonSeparable: "Non séparable : Novikoff ne s'applique pas.",
    errorsPerEpoch: 'Erreurs par époque',
    btnReset: 'Réinitialiser les points',
    converged: 'Convergé.',
  },
  en: {
    title: 'Novikoff bound explorer',
    dragHint: 'Drag the points to change R and γ.',
    metricsHeader: 'Live metrics',
    metricR: 'R (radius)',
    metricGamma: 'γ (achieved margin)',
    metricStepsActual: 'Actual T',
    metricStepsBound: 'Bound (R/γ)²',
    metricRatio: 'Ratio',
    nonSeparable: 'Not separable: Novikoff does not apply.',
    errorsPerEpoch: 'Errors per epoch',
    btnReset: 'Reset points',
    converged: 'Converged.',
  },
};

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

const DEFAULT_POINTS: readonly Sample[] = [
  { x: [-1, -1], y: -1 },
  { x: [-0.8, -1.2], y: -1 },
  { x: [-1.2, -0.6], y: -1 },
  { x: [1, 1], y: 1 },
  { x: [1.2, 0.8], y: 1 },
  { x: [0.8, 1.2], y: 1 },
];

interface ComputedState {
  R: number;
  gamma: number;
  bound: number;
  steps: number;
  converged: boolean;
  errorHistory: readonly number[];
  separator: { w: Vector2; b: number } | null;
}

function computeState(points: readonly Sample[]): ComputedState {
  const convergence = runPerceptronToConvergence(points, { maxEpochs: 300, learningRate: 1 });
  const metrics = computeNovikoffMetrics(points, convergence.w, convergence.b);
  return {
    R: metrics.R,
    gamma: metrics.gamma,
    bound: metrics.bound,
    steps: convergence.steps,
    converged: convergence.converged,
    errorHistory: convergence.errorHistory,
    separator: convergence.converged ? { w: convergence.w, b: convergence.b } : null,
  };
}

function formatNumber(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '∞';
  if (Math.abs(n) < 0.005) return '0.00';
  return n.toFixed(digits);
}

function computeBoundary(
  w: Vector2,
  b: number,
): { x1: number; y1: number; x2: number; y2: number } | null {
  const EPS = 1e-9;
  if (Math.abs(w[1]) >= EPS) {
    const yLeft = -(w[0] * DATA_MIN + b) / w[1];
    const yRight = -(w[0] * DATA_MAX + b) / w[1];
    return {
      x1: dataToSvgX(DATA_MIN),
      y1: dataToSvgY(yLeft),
      x2: dataToSvgX(DATA_MAX),
      y2: dataToSvgY(yRight),
    };
  }
  if (Math.abs(w[0]) >= EPS) {
    const xc = -b / w[0];
    return {
      x1: dataToSvgX(xc),
      y1: dataToSvgY(DATA_MIN),
      x2: dataToSvgX(xc),
      y2: dataToSvgY(DATA_MAX),
    };
  }
  return null;
}

export default function NovikoffBoundExplorer({
  locale = 'fr',
  initialPoints = DEFAULT_POINTS,
}: NovikoffBoundExplorerProps): JSX.Element {
  const t = DICT[locale];
  const [points, setPoints] = useState<readonly Sample[]>(() =>
    initialPoints.map((p) => ({ x: [...p.x] as Vector2, y: p.y })),
  );
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const state = useMemo(() => computeState(points), [points]);

  const handlePointerDown =
    (idx: number) =>
    (e: MouseEvent<SVGCircleElement>): void => {
      e.preventDefault();
      setDraggingIdx(idx);
    };

  const handlePointerMove = useCallback(
    (e: globalThis.MouseEvent): void => {
      if (draggingIdx === null || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * VIEW;
      const sy = ((e.clientY - rect.top) / rect.height) * VIEW;
      let dx = svgToDataX(sx);
      let dy = svgToDataY(sy);
      dx = Math.max(DATA_MIN + 0.05, Math.min(DATA_MAX - 0.05, dx));
      dy = Math.max(DATA_MIN + 0.05, Math.min(DATA_MAX - 0.05, dy));
      setPoints((current) =>
        current.map((p, i) => (i === draggingIdx ? { x: [dx, dy] as Vector2, y: p.y } : p)),
      );
    },
    [draggingIdx],
  );

  const handlePointerUp = useCallback((): void => {
    setDraggingIdx(null);
  }, []);

  useEffect(() => {
    if (draggingIdx === null) return;
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [draggingIdx, handlePointerMove, handlePointerUp]);

  const handleReset = (): void => {
    setPoints(initialPoints.map((p) => ({ x: [...p.x] as Vector2, y: p.y })));
  };

  const boundary = state.separator ? computeBoundary(state.separator.w, state.separator.b) : null;
  const R_pixels = (state.R / DATA_RANGE) * INNER;
  const ratio = Number.isFinite(state.bound) && state.bound > 0 ? state.steps / state.bound : null;

  const errorMax = Math.max(1, ...state.errorHistory);
  const sparklineWidth = 200;
  const sparklineHeight = 50;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
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
          ref={svgRef}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }}
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
            strokeWidth={1}
          />
          <line
            x1={dataToSvgX(0)}
            y1={PAD}
            x2={dataToSvgX(0)}
            y2={VIEW - PAD}
            stroke="var(--text-muted, #64748b)"
            strokeWidth={1}
          />
          {state.R > 0 && (
            <circle
              cx={dataToSvgX(0)}
              cy={dataToSvgY(0)}
              r={R_pixels}
              fill="none"
              stroke="var(--accent-orange, #fb923c)"
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.5}
            />
          )}
          {boundary && (
            <line
              x1={boundary.x1}
              y1={boundary.y1}
              x2={boundary.x2}
              y2={boundary.y2}
              stroke="var(--accent-violet, #a78bfa)"
              strokeWidth={2}
              strokeDasharray="6,4"
            />
          )}
          {points.map((p, idx) => {
            const cx = dataToSvgX(p.x[0]);
            const cy = dataToSvgY(p.x[1]);
            const fill = p.y === 1 ? 'var(--accent-orange, #fb923c)' : 'var(--text-muted, #64748b)';
            const correctness =
              state.separator && predict(p, state.separator.w, state.separator.b) === p.y;
            const stroke = correctness
              ? 'var(--accent-green, #4ade80)'
              : 'var(--accent-red, #f87171)';
            const handleKey = (e: ReactKeyboardEvent<SVGCircleElement>): void => {
              const STEP = 0.1;
              let dx = 0;
              let dy = 0;
              if (e.key === 'ArrowLeft') dx = -STEP;
              else if (e.key === 'ArrowRight') dx = STEP;
              else if (e.key === 'ArrowUp') dy = STEP;
              else if (e.key === 'ArrowDown') dy = -STEP;
              else return;
              e.preventDefault();
              setPoints((current) =>
                current.map((q, i) =>
                  i === idx
                    ? {
                        x: [
                          Math.max(DATA_MIN + 0.05, Math.min(DATA_MAX - 0.05, q.x[0] + dx)),
                          Math.max(DATA_MIN + 0.05, Math.min(DATA_MAX - 0.05, q.x[1] + dy)),
                        ] as Vector2,
                        y: q.y,
                      }
                    : q,
                ),
              );
            };
            return (
              <circle
                key={`p-${idx}`}
                cx={cx}
                cy={cy}
                r={10}
                fill={fill}
                stroke={stroke}
                strokeWidth={2.5}
                style={{ cursor: 'grab' }}
                onMouseDown={handlePointerDown(idx)}
                tabIndex={0}
                role="button"
                aria-label={`Point ${idx + 1}, class ${p.y === 1 ? '+1' : '-1'}, at (${p.x[0].toFixed(2)}, ${p.x[1].toFixed(2)})`}
                onKeyDown={handleKey}
              />
            );
          })}
        </svg>
        <div
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--text-muted, #64748b)',
            textAlign: 'center',
          }}
        >
          {t.dragHint}
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
        {!state.converged && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              marginBottom: '12px',
              background: 'rgba(248, 113, 113, 0.1)',
              color: 'var(--accent-red, #f87171)',
              border: '1px solid var(--accent-red, #f87171)',
            }}
          >
            {t.nonSeparable}
          </div>
        )}
        <div
          style={{
            background: 'var(--bg-primary, #0f0f1a)',
            border: '1px solid var(--border, #2d2d50)',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '14px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '12px',
            lineHeight: 1.9,
            color: 'var(--text-secondary, #94a3b8)',
          }}
        >
          <div>
            {t.metricR} :{' '}
            <span style={{ color: 'var(--accent-orange, #fb923c)' }}>{formatNumber(state.R)}</span>
          </div>
          <div>
            {t.metricGamma} :{' '}
            <span
              style={{
                color:
                  state.gamma > 0 ? 'var(--accent-green, #4ade80)' : 'var(--accent-red, #f87171)',
              }}
            >
              {formatNumber(state.gamma, 3)}
            </span>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--border, #2d2d50)',
              paddingTop: '6px',
              marginTop: '6px',
            }}
          >
            {t.metricStepsActual} :{' '}
            <span style={{ color: 'var(--accent-blue, #60a5fa)', fontWeight: 700 }}>
              {state.steps}
            </span>
          </div>
          <div>
            {t.metricStepsBound} :{' '}
            <span style={{ color: 'var(--accent-violet, #a78bfa)', fontWeight: 700 }}>
              {formatNumber(state.bound, 1)}
            </span>
          </div>
          {ratio !== null && (
            <div>
              {t.metricRatio} :{' '}
              <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                {(ratio * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-muted, #64748b)',
            marginBottom: '6px',
          }}
        >
          {t.errorsPerEpoch}
        </div>
        <svg
          viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            background: 'var(--bg-primary, #0f0f1a)',
            border: '1px solid var(--border, #2d2d50)',
            borderRadius: '6px',
          }}
          role="img"
        >
          {state.errorHistory.length > 1 && (
            <polyline
              fill="none"
              stroke="var(--accent-violet, #a78bfa)"
              strokeWidth={1.5}
              points={state.errorHistory
                .map((e, i, arr) => {
                  const x = (i / Math.max(1, arr.length - 1)) * (sparklineWidth - 8) + 4;
                  const y = sparklineHeight - 4 - (e / errorMax) * (sparklineHeight - 8);
                  return `${x},${y}`;
                })
                .join(' ')}
            />
          )}
        </svg>
        <button
          type="button"
          onClick={handleReset}
          style={{
            marginTop: '14px',
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid var(--text-muted, #64748b)',
            color: 'var(--text-muted, #64748b)',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            width: '100%',
            fontWeight: 600,
          }}
        >
          {t.btnReset}
        </button>
      </div>
    </div>
  );
}
