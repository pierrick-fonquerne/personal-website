import { useMemo, useState, type JSX } from 'react';
import { gradient, quadraticBowl } from './calculus/derivatives';

type Locale = 'fr' | 'en';

interface GradientVectorExplorerProps {
  locale?: Locale;
}

interface Dictionary {
  readonly title: string;
  readonly partial0: string;
  readonly partial1: string;
  readonly gradientArrow: string;
  readonly descentArrow: string;
  readonly bridgeNote: string;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: 'Le gradient, boussole de la descente',
    partial0: '∂f/∂w₁',
    partial1: '∂f/∂w₂',
    gradientArrow: 'Gradient ∇f (montée)',
    descentArrow: '-∇f (descente)',
    bridgeNote: 'Le gradient est la boussole de la descente du chapitre 9.',
  },
  en: {
    title: 'The gradient, compass for the descent',
    partial0: '∂f/∂w₁',
    partial1: '∂f/∂w₂',
    gradientArrow: 'Gradient ∇f (ascent)',
    descentArrow: '-∇f (descent)',
    bridgeNote: 'The gradient is the compass for the descent in chapter 9.',
  },
};

const VW = 300;
const VH = 240;
const PAD = 24;
const W_LO = -2;
const W_HI = 2;

const CONTOUR_LEVELS = [0.3, 0.8, 1.6, 2.8, 4.5, 6.5] as const;

function toSvgX(w: number): number {
  return PAD + ((w - W_LO) / (W_HI - W_LO)) * (VW - 2 * PAD);
}

function toSvgY(w: number): number {
  return VH - PAD - ((w - W_LO) / (W_HI - W_LO)) * (VH - 2 * PAD);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function formatNum(n: number, locale: Locale, digits = 3): string {
  const rounded = Math.abs(n) < 0.0005 ? 0 : n;
  const text = rounded.toFixed(digits);
  return locale === 'fr' ? text.replace('.', ',') : text;
}

// Build SVG ellipse paths for contour lines of f(w0,w1) = c
// f = w0^2 + 2*w1^2 = c  =>  (w0/(sqrt(c)))^2 + (w1/(sqrt(c/2)))^2 = 1
function buildContours(): readonly { d: string; level: number }[] {
  return CONTOUR_LEVELS.map((level) => {
    const a = Math.sqrt(level); // semi-axis along w0
    const b = Math.sqrt(level / 2); // semi-axis along w1
    // Map ellipse center (0,0), radii a and b to SVG coords
    const cx = toSvgX(0);
    const cy = toSvgY(0);
    const rx = (a / (W_HI - W_LO)) * (VW - 2 * PAD);
    const ry = (b / (W_HI - W_LO)) * (VH - 2 * PAD);
    return {
      d: `M${cx + rx},${cy} A${rx},${ry},0,1,0,${cx - rx},${cy} A${rx},${ry},0,1,0,${cx + rx},${cy}`,
      level,
    };
  });
}

const CONTOURS = buildContours();

interface ArrowProps {
  readonly cx: number;
  readonly cy: number;
  readonly dx: number;
  readonly dy: number;
  readonly color: string;
  readonly scale?: number;
}

function SvgArrow({ cx, cy, dx, dy, color, scale = 18 }: ArrowProps): JSX.Element {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-6) return <g />;
  const ndx = (dx / len) * scale;
  const ndy = -(dy / len) * scale; // flip y for SVG
  const ex = cx + ndx;
  const ey = cy + ndy;
  // Arrowhead perpendicular
  const px = (-ndy / scale) * 5;
  const py = (ndx / scale) * 5;
  return (
    <g>
      <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={color} strokeWidth={2} />
      <polygon
        points={`${ex},${ey} ${ex - ndx * 0.4 + px},${ey - ndy * 0.4 + py} ${ex - ndx * 0.4 - px},${ey - ndy * 0.4 - py}`}
        fill={color}
      />
    </g>
  );
}

