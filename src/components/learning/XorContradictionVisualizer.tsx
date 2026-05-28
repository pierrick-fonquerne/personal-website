import { useMemo, useState, type JSX } from 'react';

type Locale = 'fr' | 'en';

interface XorContradictionVisualizerProps {
  locale?: Locale;
}

interface Dictionary {
  readonly title: string;
  readonly sliderW1: string;
  readonly sliderW2: string;
  readonly sliderB: string;
  readonly inequalitiesHeader: string;
  readonly satisfiedLabel: string;
  readonly explainBtn: string;
  readonly hideExplainBtn: string;
  readonly explanationTitle: string;
  readonly presetORLike: string;
  readonly presetANDLike: string;
  readonly presetReset: string;
  readonly explanation: string;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: 'Pourquoi XOR est impossible',
    sliderW1: 'w₁',
    sliderW2: 'w₂',
    sliderB: 'b',
    inequalitiesHeader: 'Les quatre inéquations XOR',
    satisfiedLabel: 'Inéquations satisfaites',
    explainBtn: 'Pourquoi 4/4 est impossible',
    hideExplainBtn: 'Masquer la démonstration',
    explanationTitle: 'Démonstration par contradiction',
    presetORLike: 'Essayer une frontière de type OR',
    presetANDLike: 'Essayer une frontière de type AND',
    presetReset: 'Réinitialiser',
    explanation:
      "Supposons (1), (2), (3), (4) toutes vraies. Additionnons (2) et (3) : w₁ + w₂ + 2b ≥ 0, soit w₁ + w₂ ≥ -2b. Comme (1) impose b < 0, on a -2b > 0, donc w₁ + w₂ > 0. En ajoutant b de chaque côté : w₁ + w₂ + b ≥ -2b + b = -b. Et puisque b < 0, on a -b > 0, donc w₁ + w₂ + b > 0. Mais (4) impose w₁ + w₂ + b < 0. Contradiction : la même quantité ne peut pas être à la fois strictement négative et strictement positive.",
  },
  en: {
    title: 'Why XOR is impossible',
    sliderW1: 'w₁',
    sliderW2: 'w₂',
    sliderB: 'b',
    inequalitiesHeader: 'The four XOR inequalities',
    satisfiedLabel: 'Inequalities satisfied',
    explainBtn: 'Why 4/4 is impossible',
    hideExplainBtn: 'Hide the proof',
    explanationTitle: 'Proof by contradiction',
    presetORLike: 'Try an OR-like boundary',
    presetANDLike: 'Try an AND-like boundary',
    presetReset: 'Reset',
    explanation:
      'Suppose (1), (2), (3), (4) all hold. Add (2) and (3): w₁ + w₂ + 2b ≥ 0, i.e. w₁ + w₂ ≥ -2b. Since (1) forces b < 0, we have -2b > 0, hence w₁ + w₂ > 0. Add b to both sides: w₁ + w₂ + b ≥ -2b + b = -b. Since b < 0, we have -b > 0, hence w₁ + w₂ + b > 0. But (4) forces w₁ + w₂ + b < 0. Contradiction: the same quantity cannot be both strictly negative and strictly positive.',
  },
};

const VIEW = 380;
const PAD = 50;
const DATA_MIN = -0.4;
const DATA_MAX = 1.4;
const DATA_RANGE = DATA_MAX - DATA_MIN;
const INNER = VIEW - 2 * PAD;

const dataToSvgX = (dx: number): number => PAD + ((dx - DATA_MIN) / DATA_RANGE) * INNER;
const dataToSvgY = (dy: number): number => VIEW - PAD - ((dy - DATA_MIN) / DATA_RANGE) * INNER;

interface XorPoint {
  readonly x: readonly [number, number];
  readonly targetXor: 0 | 1;
}

const XOR_POINTS: readonly XorPoint[] = [
  { x: [0, 0], targetXor: 0 },
  { x: [1, 0], targetXor: 1 },
  { x: [0, 1], targetXor: 1 },
  { x: [1, 1], targetXor: 0 },
];

interface Inequality {
  readonly id: number;
  readonly point: string;
  readonly target: 0 | 1;
  readonly expression: string;
  readonly value: number;
  readonly satisfied: boolean;
}

