import { useState, type JSX } from 'react';
import {
  squareDeriv,
  chainRule,
  sigmoid,
  sigmoidDeriv,
  neuronLossGradient,
} from './calculus/derivatives';

type Locale = 'fr' | 'en';

interface ChainRuleGraphProps {
  locale?: Locale;
}

interface Dictionary {
  readonly title: string;
  readonly modeAbstract: string;
  readonly modeNeuron: string;
  readonly localDeriv: string;
  readonly pathProduct: string;
  readonly bridgeNote: string;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: "Multiplier les pentes le long d'une chaîne",
    modeAbstract: 'Composition abstraite',
    modeNeuron: 'Neurone',
    localDeriv: 'Dérivées locales',
    pathProduct: 'Produit le long du chemin',
    bridgeNote: "C'est exactement ce que la rétropropagation généralise au chapitre 8.",
  },
  en: {
    title: 'Multiplying slopes along a chain',
    modeAbstract: 'Abstract composition',
    modeNeuron: 'Neuron',
    localDeriv: 'Local derivatives',
    pathProduct: 'Product along the path',
    bridgeNote: 'This is exactly what backpropagation generalizes in chapter 8.',
  },
};

type Mode = 'abstract' | 'neuron';

const VW = 320;
const VH = 120;

function formatNum(n: number, locale: Locale, digits = 3): string {
  const rounded = Math.abs(n) < 0.0005 ? 0 : n;
  const text = rounded.toFixed(digits);
  return locale === 'fr' ? text.replace('.', ',') : text;
}

// Node positions for abstract mode: x, g, y
const ABS_NODES = [
  { id: 'x', label: 'x', cx: 44, cy: 60 },
  { id: 'g', label: 'g', cx: 160, cy: 60 },
  { id: 'y', label: 'y', cx: 276, cy: 60 },
] as const;

// Node positions for neuron mode: x, z, a, L
const NEU_NODES = [
  { id: 'x', label: 'x', cx: 28, cy: 60 },
  { id: 'z', label: 'z', cx: 116, cy: 60 },
  { id: 'a', label: 'a', cx: 204, cy: 60 },
  { id: 'L', label: 'L', cx: 292, cy: 60 },
] as const;

interface EdgeLabel {
  readonly formula: string;
}

interface GraphData {
  readonly nodes: readonly { id: string; label: string; cx: number; cy: number }[];
  readonly edges: readonly { from: number; to: number }[];
  readonly edgeLabels: readonly EdgeLabel[];
  readonly productLabel: string;
}

function buildAbstractData(x: number, locale: Locale): GraphData {
  const g = 3 * x + 1;
  const dydg = squareDeriv(g); // 2g
  const dgdx = 3;
  const dydx = chainRule(dydg, dgdx); // (2g) * 3
  return {
    nodes: ABS_NODES,
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ],
    edgeLabels: [{ formula: "g' = 3" }, { formula: `dy/dg = 2g = ${formatNum(dydg, locale)}` }],
    productLabel: `dy/dx = ${formatNum(dydx, locale)}`,
  };
}

const NEURON_X = 1.5;
const NEURON_Y_TARGET = 1;

function buildNeuronData(w: number, b: number, locale: Locale): GraphData {
  const z = w * NEURON_X + b;
  const a = sigmoid(z);
  const dzdw = NEURON_X; // dz/dw = x
  const dadz = sigmoidDeriv(z);
  const dLda = 2 * (a - NEURON_Y_TARGET);
  const { dW, dB } = neuronLossGradient(w, b, NEURON_X, NEURON_Y_TARGET);
  return {
    nodes: NEU_NODES,
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ],
    edgeLabels: [
      { formula: `dz/dw = x = ${formatNum(dzdw, locale)}` },
      { formula: `da/dz = ${formatNum(dadz, locale)}` },
      { formula: `dL/da = ${formatNum(dLda, locale)}` },
    ],
    productLabel: `dL/dw = ${formatNum(dW, locale)},  dL/db = ${formatNum(dB, locale)}`,
  };
}

