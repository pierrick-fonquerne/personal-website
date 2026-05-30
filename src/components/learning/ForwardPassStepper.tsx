import { useMemo, useState, type JSX } from 'react';

type Locale = 'fr' | 'en';

interface ForwardPassStepperProps {
  locale?: Locale;
}

interface Dictionary {
  readonly title: string;
  readonly hiddenActivationLabel: string;
  readonly relu: string;
  readonly sigmoid: string;
  readonly next: string;
  readonly prev: string;
  readonly reset: string;
  readonly stepLabel: string;
  readonly predictedClass: string;
  readonly diagramLabel: string;
  readonly stInput: string;
  readonly stHiddenPre: string;
  readonly stHiddenAct: string;
  readonly stOutputPre: string;
  readonly stOutputAct: string;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: 'Le forward pass, couche par couche',
    hiddenActivationLabel: 'Activation cachée',
    relu: 'ReLU',
    sigmoid: 'Sigmoïde',
    next: 'Étape suivante',
    prev: 'Précédent',
    reset: 'Recommencer',
    stepLabel: 'Étape',
    predictedClass: 'Classe prédite',
    diagramLabel: 'Réseau 2 entrées, 2 neurones cachés, 3 sorties',
    stInput: 'Entrée',
    stHiddenPre: 'Pré-activation cachée',
    stHiddenAct: 'Activation cachée',
    stOutputPre: 'Logits (pré-activation de sortie)',
    stOutputAct: 'Probabilités (softmax)',
  },
  en: {
    title: 'The forward pass, layer by layer',
    hiddenActivationLabel: 'Hidden activation',
    relu: 'ReLU',
    sigmoid: 'Sigmoid',
    next: 'Next step',
    prev: 'Previous',
    reset: 'Restart',
    stepLabel: 'Step',
    predictedClass: 'Predicted class',
    diagramLabel: 'Network with 2 inputs, 2 hidden neurons, 3 outputs',
    stInput: 'Input',
    stHiddenPre: 'Hidden pre-activation',
    stHiddenAct: 'Hidden activation',
    stOutputPre: 'Logits (output pre-activation)',
    stOutputAct: 'Probabilities (softmax)',
  },
};

type Vec = readonly number[];
type Mat = readonly (readonly number[])[];

type HiddenActivation = 'relu' | 'sigmoid';
type LayerTag = 'input' | 'hidden' | 'output';

const INPUT: Vec = [1, 2];
const W1: Mat = [
  [0.5, -0.5],
  [1, 0.5],
];
const B1: Vec = [0, -1];
const W2: Mat = [
  [1, 0],
  [0, 2],
  [1, 1],
];
const B2: Vec = [0, 0, -1];

function matVec(w: Mat, x: Vec): Vec {
  return w.map((row) => row.reduce((sum, wij, j) => sum + wij * (x[j] ?? 0), 0));
}

function addVec(a: Vec, b: Vec): Vec {
  return a.map((ai, i) => ai + (b[i] ?? 0));
}

function relu(z: Vec): Vec {
  return z.map((zi) => Math.max(0, zi));
}

function sigmoid(z: Vec): Vec {
  return z.map((zi) => 1 / (1 + Math.exp(-zi)));
}

function softmax(z: Vec): Vec {
  const max = Math.max(...z);
  const exps = z.map((zi) => Math.exp(zi - max));
  const sum = exps.reduce((acc, e) => acc + e, 0);
  return exps.map((e) => e / sum);
}

function argmax(v: Vec): number {
  let best = 0;
  for (let i = 1; i < v.length; i += 1) {
    if ((v[i] ?? -Infinity) > (v[best] ?? -Infinity)) best = i;
  }
  return best;
}

function formatNum(n: number, locale: Locale): string {
  const rounded = Math.abs(n) < 0.005 ? 0 : n;
  const text = rounded.toFixed(2);
  return locale === 'fr' ? text.replace('.', ',') : text;
}

function formatVec(v: Vec, locale: Locale): string {
  const sep = locale === 'fr' ? ' ; ' : ', ';
  return `(${v.map((x) => formatNum(x, locale)).join(sep)})`;
}