function evaluateInequalities(w1: number, w2: number, b: number): {
  inequalities: readonly Inequality[];
  satisfiedCount: number;
} {
  const inequalities: Inequality[] = [
    {
      id: 1,
      point: '(0,0)',
      target: 0,
      expression: 'b < 0',
      value: b,
      satisfied: b < 0,
    },
    {
      id: 2,
      point: '(1,0)',
      target: 1,
      expression: 'w₁ + b ≥ 0',
      value: w1 + b,
      satisfied: w1 + b >= 0,
    },
    {
      id: 3,
      point: '(0,1)',
      target: 1,
      expression: 'w₂ + b ≥ 0',
      value: w2 + b,
      satisfied: w2 + b >= 0,
    },
    {
      id: 4,
      point: '(1,1)',
      target: 0,
      expression: 'w₁ + w₂ + b < 0',
      value: w1 + w2 + b,
      satisfied: w1 + w2 + b < 0,
    },
  ];
  return {
    inequalities,
    satisfiedCount: inequalities.filter((i) => i.satisfied).length,
  };
}

function computeBoundary(w1: number, w2: number, b: number): { x1: number; y1: number; x2: number; y2: number } | null {
  const EPS = 1e-9;
  if (Math.abs(w2) >= EPS) {
    const yLeft = -(w1 * DATA_MIN + b) / w2;
    const yRight = -(w1 * DATA_MAX + b) / w2;
    return {
      x1: dataToSvgX(DATA_MIN),
      y1: dataToSvgY(yLeft),
      x2: dataToSvgX(DATA_MAX),
      y2: dataToSvgY(yRight),
    };
  }
  if (Math.abs(w1) >= EPS) {
    const xc = -b / w1;
    if (xc < DATA_MIN || xc > DATA_MAX) return null;
    return {
      x1: dataToSvgX(xc),
      y1: dataToSvgY(DATA_MIN),
      x2: dataToSvgX(xc),
      y2: dataToSvgY(DATA_MAX),
    };
  }
  return null;
}

function formatSigned(n: number): string {
  if (Math.abs(n) < 0.005) return '0.00';
  return n.toFixed(2);
}

function predictXor(point: XorPoint, w1: number, w2: number, b: number): 0 | 1 {
  return w1 * point.x[0] + w2 * point.x[1] + b >= 0 ? 1 : 0;
}

