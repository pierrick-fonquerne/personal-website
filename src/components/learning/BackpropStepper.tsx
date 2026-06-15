import { useMemo, useState, type JSX } from 'react';
import { forwardPass, backwardPass, type Network221 } from './backprop/backpropagation';

type Locale = 'fr' | 'en';

interface BackpropStepperProps {
  locale?: Locale;
}

interface Dictionary {
  readonly title: string;
  readonly next: string;
  readonly prev: string;
  readonly reset: string;
  readonly stepLabel: string;
  readonly diagramLabel: string;
  readonly phaseForward: string;
  readonly phaseBackward: string;
  readonly stInput: string;
  readonly stHiddenPre: string;
  readonly stHiddenAct: string;
  readonly stOutputPre: string;
  readonly stOutputAct: string;
  readonly stDeltaOut: string;
  readonly stGradOut: string;
  readonly stDeltaHidden: string;
  readonly stGradHidden: string;
  readonly lossLabel: string;
  readonly deltaOut: string;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: 'Rétropropagation, étape par étape',
    next: 'Étape suivante',
    prev: 'Précédent',
    reset: 'Recommencer',
    stepLabel: 'Étape',
    diagramLabel: 'Réseau 2 entrées, 2 neurones cachés, 1 sortie (réseau 2-2-1)',
    phaseForward: 'Forward',
    phaseBackward: 'Backward',
    stInput: 'Entrée x',
    stHiddenPre: 'Pré-activation cachée z⁽¹⁾',
    stHiddenAct: 'Activation cachée a⁽¹⁾',
    stOutputPre: 'Pré-activation de sortie z⁽²⁾',
    stOutputAct: 'Sortie a⁽²⁾ et perte L',
    stDeltaOut: "Signal d'erreur de sortie",
    stGradOut: 'Gradients couche de sortie',
    stDeltaHidden: "Signaux d'erreur cachés",
    stGradHidden: 'Gradients couche cachée',
    lossLabel: 'Perte',
    deltaOut: 'δ_sortie',
  },
  en: {
    title: 'Backpropagation, step by step',
    next: 'Next step',
    prev: 'Previous',
    reset: 'Restart',
    stepLabel: 'Step',
    diagramLabel: 'Network with 2 inputs, 2 hidden neurons, 1 output (2-2-1 network)',
    phaseForward: 'Forward',
    phaseBackward: 'Backward',
    stInput: 'Input x',
    stHiddenPre: 'Hidden pre-activation z⁽¹⁾',
    stHiddenAct: 'Hidden activation a⁽¹⁾',
    stOutputPre: 'Output pre-activation z⁽²⁾',
    stOutputAct: 'Output a⁽²⁾ and loss L',
    stDeltaOut: 'Output error signal',
    stGradOut: 'Output layer gradients',
    stDeltaHidden: 'Hidden error signals',
    stGradHidden: 'Hidden layer gradients',
    lossLabel: 'Loss',
    deltaOut: 'δ_out',
  },
};

type Phase = 'forward' | 'backward';
type LayerTag = 'input' | 'hidden' | 'output';

const NET: Network221 = {
  w1: [
    [0.1, 0.2],
    [0.3, 0.4],
  ],
  b1: [0, 0],
  w2: [0.5, 0.6],
  b2: 0.1,
};
const X: readonly number[] = [1, 2];
const Y = 1;

function formatNum(n: number, locale: Locale): string {
  const rounded = Math.abs(n) < 0.005 ? 0 : n;
  const text = rounded.toFixed(2);
  return locale === 'fr' ? text.replace('.', ',') : text;
}

function formatPair(a: number, b: number, locale: Locale): string {
  const sep = locale === 'fr' ? ' ; ' : ', ';
  return `(${formatNum(a, locale)}${sep}${formatNum(b, locale)})`;
}

interface StepCard {
  readonly key: string;
  readonly phase: Phase;
  readonly highlight: LayerTag;
  readonly title: string;
  readonly formula: string;
  readonly value: string;
}

