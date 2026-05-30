import { useState, type JSX, type PointerEvent } from 'react';

type Locale = 'fr' | 'en';

interface LossLandscapeProps {
  locale?: Locale;
}

interface Dictionary {
  readonly title: string;
  readonly costLabel: string;
  readonly minLabel: string;
  readonly currentLabel: string;
  readonly hint: string;
  readonly diagramLabel: string;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: 'Le paysage de coût',
    costLabel: 'Coût au point courant',
    minLabel: 'creux (coût minimal)',
    currentLabel: 'point courant',
    hint: 'Clique ou glisse pour déplacer le point et lire le coût. Apprendre revient à atteindre le creux. Comment y aller : les chapitres suivants.',
    diagramLabel: 'Carte du coût en fonction de deux poids',
  },
  en: {
    title: 'The cost landscape',
    costLabel: 'Cost at the current point',
    minLabel: 'valley (minimal cost)',
    currentLabel: 'current point',
    hint: 'Click or drag to move the point and read the cost. Learning amounts to reaching the valley. How to get there: the following chapters.',
    diagramLabel: 'Map of the cost as a function of two weights',
  },
};

interface DataPoint {
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
}

const DATASET: readonly DataPoint[] = [
  { x1: 1, x2: 0, y: 1 },
  { x1: 0, x2: 1, y: 2 },
  { x1: 1, x2: 1, y: 3 },
  { x1: 2, x2: 1, y: 4 },
];

function costAt(w1: number, w2: number): number {
  const sum = DATASET.reduce((acc, d) => acc + (w1 * d.x1 + w2 * d.x2 - d.y) ** 2, 0);
  return sum / DATASET.length;
}

const MIN_W1 = 1;
const MIN_W2 = 2;

const VW = 300;
const VH = 240;
const PAD = 24;
const W1_LO = -1;
const W1_HI = 3;
const W2_LO = 0;
const W2_HI = 4;
const COST_MAX = 24;

const GREEN: readonly [number, number, number] = [74, 222, 128];
const VIOLET: readonly [number, number, number] = [167, 139, 250];

function lerpColor(tt: number): string {
  const r = Math.round(GREEN[0] + (VIOLET[0] - GREEN[0]) * tt);
  const g = Math.round(GREEN[1] + (VIOLET[1] - GREEN[1]) * tt);
  const b = Math.round(GREEN[2] + (VIOLET[2] - GREEN[2]) * tt);
  return `rgb(${r}, ${g}, ${b})`;
}

function xOf(w1: number): number {
  return PAD + ((w1 - W1_LO) / (W1_HI - W1_LO)) * (VW - 2 * PAD);
}

function yOf(w2: number): number {
  return VH - PAD - ((w2 - W2_LO) / (W2_HI - W2_LO)) * (VH - 2 * PAD);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

interface Cell {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly fill: string;
}

function buildCells(): readonly Cell[] {
  const cols = 26;
  const rows = 22;
  const cellW = (VW - 2 * PAD) / cols;
  const cellH = (VH - 2 * PAD) / rows;
  const cells: Cell[] = [];
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      const w1c = W1_LO + ((i + 0.5) / cols) * (W1_HI - W1_LO);
      const w2c = W2_HI - ((j + 0.5) / rows) * (W2_HI - W2_LO);
      const norm = Math.min(costAt(w1c, w2c) / COST_MAX, 1);
      cells.push({
        x: PAD + i * cellW,
        y: PAD + j * cellH,
        w: cellW + 0.5,
        h: cellH + 0.5,
        fill: lerpColor(norm),
      });
    }
  }
  return cells;
}

const CELLS = buildCells();

function formatNum(n: number, locale: Locale, digits = 2): string {
  const rounded = Math.abs(n) < 0.005 ? 0 : n;
  const text = rounded.toFixed(digits);
  return locale === 'fr' ? text.replace('.', ',') : text;
}