export default function XorContradictionVisualizer({
  locale = 'fr',
}: XorContradictionVisualizerProps): JSX.Element {
  const t = DICT[locale];
  const [w1, setW1] = useState<number>(1);
  const [w2, setW2] = useState<number>(1);
  const [b, setB] = useState<number>(-0.5);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const { inequalities, satisfiedCount } = useMemo(
    () => evaluateInequalities(w1, w2, b),
    [w1, w2, b],
  );
  const boundary = useMemo(() => computeBoundary(w1, w2, b), [w1, w2, b]);

  const applyPreset = (preset: 'OR' | 'AND' | 'reset'): void => {
    if (preset === 'OR') {
      setW1(1);
      setW2(1);
      setB(-0.5);
    } else if (preset === 'AND') {
      setW1(1);
      setW2(1);
      setB(-1.5);
    } else {
      setW1(0);
      setW2(0);
      setB(0);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.3fr)',
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
          style={{ width: '100%', height: 'auto', display: 'block' }}
          role="img"
          aria-label={t.title}
        >
          <rect width={VIEW} height={VIEW} fill="var(--bg-primary, #0f0f1a)" rx={10} />
          {[0, 1].map((g) => (
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
              <text
                x={dataToSvgX(g)}
                y={VIEW - PAD + 16}
                fill="var(--text-muted, #64748b)"
                fontSize={11}
                textAnchor="middle"
              >
                {g}
              </text>
              <text
                x={PAD - 8}
                y={dataToSvgY(g) + 4}
                fill="var(--text-muted, #64748b)"
                fontSize={11}
                textAnchor="end"
              >
                {g}
              </text>
            </g>
          ))}
          {boundary && (
            <line
              x1={boundary.x1}
              y1={boundary.y1}
              x2={boundary.x2}
              y2={boundary.y2}
              stroke="var(--accent-violet, #a78bfa)"
              strokeWidth={2.5}
              strokeDasharray="6,4"
            />
          )}
          {XOR_POINTS.map((p, idx) => {
            const cx = dataToSvgX(p.x[0]);
            const cy = dataToSvgY(p.x[1]);
            const pred = predictXor(p, w1, w2, b);
            const correct = pred === p.targetXor;
            const fill =
              p.targetXor === 1 ? 'var(--accent-orange, #fb923c)' : 'var(--text-muted, #64748b)';
            const stroke = correct
              ? 'var(--accent-green, #4ade80)'
              : 'var(--accent-red, #f87171)';
            return (
              <g key={`xor-${idx}`}>
                <circle cx={cx} cy={cy} r={13} fill={fill} stroke={stroke} strokeWidth={3} />
                <text
                  x={cx}
                  y={cy + 4}
                  fill={p.targetXor === 1 ? 'var(--bg-primary, #0f0f1a)' : 'var(--text-primary, #e2e8f0)'}
                  fontSize={11}
                  fontWeight={700}
                  textAnchor="middle"
                >
                  {p.targetXor}
                </text>
              </g>
            );
          })}
        </svg>
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
          <div key={label} style={{ marginBottom: '12px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px',
                fontSize: '12px',
                color: 'var(--text-muted, #64748b)',
              }}
            >
              <span>{label}</span>
              <span
                style={{
                  color: 'var(--accent-violet, #a78bfa)',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {formatSigned(value)}
              </span>
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
        <div style={{ display: 'flex', gap: '6px', marginTop: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {(
            [
              { label: t.presetORLike, key: 'OR' as const },
              { label: t.presetANDLike, key: 'AND' as const },
              { label: t.presetReset, key: 'reset' as const },
            ]
          ).map(({ label, key }) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              style={{
                padding: '4px 10px',
                background: 'transparent',
                border: '1px solid var(--border, #2d2d50)',
                color: 'var(--text-secondary, #94a3b8)',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-muted, #64748b)',
            marginBottom: '8px',
          }}
        >
          {t.inequalitiesHeader}
        </div>
        <div
          style={{
            background: 'var(--bg-primary, #0f0f1a)',
            border: '1px solid var(--border, #2d2d50)',
            borderRadius: '8px',
            padding: '10px 12px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '12px',
          }}
        >
          {inequalities.map((ineq) => (
            <div
              key={ineq.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                color: ineq.satisfied
                  ? 'var(--accent-green, #4ade80)'
                  : 'var(--accent-red, #f87171)',
              }}
            >
              <span>
                ({ineq.id}) {ineq.point} → {ineq.target} : {ineq.expression}
              </span>
              <span style={{ fontWeight: 700 }}>{ineq.satisfied ? '✓' : '✗'}</span>
            </div>
          ))}
          <div
            style={{
              borderTop: '1px solid var(--border, #2d2d50)',
              paddingTop: '6px',
              marginTop: '6px',
              color: 'var(--text-secondary, #94a3b8)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>{t.satisfiedLabel}</span>
            <span
              style={{
                color:
                  satisfiedCount === 4
                    ? 'var(--accent-green, #4ade80)'
                    : 'var(--accent-violet, #a78bfa)',
                fontWeight: 700,
              }}
            >
              {satisfiedCount} / 4
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowExplanation((s) => !s)}
          style={{
            marginTop: '14px',
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid var(--accent-violet, #a78bfa)',
            color: 'var(--accent-violet, #a78bfa)',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            width: '100%',
            fontWeight: 600,
          }}
        >
          {showExplanation ? t.hideExplainBtn : t.explainBtn}
        </button>
        {showExplanation && (
          <div
            style={{
              marginTop: '10px',
              padding: '12px 14px',
              background: 'rgba(167, 139, 250, 0.08)',
              borderLeft: '3px solid var(--accent-violet, #a78bfa)',
              borderRadius: '0 6px 6px 0',
              fontSize: '12px',
              color: 'var(--text-secondary, #94a3b8)',
              lineHeight: 1.65,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: '6px',
                color: 'var(--accent-violet, #a78bfa)',
              }}
            >
              {t.explanationTitle}
            </div>
            {t.explanation}
          </div>
        )}
      </div>
    </div>
  );
}
