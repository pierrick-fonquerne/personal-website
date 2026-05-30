import { useMemo, useState, type JSX } from 'react';

type Locale = 'fr' | 'en';

interface XorHiddenLayerSolverProps {
  locale?: Locale;
}

interface Dictionary {
  readonly title: string;
  readonly inputLabel: string;
  readonly orFormula: string;
  readonly nandFormula: string;
  readonly outLabel: string;
  readonly sliderV1: string;
  readonly sliderV2: string;
  readonly sliderC: string;
  readonly tableTitle: string;
  readonly colInput: string;
  readonly colOr: string;
  readonly colNand: string;
  readonly colOut: string;
  readonly colTarget: string;
  readonly satisfiedLabel: string;
  readonly presetSolution: string;
  readonly presetReset: string;
  readonly explainBtn: string;
  readonly hideExplainBtn: string;
  readonly explanationTitle: string;
  readonly explanation: string;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: 'Construire XOR avec une couche cachée',
    inputLabel: 'entrées',
    orFormula: 'OR = step(x₁ + x₂ - 0,5)',
    nandFormula: 'NAND = step(1,5 - x₁ - x₂)',
    outLabel: 'sortie',
    sliderV1: 'poids sur OR (v₁)',
    sliderV2: 'poids sur NAND (v₂)',
    sliderC: 'biais de sortie (c)',
    tableTitle: 'Table de vérité',
    colInput: '(x₁, x₂)',
    colOr: 'OR',
    colNand: 'NAND',
    colOut: 'y',
    colTarget: 'XOR',
    satisfiedLabel: 'Sorties correctes',
    presetSolution: 'Révéler la solution (AND)',
    presetReset: 'Réinitialiser',
    explainBtn: 'Pourquoi OR ∧ NAND = XOR',
    hideExplainBtn: 'Masquer',
    explanationTitle: "L'idée",
    explanation:
      "La couche cachée réécrit chaque entrée en deux nouvelles coordonnées. OR vaut 1 dès qu'au moins une entrée est à 1. NAND vaut 1 partout sauf quand les deux entrées valent 1. Or XOR doit valoir 1 exactement quand une seule entrée est à 1, et c'est précisément là, et seulement là, que OR et NAND valent tous les deux 1. Le neurone de sortie n'a donc plus qu'à calculer le ET logique de OR et NAND. Avec v₁ = v₂ = 1 et c = -1,5, il renvoie 1 si et seulement si OR + NAND ≥ 1,5, c'est-à-dire quand les deux valent 1. Ce qu'un perceptron seul ne pouvait pas faire, deux couches le réalisent.",
  },
  en: {
    title: 'Building XOR with a hidden layer',
    inputLabel: 'inputs',
    orFormula: 'OR = step(x₁ + x₂ - 0.5)',
    nandFormula: 'NAND = step(1.5 - x₁ - x₂)',
    outLabel: 'output',
    sliderV1: 'weight on OR (v₁)',
    sliderV2: 'weight on NAND (v₂)',
    sliderC: 'output bias (c)',
    tableTitle: 'Truth table',
    colInput: '(x₁, x₂)',
    colOr: 'OR',
    colNand: 'NAND',
    colOut: 'y',
    colTarget: 'XOR',
    satisfiedLabel: 'Correct outputs',
    presetSolution: 'Reveal the solution (AND)',
    presetReset: 'Reset',
    explainBtn: 'Why OR ∧ NAND = XOR',
    hideExplainBtn: 'Hide',
    explanationTitle: 'The idea',
    explanation:
      'The hidden layer rewrites each input as two new coordinates. OR is 1 as soon as at least one input is 1. NAND is 1 everywhere except when both inputs are 1. But XOR must be 1 exactly when a single input is 1, and that is precisely where, and only where, OR and NAND are both 1. So the output neuron only has to compute the logical AND of OR and NAND. With v₁ = v₂ = 1 and c = -1.5, it returns 1 if and only if OR + NAND ≥ 1.5, i.e. when both are 1. What a single perceptron could not do, two layers achieve.',
  },
};

