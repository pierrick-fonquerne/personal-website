import { useMemo, useState, type JSX } from 'react';

type Locale = 'fr' | 'en';

interface DecisionRegionComposerProps {
  locale?: Locale;
}

interface Dictionary {
  readonly title: string;
  readonly neuronsLabel: string;
  readonly showLines: string;
  readonly hideLines: string;
  readonly caption: string;
  readonly convergeNote: string;
  readonly descHalfPlane: string;
  readonly descWedge: string;
  readonly descPolygon: (k: number) => string;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: 'Composer une frontière de décision',
    neuronsLabel: 'Neurones cachés (k)',
    showLines: 'Afficher les frontières',
    hideLines: 'Masquer les frontières',
    caption:
      'Région = intersection de k demi-plans. Un neurone caché trace une droite ; le ET logique de la couche de sortie ne garde que les points situés du bon côté des k droites à la fois.',
    convergeNote:
      'Augmente k : le polygone circonscrit se rapproche du cercle. Avec assez de neurones, la frontière devient une courbe quelconque.',
    descHalfPlane: 'k = 1 : un seul demi-plan, exactement comme un perceptron.',
    descWedge: 'k = 2 : un coin, intersection de deux demi-plans.',
    descPolygon: (k) => `k = ${k} : un polygone convexe à ${k} côtés.`,
  },
  en: {
    title: 'Composing a decision boundary',
    neuronsLabel: 'Hidden neurons (k)',
    showLines: 'Show boundaries',
    hideLines: 'Hide boundaries',
    caption:
      'Region = intersection of k half-planes. A hidden neuron draws a line; the output layer logical AND keeps only the points on the correct side of all k lines at once.',
    convergeNote:
      'Increase k: the circumscribed polygon gets closer to the circle. With enough neurons, the boundary becomes an arbitrary curve.',
    descHalfPlane: 'k = 1: a single half-plane, exactly like a perceptron.',
    descWedge: 'k = 2: a wedge, the intersection of two half-planes.',
    descPolygon: (k) => `k = ${k}: a convex polygon with ${k} sides.`,
  },
};

interface Pt {
  readonly x: number;
  readonly y: number;
}

interface HalfPlane {
  readonly nx: number;
  readonly ny: number;
  readonly b: number;
}

const CENTER: Pt = { x: 0, y: 0 };
const RADIUS = 1;
const D_MIN = -1.7;
const D_MAX = 1.7;
const D_RANGE = D_MAX - D_MIN;

const VIEW = 360;
const PAD = 28;
const INNER = VIEW - 2 * PAD;

const VIEW_RECT: readonly Pt[] = [
  { x: D_MIN, y: D_MIN },
  { x: D_MAX, y: D_MIN },
  { x: D_MAX, y: D_MAX },
  { x: D_MIN, y: D_MAX },
];

const dataToSvgX = (dx: number): number => PAD + ((dx - D_MIN) / D_RANGE) * INNER;
const dataToSvgY = (dy: number): number => VIEW - PAD - ((dy - D_MIN) / D_RANGE) * INNER;

function tangentHalfPlanes(k: number, cx: number, cy: number, r: number): readonly HalfPlane[] {
  const planes: HalfPlane[] = [];
  for (let i = 0; i < k; i += 1) {
    const theta = -Math.PI / 2 + (2 * Math.PI * i) / k;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    planes.push({ nx: -cos, ny: -sin, b: r + cx * cos + cy * sin });
  }
  return planes;
}

function intersect(a: Pt, b: Pt, fa: number, fb: number): Pt {
  const tt = fa / (fa - fb);
  return { x: a.x + tt * (b.x - a.x), y: a.y + tt * (b.y - a.y) };
}

function clipHalfPlane(poly: readonly Pt[], hp: HalfPlane): Pt[] {
  const out: Pt[] = [];
  const n = poly.length;
  if (n === 0) return out;
  for (let i = 0; i < n; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const fa = hp.nx * a.x + hp.ny * a.y + hp.b;
    const fb = hp.nx * b.x + hp.ny * b.y + hp.b;
    const aIn = fa >= 0;
    const bIn = fb >= 0;
    if (bIn) {
      if (!aIn) out.push(intersect(a, b, fa, fb));
      out.push(b);
    } else if (aIn) {
      out.push(intersect(a, b, fa, fb));
    }
  }
  return out;
}