export default function ChainRuleGraph({ locale = 'fr' }: ChainRuleGraphProps): JSX.Element {
  const t = DICT[locale];

  const [mode, setMode] = useState<Mode>('abstract');
  const [xVal, setXVal] = useState<number>(1);
  const [wVal, setWVal] = useState<number>(0.5);
  const [bVal, setBVal] = useState<number>(0);

  const data =
    mode === 'abstract' ? buildAbstractData(xVal, locale) : buildNeuronData(wVal, bVal, locale);

  return (
    <div
      style={{
        padding: '20px',
        background: 'var(--bg-secondary, #14142a)',
        border: '1px solid var(--border, #2d2d50)',
        borderRadius: '12px',
        margin: '24px 0',
      }}
    >
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

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', alignItems: 'center' }}>
        {(
          [
            { key: 'abstract' as const, label: t.modeAbstract },
            { key: 'neuron' as const, label: t.modeNeuron },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            style={{
              padding: '3px 10px',
              background: mode === key ? 'var(--accent-violet, #a78bfa)' : 'transparent',
              border: '1px solid var(--accent-violet, #a78bfa)',
              color: mode === key ? 'var(--bg-primary, #0f0f1a)' : 'var(--accent-violet, #a78bfa)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Graph SVG */}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto', display: 'block', marginBottom: '14px' }}
        role="img"
        aria-label={
          mode === 'abstract' ? 'Chain rule computation graph' : 'Neuron chain rule graph'
        }
      >
        <rect width={VW} height={VH} fill="var(--bg-primary, #0f0f1a)" rx={10} />

        {/* Edges with midpoint labels */}
        {data.edges.map((edge, i) => {
          const a = data.nodes[edge.from];
          const b = data.nodes[edge.to];
          if (!a || !b) return null;
          const midX = (a.cx + b.cx) / 2;
          const midY = a.cy - 22;
          const label = data.edgeLabels[i];
          return (
            <g key={`edge-${i}`}>
              <line
                x1={a.cx + 14}
                y1={a.cy}
                x2={b.cx - 14}
                y2={b.cy}
                stroke="var(--accent-violet, #a78bfa)"
                strokeWidth={1.8}
                markerEnd="url(#arrowhead)"
              />
              <text
                x={midX}
                y={midY}
                fill="var(--accent-orange, #fb923c)"
                fontSize={9}
                textAnchor="middle"
                fontFamily="var(--font-mono, monospace)"
              >
                {label?.formula ?? ''}
              </text>
            </g>
          );
        })}

        {/* Arrowhead marker */}
        <defs>
          <marker id="arrowhead" markerWidth={8} markerHeight={6} refX={6} refY={3} orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--accent-violet, #a78bfa)" />
          </marker>
        </defs>

        {/* Nodes */}
        {data.nodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.cx}
              cy={node.cy}
              r={14}
              fill="var(--bg-secondary, #14142a)"
              stroke="var(--accent-violet, #a78bfa)"
              strokeWidth={2}
            />
            <text
              x={node.cx}
              y={node.cy + 4}
              fill="var(--text-primary, #e2e8f0)"
              fontSize={11}
              fontWeight={700}
              textAnchor="middle"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Sliders */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mode === 'abstract' ? '1fr' : '1fr 1fr',
          gap: '10px',
          marginBottom: '14px',
        }}
      >
        {mode === 'abstract' && (
          <div>
            <label
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary, #94a3b8)',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              x :{' '}
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
        )}
        {mode === 'neuron' && (
          <>
            <div>
              <label
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary, #94a3b8)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                w :{' '}
                <strong style={{ color: 'var(--accent-violet, #a78bfa)' }}>
                  {formatNum(wVal, locale)}
                </strong>
              </label>
              <input
                type="range"
                min={-2}
                max={2}
                step={0.05}
                value={wVal}
                onChange={(e) => setWVal(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-violet, #a78bfa)' }}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary, #94a3b8)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                b :{' '}
                <strong style={{ color: 'var(--accent-orange, #fb923c)' }}>
                  {formatNum(bVal, locale)}
                </strong>
              </label>
              <input
                type="range"
                min={-2}
                max={2}
                step={0.05}
                value={bVal}
                onChange={(e) => setBVal(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-orange, #fb923c)' }}
              />
            </div>
          </>
        )}
      </div>

      {/* Product readout */}
      <div
        style={{
          padding: '10px 14px',
          background: 'var(--bg-primary, #0f0f1a)',
          border: '1px solid var(--border, #2d2d50)',
          borderRadius: '8px',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '12px',
          color: 'var(--text-secondary, #94a3b8)',
          marginBottom: '12px',
        }}
      >
        <span style={{ color: 'var(--text-muted, #64748b)' }}>{t.pathProduct} : </span>
        <span style={{ color: 'var(--accent-green, #4ade80)' }}>{data.productLabel}</span>
      </div>

      {/* Bridge note */}
      {mode === 'neuron' && (
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-muted, #64748b)',
            fontStyle: 'italic',
            margin: 0,
            borderLeft: '3px solid var(--accent-violet, #a78bfa)',
            paddingLeft: '10px',
          }}
        >
          {t.bridgeNote}
        </p>
      )}
    </div>
  );
}