function buildSteps(t: Dictionary, locale: Locale): readonly StepCard[] {
  const fwd = forwardPass(NET, X as number[]);
  const bwd = backwardPass(NET, fwd, Y);
  const L = (fwd.a2 - Y) ** 2;
  const sep = locale === 'fr' ? ' ; ' : ', ';

  return [
    {
      key: 'input',
      phase: 'forward',
      highlight: 'input',
      title: t.stInput,
      formula: 'x',
      value: `(${X.map((v) => formatNum(v, locale)).join(sep)})`,
    },
    {
      key: 'hidden-pre',
      phase: 'forward',
      highlight: 'hidden',
      title: t.stHiddenPre,
      formula: 'z⁽¹⁾ = W⁽¹⁾ x + b⁽¹⁾',
      value: formatPair(fwd.z1[0] ?? 0, fwd.z1[1] ?? 0, locale),
    },
    {
      key: 'hidden-act',
      phase: 'forward',
      highlight: 'hidden',
      title: t.stHiddenAct,
      formula: 'a⁽¹⁾ = σ(z⁽¹⁾)',
      value: formatPair(fwd.a1[0] ?? 0, fwd.a1[1] ?? 0, locale),
    },
    {
      key: 'output-pre',
      phase: 'forward',
      highlight: 'output',
      title: t.stOutputPre,
      formula: 'z⁽²⁾ = w⁽²⁾ · a⁽¹⁾ + b⁽²⁾',
      value: formatNum(fwd.z2, locale),
    },
    {
      key: 'output-act',
      phase: 'forward',
      highlight: 'output',
      title: t.stOutputAct,
      formula: `a⁽²⁾ = σ(z⁽²⁾)  |  L = (a⁽²⁾ - y)²`,
      value: `a⁽²⁾ = ${formatNum(fwd.a2, locale)}  |  ${t.lossLabel} = ${formatNum(L, locale)}`,
    },
    {
      key: 'delta-out',
      phase: 'backward',
      highlight: 'output',
      title: t.stDeltaOut,
      formula: `${t.deltaOut} = 2(a⁽²⁾ - y) · a⁽²⁾(1 - a⁽²⁾)`,
      value: formatNum(bwd.deltaOut, locale),
    },
    {
      key: 'grad-out',
      phase: 'backward',
      highlight: 'output',
      title: t.stGradOut,
      formula: `∇w⁽²⁾ = ${t.deltaOut} · a⁽¹⁾  |  ∇b⁽²⁾ = ${t.deltaOut}`,
      value: `∇w⁽²⁾ = ${formatPair(bwd.gradW2[0] ?? 0, bwd.gradW2[1] ?? 0, locale)}  |  ∇b⁽²⁾ = ${formatNum(bwd.gradB2, locale)}`,
    },
    {
      key: 'delta-hidden',
      phase: 'backward',
      highlight: 'hidden',
      title: t.stDeltaHidden,
      formula: `δⱼ = w⁽²⁾ⱼ · ${t.deltaOut} · a⁽¹⁾ⱼ(1 - a⁽¹⁾ⱼ)`,
      value: formatPair(bwd.deltaHidden[0] ?? 0, bwd.deltaHidden[1] ?? 0, locale),
    },
    {
      key: 'grad-hidden',
      phase: 'backward',
      highlight: 'input',
      title: t.stGradHidden,
      formula: '∇w⁽¹⁾ⱼᵢ = δⱼ · xᵢ  |  ∇b⁽¹⁾ = δ',
      value: `∇b⁽¹⁾ = ${formatPair(bwd.gradB1[0] ?? 0, bwd.gradB1[1] ?? 0, locale)}`,
    },
  ];
}

const VIEW_W = 280;
const VIEW_H = 180;

interface NodePos {
  readonly x: number;
  readonly y: number;
  readonly layer: LayerTag;
  readonly label: string;
}

const NODES: readonly NodePos[] = [
  { x: 40, y: 70, layer: 'input', label: 'x₁' },
  { x: 40, y: 130, layer: 'input', label: 'x₂' },
  { x: 140, y: 70, layer: 'hidden', label: 'h₁' },
  { x: 140, y: 130, layer: 'hidden', label: 'h₂' },
  { x: 240, y: 100, layer: 'output', label: 'ȳ' },
];

const EDGES: readonly (readonly [number, number])[] = [
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 4],
  [3, 4],
];

function phaseAccent(phase: Phase): string {
  return phase === 'forward' ? 'var(--accent-violet, #a78bfa)' : 'var(--accent-orange, #fb923c)';
}

