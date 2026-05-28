import { useEffect, useMemo, useState, type JSX } from 'react';
import {
  LOGIC_GATE_DATASETS,
  applyUpdate,
  findNextMistake,
  predict,
  type Sample,
  type Vector2,
} from '../../lib/perceptron';

type Locale = 'fr' | 'en';
type DatasetName = 'AND' | 'OR' | 'NAND' | 'XOR';

interface PerceptronGeometricStepperProps {
  locale?: Locale;
  initialDataset?: DatasetName;
  initialLearningRate?: number;
}

interface Dictionary {
  readonly title: string;
  readonly datasetLabel: string;
  readonly learningRate: string;
  readonly stateHeader: string;
  readonly stepsLabel: string;
  readonly epochsLabel: string;
  readonly misclassifiedLabel: string;
  readonly convergedBanner: string;
  readonly nonSeparableBanner: string;
  readonly btnNextMistake: string;
  readonly btnOneEpoch: string;
  readonly btnTenEpochs: string;
  readonly btnRandomize: string;
  readonly btnReset: string;
  readonly legendPositive: string;
  readonly legendNegative: string;
  readonly legendCorrect: string;
  readonly legendIncorrect: string;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: 'Construire le perceptron pas à pas',
    datasetLabel: 'Jeu de données',
    learningRate: 'Taux η',
    stateHeader: 'État',
    stepsLabel: 'Corrections',
    epochsLabel: 'Époques',
    misclassifiedLabel: 'Mal classés',
    convergedBanner: 'Convergé. Aucun exemple mal classé.',
    nonSeparableBanner: 'Non séparable : la règle oscille indéfiniment.',
    btnNextMistake: 'Prochaine erreur',
    btnOneEpoch: '+1 époque',
    btnTenEpochs: '+10 époques',
    btnRandomize: 'Initialiser au hasard',
    btnReset: 'Remettre à zéro',
    legendPositive: 'cible +1',
    legendNegative: 'cible −1',
    legendCorrect: 'contour vert : bien classé',
    legendIncorrect: 'contour rouge : mal classé',
  },
  en: {
    title: 'Build the perceptron step by step',
    datasetLabel: 'Dataset',
    learningRate: 'Rate η',
    stateHeader: 'State',
    stepsLabel: 'Corrections',
    epochsLabel: 'Epochs',
    misclassifiedLabel: 'Misclassified',
    convergedBanner: 'Converged. No misclassified sample.',
    nonSeparableBanner: 'Not separable: the rule oscillates forever.',
    btnNextMistake: 'Next mistake',
    btnOneEpoch: '+1 epoch',
    btnTenEpochs: '+10 epochs',
    btnRandomize: 'Random init',
    btnReset: 'Reset to zero',
    legendPositive: 'target +1',
    legendNegative: 'target −1',
    legendCorrect: 'green outline: correct',
    legendIncorrect: 'red outline: incorrect',
  },
};

const EPSILON = 1e-9;
const VIEW = 420;
const PAD = 50;
const DATA_MIN = -0.4;
const DATA_MAX = 1.4;
const DATA_RANGE = DATA_MAX - DATA_MIN;
const INNER = VIEW - 2 * PAD;

const dataToSvgX = (dx: number): number => PAD + ((dx - DATA_MIN) / DATA_RANGE) * INNER;
const dataToSvgY = (dy: number): number => VIEW - PAD - ((dy - DATA_MIN) / DATA_RANGE) * INNER;