export default function LossLandscape({ locale = 'fr' }: LossLandscapeProps): JSX.Element {
  const t = DICT[locale];
  const [w1, setW1] = useState<number>(-0.5);
  const [w2, setW2] = useState<number>(3.5);
  const [dragging, setDragging] = useState<boolean>(false);

  const cost = costAt(w1, w2);

  const updateFromEvent = (e: PointerEvent<SVGSVGElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * VW;
    const py = ((e.clientY - rect.top) / rect.height) * VH;
    const nextW1 = W1_LO + ((px - PAD) / (VW - 2 * PAD)) * (W1_HI - W1_LO);
    const nextW2 = W2_LO + ((VH - PAD - py) / (VH - 2 * PAD)) * (W2_HI - W2_LO);
    setW1(round1(clamp(nextW1, W1_LO, W1_HI)));
    setW2(round1(clamp(nextW2, W2_LO, W2_HI)));
  };

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
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            cursor: 'crosshair',
            touchAction: 'none',
          }}
          role="img"
          aria-label={t.diagramLabel}
          onPointerDown={(e) => {
            setDragging(true);
            updateFromEvent(e);
          }}
          onPointerMove={(e) => {
            if (dragging) updateFromEvent(e);
          }}
          onPointerUp={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
        >
          <rect width={VW} height={VH} fill="var(--bg-primary, #0f0f1a)" rx={10} />
          {CELLS.map((cell) => (
            <rect
              key={`${cell.x}-${cell.y}`}
              x={cell.x}
              y={cell.y}
              width={cell.w}
              height={cell.h}
              fill={cell.fill}
              fillOpacity={0.55}
            />
          ))}
          <line
            x1={xOf(MIN_W1) - 7}
            y1={yOf(MIN_W2)}
            x2={xOf(MIN_W1) + 7}
            y2={yOf(MIN_W2)}
            stroke="var(--text-primary, #e2e8f0)"
            strokeWidth={2}
          />
          <line
            x1={xOf(MIN_W1)}
            y1={yOf(MIN_W2) - 7}
            x2={xOf(MIN_W1)}
            y2={yOf(MIN_W2) + 7}
            stroke="var(--text-primary, #e2e8f0)"
            strokeWidth={2}
          />
          <circle
            cx={xOf(w1)}
            cy={yOf(w2)}
            r={7}
            fill="var(--bg-primary, #0f0f1a)"
            stroke="var(--accent-violet, #a78bfa)"
            strokeWidth={3}
          />
          <text x={PAD} y={VH - 7} fill="var(--text-muted, #64748b)" fontSize={10}>
            w₁
          </text>
          <text x={VW - PAD - 8} y={VH - 7} fill="var(--text-muted, #64748b)" fontSize={10}>
            w₁
          </text>
          <text x={6} y={PAD + 4} fill="var(--text-muted, #64748b)" fontSize={10}>
            w₂
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
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--bg-primary, #0f0f1a)',
            border: '1px solid var(--border, #2d2d50)',
            borderRadius: '8px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '13px',
            color: 'var(--text-secondary, #94a3b8)',
            lineHeight: 1.9,
          }}
        >
          <div>
            w₁ ={' '}
            <span style={{ color: 'var(--accent-violet, #a78bfa)' }}>
              {formatNum(w1, locale, 1)}
            </span>
            {'   '}w₂ ={' '}
            <span style={{ color: 'var(--accent-violet, #a78bfa)' }}>
              {formatNum(w2, locale, 1)}
            </span>
          </div>
          <div>
            {t.costLabel} ={' '}
            <span style={{ color: 'var(--accent-orange, #fb923c)', fontWeight: 700 }}>
              {formatNum(cost, locale)}
            </span>
          </div>
        </div>
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-muted, #64748b)',
            }}
          >
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                border: '3px solid var(--accent-violet, #a78bfa)',
                display: 'inline-block',
              }}
            />
            {t.currentLabel}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-muted, #64748b)',
            }}
          >
            <span
              style={{ color: 'var(--text-primary, #e2e8f0)', fontWeight: 700, fontSize: '14px' }}
            >
              +
            </span>
            {t.minLabel}
          </div>
        </div>
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            background: 'rgba(74, 222, 128, 0.08)',
            borderLeft: '3px solid var(--accent-green, #4ade80)',
            borderRadius: '0 6px 6px 0',
            fontSize: '12px',
            color: 'var(--text-secondary, #94a3b8)',
            lineHeight: 1.6,
          }}
        >
          {t.hint}
        </div>
      </div>
    </div>
  );
}