function nodeColor(node: NodePos, highlight: LayerTag, phase: Phase): string {
  if (node.layer !== highlight) return 'var(--text-muted, #64748b)';
  return phaseAccent(phase);
}

function edgeLit(fromIdx: number, toIdx: number, highlight: LayerTag, phase: Phase): boolean {
  const from = NODES[fromIdx];
  const to = NODES[toIdx];
  if (!from || !to) return false;
  if (phase === 'forward') {
    return from.layer === highlight || to.layer === highlight;
  }
  // backward: highlight flows right-to-left, so invert which side is "active"
  return from.layer === highlight || to.layer === highlight;
}

function PhaseTag({ phase, label }: { phase: Phase; label: string }): JSX.Element {
  const color = phaseAccent(phase);
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 7px',
        border: `1px solid ${color}`,
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 700,
        color,
        marginLeft: '6px',
        letterSpacing: '0.03em',
      }}
    >
      {label}
    </span>
  );
}

export default function BackpropStepper({ locale = 'fr' }: BackpropStepperProps): JSX.Element {
  const t = DICT[locale];
  const [step, setStep] = useState<number>(0);

  const steps = useMemo(() => buildSteps(t, locale), [t, locale]);
  const current = steps[step] ?? steps[0];
  const highlight: LayerTag = current?.highlight ?? 'input';
  const phase: Phase = current?.phase ?? 'forward';
  const atEnd = step >= steps.length - 1;

  const accentColor = phaseAccent(phase);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)',
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
          {EDGES.map(([fromIdx, toIdx]) => {
            const a = NODES[fromIdx];
            const b = NODES[toIdx];
            if (!a || !b) return null;
            const lit = edgeLit(fromIdx, toIdx, highlight, phase);
            return (
              <line
                key={`${fromIdx}-${toIdx}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={lit ? accentColor : 'var(--border, #2d2d50)'}
                strokeWidth={lit ? 1.8 : 1}
                opacity={lit ? 0.9 : 0.45}
              />
            );
          })}
          {NODES.map((node) => (
            <g key={node.label}>
              <circle
                cx={node.x}
                cy={node.y}
                r={17}
                fill="var(--bg-secondary, #14142a)"
                stroke={nodeColor(node, highlight, phase)}
                strokeWidth={node.layer === highlight ? 2.6 : 1.4}
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
          <text
            x={VIEW_W / 2}
            y={VIEW_H - 8}
            fill={accentColor}
            fontSize={9}
            textAnchor="middle"
            fontWeight={600}
            letterSpacing="0.05em"
          >
            {phase === 'forward' ? '< >' : '< <'}{' '}
            {phase === 'forward' ? t.phaseForward : t.phaseBackward}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {steps.slice(0, step + 1).map((s, index) => {
            const isCurrent = index === step;
            const cardAccent = phaseAccent(s.phase);
            return (
              <div
                key={s.key}
                style={{
                  padding: '10px 12px',
                  background: isCurrent
                    ? s.phase === 'forward'
                      ? 'rgba(167, 139, 250, 0.10)'
                      : 'rgba(251, 146, 60, 0.10)'
                    : 'var(--bg-primary, #0f0f1a)',
                  border: `1px solid ${isCurrent ? cardAccent : 'var(--border, #2d2d50)'}`,
                  borderRadius: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    color: 'var(--text-muted, #64748b)',
                    marginBottom: '4px',
                  }}
                >
                  <span>
                    {t.stepLabel} {index + 1}
                    <PhaseTag
                      phase={s.phase}
                      label={s.phase === 'forward' ? t.phaseForward : t.phaseBackward}
                    />
                  </span>
                  <span style={{ fontSize: '10px' }}>{s.title}</span>
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
                    color: cardAccent,
                  }}
                >
                  {s.value}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '6px', marginTop: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid var(--border, #2d2d50)',
              color: step === 0 ? 'var(--text-muted, #64748b)' : 'var(--text-secondary, #94a3b8)',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: step === 0 ? 'default' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t.prev}
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            disabled={atEnd}
            style={{
              padding: '6px 12px',
              background: atEnd ? 'transparent' : accentColor,
              border: `1px solid ${accentColor}`,
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
            onClick={() => setStep(0)}
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