type Bit = 0 | 1;

const XOR_INPUTS: readonly (readonly [Bit, Bit])[] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

function step(z: number): Bit {
  return z >= 0 ? 1 : 0;
}

function orNeuron(x1: Bit, x2: Bit): Bit {
  return step(x1 + x2 - 0.5);
}

function nandNeuron(x1: Bit, x2: Bit): Bit {
  return step(1.5 - x1 - x2);
}

function outputNeuron(h1: Bit, h2: Bit, v1: number, v2: number, c: number): Bit {
  return step(v1 * h1 + v2 * h2 + c);
}

function xorTarget(x1: Bit, x2: Bit): Bit {
  return x1 === x2 ? 0 : 1;
}

interface Row {
  readonly x1: Bit;
  readonly x2: Bit;
  readonly h1: Bit;
  readonly h2: Bit;
  readonly y: Bit;
  readonly target: Bit;
  readonly ok: boolean;
}

function buildTable(v1: number, v2: number, c: number): readonly Row[] {
  return XOR_INPUTS.map(([x1, x2]) => {
    const h1 = orNeuron(x1, x2);
    const h2 = nandNeuron(x1, x2);
    const y = outputNeuron(h1, h2, v1, v2, c);
    const target = xorTarget(x1, x2);
    return { x1, x2, h1, h2, y, target, ok: y === target };
  });
}

function satisfiedCount(rows: readonly Row[]): number {
  return rows.filter((r) => r.ok).length;
}

function formatSigned(n: number): string {
  if (Math.abs(n) < 0.005) return '0.00';
  return n.toFixed(2);
}

const VIEW_W = 320;
const VIEW_H = 220;

interface NodePos {
  readonly x: number;
  readonly y: number;
}

const NODES = {
  x1: { x: 40, y: 60 },
  x2: { x: 40, y: 160 },
  or: { x: 160, y: 55 },
  nand: { x: 160, y: 165 },
  out: { x: 280, y: 110 },
} as const;

function Edge({ from, to }: { from: NodePos; to: NodePos }): JSX.Element {
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke="var(--border, #2d2d50)"
      strokeWidth={1.4}
    />
  );
}