function computeBoundary(w: Vector2, b: number): { x1: number; y1: number; x2: number; y2: number } | null {
  if (Math.abs(w[1]) >= EPSILON) {
    const yLeft = -(w[0] * DATA_MIN + b) / w[1];
    const yRight = -(w[0] * DATA_MAX + b) / w[1];
    return {
      x1: dataToSvgX(DATA_MIN),
      y1: dataToSvgY(yLeft),
      x2: dataToSvgX(DATA_MAX),
      y2: dataToSvgY(yRight),
    };
  }
  if (Math.abs(w[0]) >= EPSILON) {
    const xc = -b / w[0];
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

function countMisclassified(dataset: readonly Sample[], w: Vector2, b: number): number {
  let count = 0;
  for (const sample of dataset) {
    if (predict(sample, w, b) !== sample.y) count++;
  }
  return count;
}

function formatSigned(n: number): string {
  if (Math.abs(n) < 0.005) return '0.00';
  return n.toFixed(2);
}

const MAX_STEPS_PER_RUN = 200;

export default function PerceptronGeometricStepper({
  locale = 'fr',
  initialDataset = 'OR',
  initialLearningRate = 0.5,
}: PerceptronGeometricStepperProps): JSX.Element {
  const t = DICT[locale];
  const [datasetName, setDatasetName] = useState<DatasetName>(initialDataset);
  const [w, setW] = useState<Vector2>([0, 0]);
  const [b, setB] = useState<number>(0);
  const [lr, setLr] = useState<number>(initialLearningRate);
  const [stepsExecuted, setStepsExecuted] = useState<number>(0);
  const [epochsCompleted, setEpochsCompleted] = useState<number>(0);
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [convergedSignal, setConvergedSignal] = useState<boolean>(false);
  const [stalledSignal, setStalledSignal] = useState<boolean>(false);

  const dataset = LOGIC_GATE_DATASETS[datasetName];
  const boundary = useMemo(() => computeBoundary(w, b), [w, b]);
  const misclassifiedCount = useMemo(() => countMisclassified(dataset, w, b), [dataset, w, b]);

  useEffect(() => {
    if (highlightedIdx === null) return;
    const handle = window.setTimeout(() => setHighlightedIdx(null), 900);
    return () => window.clearTimeout(handle);
  }, [highlightedIdx]);

  const resetTo = (nextW: Vector2, nextB: number): void => {
    setW(nextW);
    setB(nextB);
    setStepsExecuted(0);
    setEpochsCompleted(0);
    setConvergedSignal(false);
    setStalledSignal(false);
    setHighlightedIdx(null);
  };

  const handleReset = (): void => resetTo([0, 0], 0);
  const handleRandomize = (): void => {
    const rand = (): number => Math.random() * 2 - 1;
    resetTo([rand(), rand()], rand());
  };
  const handleDataset = (name: DatasetName): void => {
    setDatasetName(name);
    resetTo([0, 0], 0);
  };

  const stepOnce = (): void => {
    const mistake = findNextMistake(dataset, w, b);
    if (!mistake) {
      setConvergedSignal(true);
      return;
    }
    const { newW, newB } = applyUpdate(mistake.sample, w, b, lr);
    setW(newW);
    setB(newB);
    setStepsExecuted((s) => s + 1);
    setHighlightedIdx(mistake.idx);
    setConvergedSignal(false);
  };

  const runEpochs = (n: number): void => {
    let curW = w;
    let curB = b;
    let stepsAdded = 0;
    let epochsAdded = 0;
    let converged = false;
    for (let e = 0; e < n; e++) {
      let updatesThisEpoch = 0;
      let epochAborted = false;
      for (const sample of dataset) {
        if (predict(sample, curW, curB) !== sample.y) {
          const upd = applyUpdate(sample, curW, curB, lr);
          curW = upd.newW;
          curB = upd.newB;
          stepsAdded++;
          updatesThisEpoch++;
          if (stepsAdded >= MAX_STEPS_PER_RUN) {
            epochAborted = true;
            break;
          }
        }
      }
      if (!epochAborted) epochsAdded++;
      if (updatesThisEpoch === 0) {
        converged = true;
        break;
      }
      if (stepsAdded >= MAX_STEPS_PER_RUN) break;
    }
    setW(curW);
    setB(curB);
    setStepsExecuted((s) => s + stepsAdded);
    setEpochsCompleted((e) => e + epochsAdded);
    setConvergedSignal(converged);
    setStalledSignal(!converged && stepsAdded >= MAX_STEPS_PER_RUN);
    setHighlightedIdx(null);
  };

  const datasetButtons: DatasetName[] = ['AND', 'OR', 'NAND', 'XOR'];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
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
                y={VIEW - PAD + 18}
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
          <line
            x1={PAD}
            y1={VIEW - PAD}
            x2={VIEW - PAD}
            y2={VIEW - PAD}
            stroke="var(--text-muted, #64748b)"
            strokeWidth={1}
          />
          <line
            x1={PAD}
            y1={PAD}
            x2={PAD}
            y2={VIEW - PAD}
            stroke="var(--text-muted, #64748b)"
            strokeWidth={1}
          />
          <text x={VIEW - PAD + 4} y={VIEW - PAD + 4} fill="var(--text-muted, #64748b)" fontSize={11}>
            x₁
          </text>
          <text x={PAD - 4} y={PAD - 10} fill="var(--text-muted, #64748b)" fontSize={11} textAnchor="end">
            x₂
          </text>
          {boundary && (
            <line
              x1={boundary.x1}
              y1={boundary.y1}
              x2={boundary.x2}
              y2={boundary.y2}
              stroke="var(--accent-violet, #a78bfa)"
              strokeWidth={2.5}
              strokeDasharray="6,4"
              opacity={0.9}
            />
          )}
          {dataset.map((sample, idx) => {
            const cx = dataToSvgX(sample.x[0]);
            const cy = dataToSvgY(sample.x[1]);
            const pred = predict(sample, w, b);
            const correct = pred === sample.y;
            const fill =
              sample.y === 1 ? 'var(--accent-orange, #fb923c)' : 'var(--text-muted, #64748b)';
            const stroke = correct
              ? 'var(--accent-green, #4ade80)'
              : 'var(--accent-red, #f87171)';
            const isHighlighted = highlightedIdx === idx;
            return (
              <g key={`sample-${idx}`}>
                {isHighlighted && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={22}
                    fill="none"
                    stroke="var(--accent-blue, #60a5fa)"
                    strokeWidth={2}
                    opacity={0.6}
                  >
                    <animate
                      attributeName="r"
                      from={16}
                      to={26}
                      dur="0.9s"
                      repeatCount="1"
                    />
                    <animate
                      attributeName="opacity"
                      from={0.8}
                      to={0}
                      dur="0.9s"
                      repeatCount="1"
                    />
                  </circle>
                )}
                <circle cx={cx} cy={cy} r={13} fill={fill} stroke={stroke} strokeWidth={3} />
                <text
                  x={cx}
                  y={cy + 4}
                  fill={sample.y === 1 ? 'var(--bg-primary, #0f0f1a)' : 'var(--text-primary, #e2e8f0)'}
                  fontSize={11}
                  fontWeight={700}
                  textAnchor="middle"
                >
                  {sample.y === 1 ? '+' : '−'}
                </text>
              </g>
            );
          })}
        </svg>
        <div
          style={{
            marginTop: '10px',
            display: 'flex',
            gap: '14px',
            justifyContent: 'center',
            fontSize: '11px',
            color: 'var(--text-muted, #64748b)',
            flexWrap: 'wrap',
          }}
        >
          <span>
            <span style={{ color: 'var(--accent-orange, #fb923c)', fontWeight: 700 }}>●</span>{' '}
            {t.legendPositive}
          </span>
          <span>
            <span style={{ color: 'var(--text-muted, #64748b)', fontWeight: 700 }}>●</span>{' '}
            {t.legendNegative}
          </span>
          <span style={{ color: 'var(--accent-green, #4ade80)' }}>{t.legendCorrect}</span>
          <span style={{ color: 'var(--accent-red, #f87171)' }}>{t.legendIncorrect}</span>
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
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-muted, #64748b)',
              marginBottom: '6px',
            }}
          >
            {t.datasetLabel}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {datasetButtons.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleDataset(name)}
                style={{
                  padding: '4px 10px',
                  background: datasetName === name ? 'var(--accent-violet, #a78bfa)' : 'transparent',
                  color: datasetName === name ? 'var(--bg-primary, #0f0f1a)' : 'var(--text-secondary, #94a3b8)',
                  border: '1px solid var(--border, #2d2d50)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '4px',
              fontSize: '12px',
              color: 'var(--text-muted, #64748b)',
            }}
          >
            <span>{t.learningRate}</span>
            <span
              style={{
                color: 'var(--accent-violet, #a78bfa)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {lr.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={lr}
            onChange={(e) => setLr(Number(e.target.value))}
            aria-label={t.learningRate}
            style={{ width: '100%' }}
          />
        </div>
        <div
          style={{
            background: 'var(--bg-primary, #0f0f1a)',
            border: '1px solid var(--border, #2d2d50)',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '14px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '12px',
            color: 'var(--text-secondary, #94a3b8)',
            lineHeight: 1.9,
          }}
        >
          <div>
            w₁ = <span style={{ color: 'var(--accent-violet, #a78bfa)' }}>{formatSigned(w[0])}</span>
          </div>
          <div>
            w₂ = <span style={{ color: 'var(--accent-violet, #a78bfa)' }}>{formatSigned(w[1])}</span>
          </div>
          <div>
            b = <span style={{ color: 'var(--accent-orange, #fb923c)' }}>{formatSigned(b)}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--border, #2d2d50)', paddingTop: '6px', marginTop: '6px' }}>
            {t.stepsLabel} :{' '}
            <span style={{ color: 'var(--accent-blue, #60a5fa)', fontWeight: 700 }}>
              {stepsExecuted}
            </span>{' '}
            · {t.epochsLabel} :{' '}
            <span style={{ color: 'var(--accent-blue, #60a5fa)', fontWeight: 700 }}>
              {epochsCompleted}
            </span>
          </div>
          <div>
            {t.misclassifiedLabel} :{' '}
            <span
              style={{
                color:
                  misclassifiedCount === 0
                    ? 'var(--accent-green, #4ade80)'
                    : 'var(--accent-red, #f87171)',
                fontWeight: 700,
              }}
            >
              {misclassifiedCount}/{dataset.length}
            </span>
          </div>
        </div>
        {(convergedSignal || stalledSignal) && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              marginBottom: '12px',
              background: convergedSignal
                ? 'rgba(74, 222, 128, 0.1)'
                : 'rgba(248, 113, 113, 0.1)',
              color: convergedSignal
                ? 'var(--accent-green, #4ade80)'
                : 'var(--accent-red, #f87171)',
              border: `1px solid ${
                convergedSignal ? 'var(--accent-green, #4ade80)' : 'var(--accent-red, #f87171)'
              }`,
            }}
          >
            {convergedSignal ? t.convergedBanner : t.nonSeparableBanner}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {(
            [
              { label: t.btnNextMistake, action: stepOnce, accent: 'var(--accent-blue, #60a5fa)' },
              { label: t.btnOneEpoch, action: () => runEpochs(1), accent: 'var(--accent-green, #4ade80)' },
              { label: t.btnTenEpochs, action: () => runEpochs(10), accent: 'var(--accent-green, #4ade80)' },
              { label: t.btnRandomize, action: handleRandomize, accent: 'var(--accent-violet, #a78bfa)' },
              { label: t.btnReset, action: handleReset, accent: 'var(--text-muted, #64748b)' },
            ] as const
          ).map(({ label, action, accent }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              style={{
                padding: '8px 12px',
                background: 'transparent',
                border: `1px solid ${accent}`,
                color: accent,
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 600,
                textAlign: 'left',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