export default function GradientVectorExplorer({
  locale = 'fr',
}: GradientVectorExplorerProps): JSX.Element {
  const t = DICT[locale];

  const [w0, setW0] = useState<number>(1);
  const [w1, setW1] = useState<number>(0.8);

  const grad = useMemo(() => gradient(quadraticBowl, [w0, w1]), [w0, w1]);
  const dw0 = grad[0] ?? 0;
  const dw1 = grad[1] ?? 0;

  const cx = toSvgX(clamp(w0, W_LO, W_HI));
  const cy = toSvgY(clamp(w1, W_LO, W_HI));

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
              ? 'Courbes de niveau du bol f = w0² + 2w1² avec vecteur gradient'
              : 'Contour lines of bowl f = w0² + 2w1² with gradient vector'
          }
        >
          <rect width={VW} height={VH} fill="var(--bg-primary, #0f0f1a)" rx={10} />

          {/* Contour lines */}
          {CONTOURS.map(({ d, level }) => (
            <path
              key={level}
              d={d}
              fill="none"
              stroke="var(--accent-violet, #a78bfa)"
              strokeWidth={0.8}
              opacity={0.35}
            />
          ))}

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
            fontSize={9}
            textAnchor="middle"
          >
            w₁
          </text>
          <text
            x={toSvgX(0) - 10}
            y={PAD + 4}
            fill="var(--text-muted, #64748b)"
            fontSize={9}
            textAnchor="middle"
          >
            w₂
          </text>

          {/* Minimum marker */}
          <line
            x1={toSvgX(0) - 6}
            y1={toSvgY(0)}
            x2={toSvgX(0) + 6}
            y2={toSvgY(0)}
            stroke="var(--accent-green, #4ade80)"
            strokeWidth={1.5}
          />
          <line
            x1={toSvgX(0)}
            y1={toSvgY(0) - 6}
            x2={toSvgX(0)}
            y2={toSvgY(0) + 6}
            stroke="var(--accent-green, #4ade80)"
            strokeWidth={1.5}
          />

          {/* Gradient arrow (ascent) */}
          <SvgArrow
            cx={cx}
            cy={cy}
            dx={dw0}
            dy={dw1}
            color="var(--accent-orange, #fb923c)"
            scale={22}
          />

          {/* Descent arrow */}
          <SvgArrow
            cx={cx}
            cy={cy}
            dx={-dw0}
            dy={-dw1}
            color="var(--accent-green, #4ade80)"
            scale={22}
          />

          {/* Current point */}
          <circle
            cx={cx}
            cy={cy}
            r={6}
            fill="var(--bg-primary, #0f0f1a)"
            stroke="var(--accent-violet, #a78bfa)"
            strokeWidth={2.5}
          />
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

        {/* Sliders */}
        <div style={{ marginBottom: '10px' }}>
          <label
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #94a3b8)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            w₁ :{' '}
            <strong style={{ color: 'var(--accent-violet, #a78bfa)' }}>
              {formatNum(w0, locale)}
            </strong>
          </label>
          <input
            type="range"
            min={-2}
            max={2}
            step={0.05}
            value={w0}
            onChange={(e) => setW0(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-violet, #a78bfa)' }}
          />
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #94a3b8)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            w₂ :{' '}
            <strong style={{ color: 'var(--accent-violet, #a78bfa)' }}>
              {formatNum(w1, locale)}
            </strong>
          </label>
          <input
            type="range"
            min={-2}
            max={2}
            step={0.05}
            value={w1}
            onChange={(e) => setW1(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-violet, #a78bfa)' }}
          />
        </div>

        {/* Readout */}
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
            marginBottom: '12px',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted, #64748b)' }}>{t.partial0} : </span>
            <span style={{ color: 'var(--accent-orange, #fb923c)' }}>{formatNum(dw0, locale)}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted, #64748b)' }}>{t.partial1} : </span>
            <span style={{ color: 'var(--accent-orange, #fb923c)' }}>{formatNum(dw1, locale)}</span>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--border, #2d2d50)',
              marginTop: '6px',
              paddingTop: '6px',
            }}
          >
            <span style={{ color: 'var(--accent-orange, #fb923c)' }}>&#9650; </span>
            <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '11px' }}>
              {t.gradientArrow}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--accent-green, #4ade80)' }}>&#9660; </span>
            <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '11px' }}>
              {t.descentArrow}
            </span>
          </div>
        </div>

        {/* Bridge note */}
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-muted, #64748b)',
            fontStyle: 'italic',
            margin: 0,
            borderLeft: '3px solid var(--accent-green, #4ade80)',
            paddingLeft: '10px',
          }}
        >
          {t.bridgeNote}
        </p>
      </div>
    </div>
  );
}