function regionPolygon(
  k: number,
  cx: number,
  cy: number,
  r: number,
  viewRect: readonly Pt[],
): Pt[] {
  const planes = tangentHalfPlanes(k, cx, cy, r);
  return planes.reduce<Pt[]>((poly, hp) => clipHalfPlane(poly, hp), [...viewRect]);
}

function svgPoints(poly: readonly Pt[]): string {
  return poly.map((p) => `${dataToSvgX(p.x)},${dataToSvgY(p.y)}`).join(' ');
}

const LINE_LEN = 6;

interface Segment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

function halfPlaneSegment(hp: HalfPlane): Segment {
  const p0x = -hp.b * hp.nx;
  const p0y = -hp.b * hp.ny;
  const dirX = -hp.ny;
  const dirY = hp.nx;
  return {
    x1: dataToSvgX(p0x - LINE_LEN * dirX),
    y1: dataToSvgY(p0y - LINE_LEN * dirY),
    x2: dataToSvgX(p0x + LINE_LEN * dirX),
    y2: dataToSvgY(p0y + LINE_LEN * dirY),
  };
}

export default function DecisionRegionComposer({
  locale = 'fr',
}: DecisionRegionComposerProps): JSX.Element {
  const t = DICT[locale];
  const [k, setK] = useState<number>(1);
  const [showLines, setShowLines] = useState<boolean>(true);

  const planes = useMemo(() => tangentHalfPlanes(k, CENTER.x, CENTER.y, RADIUS), [k]);
  const region = useMemo(() => regionPolygon(k, CENTER.x, CENTER.y, RADIUS, VIEW_RECT), [k]);

  const circleR = (RADIUS / D_RANGE) * INNER;
  const desc = k === 1 ? t.descHalfPlane : k === 2 ? t.descWedge : t.descPolygon(k);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
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
          <defs>
            <clipPath id="drc-plot">
              <rect x={PAD} y={PAD} width={INNER} height={INNER} rx={6} />
            </clipPath>
          </defs>
          <rect width={VIEW} height={VIEW} fill="var(--bg-primary, #0f0f1a)" rx={10} />
          <rect
            x={PAD}
            y={PAD}
            width={INNER}
            height={INNER}
            fill="none"
            stroke="var(--border, #2d2d50)"
            strokeWidth={1}
            rx={6}
          />
          <g clipPath="url(#drc-plot)">
            <circle
              cx={dataToSvgX(CENTER.x)}
              cy={dataToSvgY(CENTER.y)}
              r={circleR}
              fill="none"
              stroke="var(--text-muted, #64748b)"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            {region.length >= 3 && (
              <polygon
                points={svgPoints(region)}
                fill="rgba(167, 139, 250, 0.22)"
                stroke="var(--accent-violet, #a78bfa)"
                strokeWidth={2}
              />
            )}
            {showLines &&
              planes.map((hp, idx) => {
                const seg = halfPlaneSegment(hp);
                return (
                  <line
                    key={idx}
                    x1={seg.x1}
                    y1={seg.y1}
                    x2={seg.x2}
                    y2={seg.y2}
                    stroke="var(--accent-orange, #fb923c)"
                    strokeWidth={1.2}
                    strokeDasharray="5,3"
                    opacity={0.7}
                  />
                );
              })}
          </g>
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
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '4px',
              fontSize: '12px',
              color: 'var(--text-muted, #64748b)',
            }}
          >
            <span>{t.neuronsLabel}</span>
            <span
              style={{
                color: 'var(--accent-violet, #a78bfa)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {k}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
            aria-label={t.neuronsLabel}
            style={{ width: '100%' }}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowLines((s) => !s)}
          style={{
            padding: '4px 10px',
            background: 'transparent',
            border: '1px solid var(--border, #2d2d50)',
            color: 'var(--text-secondary, #94a3b8)',
            borderRadius: '6px',
            fontSize: '11px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            marginBottom: '14px',
          }}
        >
          {showLines ? t.hideLines : t.showLines}
        </button>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--accent-violet, #a78bfa)',
            fontWeight: 600,
            marginBottom: '10px',
          }}
        >
          {desc}
        </div>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary, #94a3b8)',
            lineHeight: 1.65,
            margin: '0 0 10px',
          }}
        >
          {t.caption}
        </p>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-muted, #64748b)',
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          {t.convergeNote}
        </p>
      </div>
    </div>
  );
}