interface Stage {
  readonly key: string;
  readonly title: string;
  readonly formula: string;
  readonly values: Vec;
  readonly highlight: LayerTag;
  readonly isProb: boolean;
}

function buildStages(hidden: HiddenActivation, t: Dictionary): readonly Stage[] {
  const z1 = addVec(matVec(W1, INPUT), B1);
  const h = hidden === 'relu' ? relu(z1) : sigmoid(z1);
  const z2 = addVec(matVec(W2, h), B2);
  const probs = softmax(z2);
  const actFormula = hidden === 'relu' ? 'h = ReLU(z⁽¹⁾)' : 'h = σ(z⁽¹⁾)';
  return [
    {
      key: 'input',
      title: t.stInput,
      formula: 'x',
      values: INPUT,
      highlight: 'input',
      isProb: false,
    },
    {
      key: 'hidden-pre',
      title: t.stHiddenPre,
      formula: 'z⁽¹⁾ = W⁽¹⁾x + b⁽¹⁾',
      values: z1,
      highlight: 'hidden',
      isProb: false,
    },
    {
      key: 'hidden-act',
      title: t.stHiddenAct,
      formula: actFormula,
      values: h,
      highlight: 'hidden',
      isProb: false,
    },
    {
      key: 'output-pre',
      title: t.stOutputPre,
      formula: 'z⁽²⁾ = W⁽²⁾h + b⁽²⁾',
      values: z2,
      highlight: 'output',
      isProb: false,
    },
    {
      key: 'output-act',
      title: t.stOutputAct,
      formula: 'ŷ = softmax(z⁽²⁾)',
      values: probs,
      highlight: 'output',
      isProb: true,
    },
  ];
}

const VIEW_W = 320;
const VIEW_H = 220;

interface NodePos {
  readonly x: number;
  readonly y: number;
  readonly layer: LayerTag;
  readonly label: string;
}

const NODES: readonly NodePos[] = [
  { x: 44, y: 74, layer: 'input', label: 'x₁' },
  { x: 44, y: 150, layer: 'input', label: 'x₂' },
  { x: 160, y: 64, layer: 'hidden', label: 'h₁' },
  { x: 160, y: 160, layer: 'hidden', label: 'h₂' },
  { x: 276, y: 46, layer: 'output', label: 'ŷ₁' },
  { x: 276, y: 112, layer: 'output', label: 'ŷ₂' },
  { x: 276, y: 178, layer: 'output', label: 'ŷ₃' },
];

const EDGES: readonly (readonly [number, number])[] = [
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 4],
  [2, 5],
  [2, 6],
  [3, 4],
  [3, 5],
  [3, 6],
];

function nodeColor(node: NodePos, active: LayerTag): string {
  if (node.layer !== active) return 'var(--text-muted, #64748b)';
  if (node.layer === 'output') return 'var(--accent-green, #4ade80)';
  if (node.layer === 'hidden') return 'var(--accent-violet, #a78bfa)';
  return 'var(--accent-orange, #fb923c)';
}

