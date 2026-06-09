import { useMemo, useState, type JSX } from 'react';
import { square, squareDeriv, numericalDerivative } from './calculus/derivatives';

type Locale = 'fr' | 'en';

interface TangentSlopeExplorerProps {
  locale?: Locale;
}

interface Dictionary {
  readonly title: string;
  readonly pointLabel: string;
  readonly stepLabel: string;
  readonly secantSlope: string;
  readonly exactSlope: string;
  readonly gap: string;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: "La dérivée, c'est la pente d'une tangente",
    pointLabel: 'Position x',
    stepLabel: 'Écart h',
    secantSlope: 'Pente de la sécante',
    exactSlope: "Pente exacte f'(x)",
    gap: 'Écart',
  },
  en: {
    title: 'The derivative is the slope of a tangent',
    pointLabel: 'Position x',
    stepLabel: 'Step h',
    secantSlope: 'Secant slope',
    exactSlope: "Exact slope f'(x)",
    gap: 'Gap',
  },
};

const VW = 320;
const VH = 240;
const PAD = 28;
const X_LO = -3;
const X_HI = 3;
const Y_LO = -1;
const Y_HI = 9.5;

function toSvgX(x: number): number {
  return PAD + ((x - X_LO) / (X_HI - X_LO)) * (VW - 2 * PAD);
}