export default function XorHiddenLayerSolver({
  locale = 'fr',
}: XorHiddenLayerSolverProps): JSX.Element {
  const t = DICT[locale];
  const [v1, setV1] = useState<number>(1);
  const [v2, setV2] = useState<number>(1);
  const [c, setC] = useState<number>(-1);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const rows = useMemo(() => buildTable(v1, v2, c), [v1, v2, c]);
  const count = useMemo(() => satisfiedCount(rows), [rows]);
  const solved = count === 4;

  const applyPreset = (preset: 'solution' | 'reset'): void => {
    if (preset === 'solution') {
      setV1(1);
      setV2(1);
      setC(-1.5);
    } else {
      setV1(0);
      setV2(0);
      setC(0);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)',
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
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: 'auto', display: 'block' }}
          role="img"
          aria-label={t.title}
        >
          <rect width={VIEW_W} height={VIEW_H} fill="var(--bg-primary, #0f0f1a)" rx={10} />
          <Edge from={NODES.x1} to={NODES.or} />
          <Edge from={NODES.x2} to={NODES.or} />
          <Edge from={NODES.x1} to={NODES.nand} />
          <Edge from={NODES.x2} to={NODES.nand} />
          <Edge from={NODES.or} to={NODES.out} />
          <Edge from={NODES.nand} to={NODES.out} />
          <text
            x={(NODES.or.x + NODES.out.x) / 2}
            y={(NODES.or.y + NODES.out.y) / 2 - 6}
            fill="var(--accent-violet, #a78bfa)"
            fontSize={11}
            textAnchor="middle"
          >
            v₁ = {formatSigned(v1)}
          </text>
          <text
            x={(NODES.nand.x + NODES.out.x) / 2}
            y={(NODES.nand.y + NODES.out.y) / 2 + 14}
            fill="var(--accent-violet, #a78bfa)"
            fontSize={11}
            textAnchor="middle"
          >
            v₂ = {formatSigned(v2)}
          </text>
          {(
            [
              { pos: NODES.x1, label: 'x₁', fill: 'var(--text-muted, #64748b)' },
              { pos: NODES.x2, label: 'x₂', fill: 'var(--text-muted, #64748b)' },
              { pos: NODES.or, label: 'OR', fill: 'var(--accent-orange, #fb923c)' },
              { pos: NODES.nand, label: 'NAND', fill: 'var(--accent-orange, #fb923c)' },
              {
                pos: NODES.out,
                label: 'AND',
                fill: solved ? 'var(--accent-green, #4ade80)' : 'var(--accent-violet, #a78bfa)',
              },
            ] as const
          ).map((node) => (
            <g key={node.label}>
              <circle
                cx={node.pos.x}
                cy={node.pos.y}
                r={20}
                fill="var(--bg-secondary, #14142a)"
                stroke={node.fill}
                strokeWidth={2.5}
              />
              <text
                x={node.pos.x}
                y={node.pos.y + 4}
                fill="var(--text-primary, #e2e8f0)"
                fontSize={node.label.length > 2 ? 9 : 12}
                fontWeight={700}
                textAnchor="middle"
              >
                {node.label}
              </text>
            </g>
          ))}
          <text x={160} y={26} fill="var(--text-muted, #64748b)" fontSize={9} textAnchor="middle">
            {t.orFormula}
          </text>
          <text
            x={160}
            y={VIEW_H - 10}
            fill="var(--text-muted, #64748b)"
            fontSize={9}
            textAnchor="middle"
          >
            {t.nandFormula}
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
        {(
          [
            { label: t.sliderV1, value: v1, set: setV1 },
            { label: t.sliderV2, value: v2, set: setV2 },
            { label: t.sliderC, value: c, set: setC },
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
              step={0.25}
              value={value}
              onChange={(e) => set(Number(e.target.value))}
              aria-label={label}
              style={{ width: '100%' }}
            />
          </div>
        ))}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            marginTop: '10px',
            marginBottom: '14px',
            flexWrap: 'wrap',
          }}
        >
          {(
            [
              { label: t.presetSolution, key: 'solution' as const },
              { label: t.presetReset, key: 'reset' as const },
            ] as const
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
          {t.tableTitle}
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.3fr 0.7fr 0.9fr 0.6fr 0.7fr 0.5fr',
              gap: '4px',
              color: 'var(--text-muted, #64748b)',
              paddingBottom: '4px',
              borderBottom: '1px solid var(--border, #2d2d50)',
            }}
          >
            <span>{t.colInput}</span>
            <span>{t.colOr}</span>
            <span>{t.colNand}</span>
            <span>{t.colOut}</span>
            <span>{t.colTarget}</span>
            <span />
          </div>
          {rows.map((r) => (
            <div
              key={`${r.x1}${r.x2}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.3fr 0.7fr 0.9fr 0.6fr 0.7fr 0.5fr',
                gap: '4px',
                padding: '4px 0',
                color: r.ok ? 'var(--accent-green, #4ade80)' : 'var(--accent-red, #f87171)',
              }}
            >
              <span>
                ({r.x1}, {r.x2})
              </span>
              <span>{r.h1}</span>
              <span>{r.h2}</span>
              <span>{r.y}</span>
              <span>{r.target}</span>
              <span style={{ fontWeight: 700 }}>{r.ok ? '✓' : '✗'}</span>
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
                color: solved ? 'var(--accent-green, #4ade80)' : 'var(--accent-violet, #a78bfa)',
                fontWeight: 700,
              }}
            >
              {count} / 4
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