export default function ForwardPassStepper({
  locale = 'fr',
}: ForwardPassStepperProps): JSX.Element {
  const t = DICT[locale];
  const [hidden, setHidden] = useState<HiddenActivation>('relu');
  const [stage, setStage] = useState<number>(0);

  const stages = useMemo(() => buildStages(hidden, t), [hidden, t]);
  const current = stages[stage] ?? stages[0];
  const activeLayer: LayerTag = current?.highlight ?? 'input';
  const probs = stages[stages.length - 1]?.values ?? INPUT;
  const predicted = argmax(probs) + 1;
  const atEnd = stage >= stages.length - 1;
  const showPrediction = atEnd;

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
          aria-label={t.diagramLabel}
        >
          <rect width={VIEW_W} height={VIEW_H} fill="var(--bg-primary, #0f0f1a)" rx={10} />
          {EDGES.map(([from, to]) => {
            const a = NODES[from];
            const b = NODES[to];
            if (!a || !b) return null;
            const lit = a.layer === activeLayer || b.layer === activeLayer;
            return (
              <line
                key={`${from}-${to}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={lit ? 'var(--accent-violet, #a78bfa)' : 'var(--border, #2d2d50)'}
                strokeWidth={lit ? 1.6 : 1}
                opacity={lit ? 0.9 : 0.5}
              />
            );
          })}
          {NODES.map((node) => (
            <g key={node.label}>
              <circle
                cx={node.x}
                cy={node.y}
                r={18}
                fill="var(--bg-secondary, #14142a)"
                stroke={nodeColor(node, activeLayer)}
                strokeWidth={node.layer === activeLayer ? 2.6 : 1.6}
              />
              <text
                x={node.x}
                y={node.y + 4}
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
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
            fontSize: '12px',
            color: 'var(--text-muted, #64748b)',
          }}
        >
          <span>{t.hiddenActivationLabel}</span>
          {(
            [
              { key: 'relu' as const, label: t.relu },
              { key: 'sigmoid' as const, label: t.sigmoid },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setHidden(key)}
              style={{
                padding: '3px 10px',
                background: hidden === key ? 'var(--accent-violet, #a78bfa)' : 'transparent',
                border: '1px solid var(--accent-violet, #a78bfa)',
                color:
                  hidden === key ? 'var(--bg-primary, #0f0f1a)' : 'var(--accent-violet, #a78bfa)',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 600,
              }}
            >
              {label}
            </button>
          ))}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {stages.slice(0, stage + 1).map((s, index) => {
            const isCurrent = index === stage;
            return (
              <div
                key={s.key}
                style={{
                  padding: '10px 12px',
                  background: isCurrent
                    ? 'rgba(167, 139, 250, 0.10)'
                    : 'var(--bg-primary, #0f0f1a)',
                  border: `1px solid ${isCurrent ? 'var(--accent-violet, #a78bfa)' : 'var(--border, #2d2d50)'}`,
                  borderRadius: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: 'var(--text-muted, #64748b)',
                    marginBottom: '4px',
                  }}
                >
                  <span>
                    {t.stepLabel} {index + 1}
                  </span>
                  <span>{s.title}</span>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '12px',
                    color: 'var(--text-secondary, #94a3b8)',
                    marginBottom: '4px',
                  }}
                >
                  {s.formula}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: s.isProb
                      ? 'var(--accent-green, #4ade80)'
                      : 'var(--accent-violet, #a78bfa)',
                  }}
                >
                  {formatVec(s.values, locale)}
                </div>
              </div>
            );
          })}
        </div>
        {showPrediction && (
          <div
            style={{
              marginTop: '10px',
              padding: '8px 12px',
              background: 'rgba(74, 222, 128, 0.10)',
              borderLeft: '3px solid var(--accent-green, #4ade80)',
              borderRadius: '0 6px 6px 0',
              fontSize: '12px',
              color: 'var(--text-secondary, #94a3b8)',
            }}
          >
            {t.predictedClass} :{' '}
            <span style={{ color: 'var(--accent-green, #4ade80)', fontWeight: 700 }}>
              {predicted}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', gap: '6px', marginTop: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStage((s) => Math.max(0, s - 1))}
            disabled={stage === 0}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid var(--border, #2d2d50)',
              color: stage === 0 ? 'var(--text-muted, #64748b)' : 'var(--text-secondary, #94a3b8)',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: stage === 0 ? 'default' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t.prev}
          </button>
          <button
            type="button"
            onClick={() => setStage((s) => Math.min(stages.length - 1, s + 1))}
            disabled={atEnd}
            style={{
              padding: '6px 12px',
              background: atEnd ? 'transparent' : 'var(--accent-violet, #a78bfa)',
              border: '1px solid var(--accent-violet, #a78bfa)',
              color: atEnd ? 'var(--text-muted, #64748b)' : 'var(--bg-primary, #0f0f1a)',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: atEnd ? 'default' : 'pointer',
              fontFamily: 'inherit',
              fontWeight: 600,
            }}
          >
            {t.next}
          </button>
          <button
            type="button"
            onClick={() => setStage(0)}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid var(--border, #2d2d50)',
              color: 'var(--text-secondary, #94a3b8)',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t.reset}
          </button>
        </div>
      </div>
    </div>
  );
}