function toSvgY(y: number): number {
  return VH - PAD - ((y - Y_LO) / (Y_HI - Y_LO)) * (VH - 2 * PAD);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function formatNum(n: number, locale: Locale, digits = 2): string {
  const rounded = Math.abs(n) < 0.005 ? 0 : n;
  const text = rounded.toFixed(digits);
  return locale === 'fr' ? text.replace('.', ',') : text;
}

const CURVE_POINTS = 60;

function buildCurvePath(): string {
  const pts: string[] = [];
  for (let i = 0; i <= CURVE_POINTS; i += 1) {
    const x = X_LO + (i / CURVE_POINTS) * (X_HI - X_LO);
    const y = square(x);
    const clampedY = clamp(y, Y_LO, Y_HI);
    const cmd = i === 0 ? 'M' : 'L';
    pts.push(`${cmd}${toSvgX(x).toFixed(1)},${toSvgY(clampedY).toFixed(1)}`);
  }
  return pts.join(' ');
}

const CURVE_PATH = buildCurvePath();

function buildSecantPath(x: number, h: number): string {
  const x0 = x;
  const x1 = x + h;
  const y0 = square(x0);
  const y1 = square(x1);
  // Extend the secant line visually beyond [x0, x1]
  const extend = 0.6;
  const slope = h !== 0 ? (y1 - y0) / h : 0;
  const xa = x0 - extend;
  const xb = x1 + extend;
  const ya = clamp(y0 + slope * (xa - x0), Y_LO - 2, Y_HI + 2);
  const yb = clamp(y0 + slope * (xb - x0), Y_LO - 2, Y_HI + 2);
  return `M${toSvgX(xa).toFixed(1)},${toSvgY(clamp(ya, Y_LO, Y_HI)).toFixed(1)} L${toSvgX(xb).toFixed(1)},${toSvgY(clamp(yb, Y_LO, Y_HI)).toFixed(1)}`;
}

export default function TangentSlopeExplorer({
  locale = 'fr',
}: TangentSlopeExplorerProps): JSX.Element {
  const t = DICT[locale];

  const [xVal, setXVal] = useState<number>(1);
  const [hVal, setHVal] = useState<number>(1.5);

  const fx = square(xVal);
  const secantSlope = numericalDerivative(square, xVal, hVal);
  const exactSlope = squareDeriv(xVal);
  const gapVal = Math.abs(secantSlope - exactSlope);

  const secantPath = useMemo(() => buildSecantPath(xVal, hVal), [xVal, hVal]);

  const cxA = toSvgX(xVal);
  const cyA = toSvgY(clamp(fx, Y_LO, Y_HI));
  const cxB = toSvgX(xVal + hVal);
  const cyB = toSvgY(clamp(square(xVal + hVal), Y_LO, Y_HI));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
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
          viewBox={`0 0 ${VW} ${VH}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: 'auto', display: 'block' }}
          role="img"
          aria-label={
            locale === 'fr'
              ? 'Courbe y = x² avec sécante et point courant'
              : 'Curve y = x² with secant and current point'
          }
        >
          <rect width={VW} height={VH} fill="var(--bg-primary, #0f0f1a)" rx={10} />
          {/* Axes */}
          <line
            x1={toSvgX(0)}
            y1={PAD - 4}
            x2={toSvgX(0)}
            y2={VH - PAD + 4}
            stroke="var(--border, #2d2d50)"
            strokeWidth={1}
          />
          <line
            x1={PAD - 4}
            y1={toSvgY(0)}
            x2={VW - PAD + 4}
            y2={toSvgY(0)}
            stroke="var(--border, #2d2d50)"
            strokeWidth={1}
          />
          {/* Axis labels */}
          <text
            x={VW - PAD + 6}
            y={toSvgY(0) + 4}
            fill="var(--text-muted, #64748b)"
            fontSize={10}
            textAnchor="middle"
          >
            x
          </text>
          <text
            x={toSvgX(0) - 8}
            y={PAD + 4}
            fill="var(--text-muted, #64748b)"
            fontSize={10}
            textAnchor="middle"
          >
            y
          </text>
          {/* Parabola */}
          <path d={CURVE_PATH} fill="none" stroke="var(--accent-green, #4ade80)" strokeWidth={2} />
          {/* Secant */}
          <path
            d={secantPath}
            fill="none"
            stroke="var(--accent-orange, #fb923c)"
            strokeWidth={1.8}
            strokeDasharray="5 3"
          />
          {/* Point B (x+h) */}
          <circle cx={cxB} cy={cyB} r={4} fill="var(--accent-orange, #fb923c)" />
          {/* Point A (x) */}
          <circle
            cx={cxA}
            cy={cyA}
            r={6}
            fill="var(--bg-primary, #0f0f1a)"
            stroke="var(--accent-violet, #a78bfa)"
            strokeWidth={2.5}
          />
          {/* h bracket */}
          {Math.abs(hVal) > 0.05 && (
            <line
              x1={cxA}
              y1={cyA + 14}
              x2={cxB}
              y2={cyA + 14}
              stroke="var(--accent-orange, #fb923c)"
              strokeWidth={1}
            />
          )}
          <text x={8} y={14} fill="var(--text-muted, #64748b)" fontSize={9}>
            y = x²
          </text>
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

        {/* Slider x */}
        <div style={{ marginBottom: '12px' }}>
          <label
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #94a3b8)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            {t.pointLabel} :{' '}
            <strong style={{ color: 'var(--accent-violet, #a78bfa)' }}>
              {formatNum(xVal, locale)}
            </strong>
          </label>
          <input
            type="range"
            min={-3}
            max={3}
            step={0.1}
            value={xVal}
            onChange={(e) => setXVal(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-violet, #a78bfa)' }}
          />
        </div>

        {/* Slider h */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #94a3b8)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            {t.stepLabel} :{' '}
            <strong style={{ color: 'var(--accent-orange, #fb923c)' }}>
              {formatNum(hVal, locale)}
            </strong>
          </label>
          <input
            type="range"
            min={0.01}
            max={1.5}
            step={0.01}
            value={hVal}
            onChange={(e) => setHVal(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-orange, #fb923c)' }}
          />
        </div>

        {/* Readout panel */}
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--bg-primary, #0f0f1a)',
            border: '1px solid var(--border, #2d2d50)',
            borderRadius: '8px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '12px',
            color: 'var(--text-secondary, #94a3b8)',
            lineHeight: 1.8,
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted, #64748b)' }}>{t.secantSlope} : </span>
            <span style={{ color: 'var(--accent-orange, #fb923c)' }}>
              {formatNum(secantSlope, locale)}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted, #64748b)' }}>{t.exactSlope} : </span>
            <span style={{ color: 'var(--accent-violet, #a78bfa)' }}>
              {formatNum(exactSlope, locale)}
            </span>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--border, #2d2d50)',
              marginTop: '6px',
              paddingTop: '6px',
            }}
          >
            <span style={{ color: 'var(--text-muted, #64748b)' }}>{t.gap} : </span>
            <span
              style={{
                color:
                  gapVal < 0.1 ? 'var(--accent-green, #4ade80)' : 'var(--text-primary, #e2e8f0)',
              }}
            >
              {formatNum(gapVal, locale)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
