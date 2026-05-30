import { useMemo, useState, type JSX } from 'react';

type Locale = 'fr' | 'en';

interface LossComparatorProps {
  locale?: Locale;
}

interface Dictionary {
  readonly title: string;
  readonly mRegression: string;
  readonly mBinary: string;
  readonly mMulticlass: string;
  readonly predLabel: string;
  readonly targetLabel: string;
  readonly probLabel: string;
  readonly targetBinLabel: string;
  readonly logitLabel: string;
  readonly trueClassLabel: string;
  readonly mseLabel: string;
  readonly ceLabel: string;
  readonly confidentWrong: string;
  readonly regressionNote: string;
  readonly plotMse: string;
  readonly plotCe: string;
  readonly axisProb: string;
  readonly classWord: string;
  readonly diagramLabel: string;
}

const DICT: Record<Locale, Dictionary> = {
  fr: {
    title: 'MSE contre entropie croisée',
    mRegression: 'Régression',
    mBinary: 'Classif. binaire',
    mMulticlass: '3 classes (softmax)',
    predLabel: 'prédiction',
    targetLabel: 'cible',
    probLabel: 'probabilité prédite p',
    targetBinLabel: 'cible',
    logitLabel: 'logit',
    trueClassLabel: 'classe vraie',
    mseLabel: 'Erreur quadratique (MSE)',
    ceLabel: 'Entropie croisée',
    confidentWrong: 'Confiant et faux : la note explose.',
    regressionNote: "L'entropie croisée ne s'applique qu'à la classification, pas à la régression.",
    plotMse: 'MSE',
    plotCe: 'Entropie croisée',
    axisProb: 'p',
    classWord: 'classe',
    diagramLabel: 'Comparaison des coûts en fonction de la prédiction',
  },
  en: {
    title: 'MSE versus cross-entropy',
    mRegression: 'Regression',
    mBinary: 'Binary classif.',
    mMulticlass: '3 classes (softmax)',
    predLabel: 'prediction',
    targetLabel: 'target',
    probLabel: 'predicted probability p',
    targetBinLabel: 'target',
    logitLabel: 'logit',
    trueClassLabel: 'true class',
    mseLabel: 'Squared error (MSE)',
    ceLabel: 'Cross-entropy',
    confidentWrong: 'Confident and wrong: the score blows up.',
    regressionNote: 'Cross-entropy applies only to classification, not to regression.',
    plotMse: 'MSE',
    plotCe: 'Cross-entropy',
    axisProb: 'p',
    classWord: 'class',
    diagramLabel: 'Comparison of losses as a function of the prediction',
  },
};

type Vec = readonly number[];
type Mode = 'regression' | 'binary' | 'multiclass';

const EPS = 1e-6;

function clampProb(p: number): number {
  return Math.min(1 - EPS, Math.max(EPS, p));
}

function squaredError(pred: number, target: number): number {
  return (pred - target) ** 2;
}

function binaryCrossEntropy(p: number, t: 0 | 1): number {
  const pc = clampProb(p);
  return -(t * Math.log(pc) + (1 - t) * Math.log(1 - pc));
}

function softmax(z: Vec): Vec {
  const max = Math.max(...z);
  const exps = z.map((zi) => Math.exp(zi - max));
  const sum = exps.reduce((acc, e) => acc + e, 0);
  return exps.map((e) => e / sum);
}

function crossEntropy(probs: Vec, trueClass: number): number {
  return -Math.log(clampProb(probs[trueClass] ?? EPS));
}

function meanSquaredError(probs: Vec, trueClass: number): number {
  const n = probs.length;
  const sum = probs.reduce((acc, pk, k) => acc + (pk - (k === trueClass ? 1 : 0)) ** 2, 0);
  return sum / n;
}

function formatNum(n: number, locale: Locale, digits = 2): string {
  const rounded = Math.abs(n) < 0.005 ? 0 : n;
  const text = rounded.toFixed(digits);
  return locale === 'fr' ? text.replace('.', ',') : text;
}

const PW = 300;
const PH = 190;
const PAD = 28;
const LMAX = 4;

function plotX(p: number): number {
  return PAD + p * (PW - 2 * PAD);
}

function plotY(loss: number): number {
  return PH - PAD - (Math.min(loss, LMAX) / LMAX) * (PH - 2 * PAD);
}

function buildCurve(t: 0 | 1, kind: 'mse' | 'ce'): string {
  const steps = 60;
  const points: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const p = i / steps;
    const loss = kind === 'mse' ? squaredError(p, t) : binaryCrossEntropy(p, t);
    points.push(`${plotX(p).toFixed(1)},${plotY(loss).toFixed(1)}`);
  }
  return points.join(' ');
}

function ModeSwitch({
  mode,
  setMode,
  t,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  t: Dictionary;
}): JSX.Element {
  const options: readonly { readonly key: Mode; readonly label: string }[] = [
    { key: 'regression', label: t.mRegression },
    { key: 'binary', label: t.mBinary },
    { key: 'multiclass', label: t.mMulticlass },
  ];
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
      {options.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setMode(key)}
          style={{
            padding: '4px 10px',
            background: mode === key ? 'var(--accent-violet, #a78bfa)' : 'transparent',
            border: '1px solid var(--accent-violet, #a78bfa)',
            color: mode === key ? 'var(--bg-primary, #0f0f1a)' : 'var(--accent-violet, #a78bfa)',
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
  );
}

function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}): JSX.Element {
  return (
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
        <span>{label}</span>
        <span
          style={{
            color: 'var(--accent-violet, #a78bfa)',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        style={{ width: '100%' }}
      />
    </div>
  );
}

function LossReadout({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}): JSX.Element {
  return (
    <div
      style={{
        flex: 1,
        minWidth: '120px',
        padding: '10px 12px',
        background: 'var(--bg-primary, #0f0f1a)',
        border: '1px solid var(--border, #2d2d50)',
        borderRadius: '8px',
      }}
    >
      <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginBottom: '4px' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color,
          fontFamily: 'var(--font-mono, monospace)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function LossComparator({ locale = 'fr' }: LossComparatorProps): JSX.Element {
  const t = DICT[locale];
  const [mode, setMode] = useState<Mode>('binary');
  const [predReg, setPredReg] = useState<number>(4);
  const [yReg, setYReg] = useState<number>(6);
  const [p, setP] = useState<number>(0.5);
  const [tBin, setTBin] = useState<0 | 1>(1);
  const [logits, setLogits] = useState<number[]>([1, 2, 0]);
  const [trueClass, setTrueClass] = useState<number>(1);

  const probs = useMemo(() => softmax(logits), [logits]);

  const mseCurve = useMemo(() => buildCurve(tBin, 'mse'), [tBin]);
  const ceCurve = useMemo(() => buildCurve(tBin, 'ce'), [tBin]);

  const confidentWrong =
    (mode === 'binary' && ((tBin === 1 && p < 0.15) || (tBin === 0 && p > 0.85))) ||
    (mode === 'multiclass' && (probs[trueClass] ?? 1) < 0.2);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
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
        {mode === 'binary' && (
          <svg
            viewBox={`0 0 ${PW} ${PH}`}
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: 'auto', display: 'block' }}
            role="img"
            aria-label={t.diagramLabel}
          >
            <rect width={PW} height={PH} fill="var(--bg-primary, #0f0f1a)" rx={10} />
            <line
              x1={PAD}
              y1={PH - PAD}
              x2={PW - PAD}
              y2={PH - PAD}
              stroke="var(--border, #2d2d50)"
              strokeWidth={1}
            />
            <line
              x1={PAD}
              y1={PAD}
              x2={PAD}
              y2={PH - PAD}
              stroke="var(--border, #2d2d50)"
              strokeWidth={1}
            />
            <polyline
              points={mseCurve}
              fill="none"
              stroke="var(--accent-orange, #fb923c)"
              strokeWidth={2}
            />
            <polyline
              points={ceCurve}
              fill="none"
              stroke="var(--accent-red, #f87171)"
              strokeWidth={2}
            />
            <line
              x1={plotX(p)}
              y1={PAD}
              x2={plotX(p)}
              y2={PH - PAD}
              stroke="var(--accent-violet, #a78bfa)"
              strokeWidth={1.4}
              strokeDasharray="3 3"
            />
            <text
              x={PW - PAD}
              y={PH - 10}
              fill="var(--text-muted, #64748b)"
              fontSize={10}
              textAnchor="end"
            >
              {t.axisProb} = {formatNum(p, locale)}
            </text>
            <text x={PAD + 6} y={PAD + 4} fill="var(--accent-orange, #fb923c)" fontSize={10}>
              {t.plotMse}
            </text>
            <text x={PAD + 6} y={PAD + 18} fill="var(--accent-red, #f87171)" fontSize={10}>
              {t.plotCe}
            </text>
          </svg>
        )}
        {mode === 'multiclass' && (
          <svg
            viewBox={`0 0 ${PW} ${PH}`}
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: 'auto', display: 'block' }}
            role="img"
            aria-label={t.diagramLabel}
          >
            <rect width={PW} height={PH} fill="var(--bg-primary, #0f0f1a)" rx={10} />
            {probs.map((pk, k) => {
              const barW = 56;
              const gap = 28;
              const x = PAD + 10 + k * (barW + gap);
              const h = pk * (PH - 2 * PAD);
              const isTrue = k === trueClass;
              return (
                <g key={k}>
                  <rect
                    x={x}
                    y={PH - PAD - h}
                    width={barW}
                    height={h}
                    rx={4}
                    fill={isTrue ? 'var(--accent-green, #4ade80)' : 'var(--accent-violet, #a78bfa)'}
                    opacity={isTrue ? 0.95 : 0.55}
                  />
                  <text
                    x={x + barW / 2}
                    y={PH - PAD + 14}
                    fill="var(--text-muted, #64748b)"
                    fontSize={10}
                    textAnchor="middle"
                  >
                    {t.classWord} {k + 1}
                  </text>
                  <text
                    x={x + barW / 2}
                    y={PH - PAD - h - 6}
                    fill="var(--text-secondary, #94a3b8)"
                    fontSize={10}
                    textAnchor="middle"
                  >
                    {formatNum(pk, locale)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
        {mode === 'regression' && (
          <div
            style={{
              padding: '18px',
              background: 'var(--bg-primary, #0f0f1a)',
              border: '1px solid var(--border, #2d2d50)',
              borderRadius: '10px',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '13px',
              color: 'var(--text-secondary, #94a3b8)',
              lineHeight: 2,
            }}
          >
            <div>
              {t.predLabel} ={' '}
              <span style={{ color: 'var(--accent-violet, #a78bfa)' }}>
                {formatNum(predReg, locale)}
              </span>
            </div>
            <div>
              {t.targetLabel} ={' '}
              <span style={{ color: 'var(--accent-green, #4ade80)' }}>
                {formatNum(yReg, locale)}
              </span>
            </div>
            <div>
              {t.predLabel} - {t.targetLabel} ={' '}
              <span style={{ color: 'var(--accent-orange, #fb923c)' }}>
                {formatNum(predReg - yReg, locale)}
              </span>
            </div>
            <div
              style={{
                marginTop: '8px',
                fontSize: '11px',
                color: 'var(--text-muted, #64748b)',
                lineHeight: 1.5,
              }}
            >
              {t.regressionNote}
            </div>
          </div>
        )}
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
        <ModeSwitch mode={mode} setMode={setMode} t={t} />

        {mode === 'regression' && (
          <>
            <Slider
              label={t.predLabel}
              value={predReg}
              display={formatNum(predReg, locale)}
              min={0}
              max={10}
              step={0.5}
              onChange={setPredReg}
            />
            <Slider
              label={t.targetLabel}
              value={yReg}
              display={formatNum(yReg, locale)}
              min={0}
              max={10}
              step={0.5}
              onChange={setYReg}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <LossReadout
                label={t.mseLabel}
                value={formatNum(squaredError(predReg, yReg), locale)}
                color="var(--accent-orange, #fb923c)"
              />
            </div>
          </>
        )}

        {mode === 'binary' && (
          <>
            <Slider
              label={t.probLabel}
              value={p}
              display={formatNum(p, locale)}
              min={0}
              max={1}
              step={0.01}
              onChange={setP}
            />
            <div
              style={{
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                marginBottom: '12px',
                fontSize: '12px',
                color: 'var(--text-muted, #64748b)',
              }}
            >
              <span>{t.targetBinLabel}</span>
              {([0, 1] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTBin(value)}
                  style={{
                    padding: '3px 12px',
                    background: tBin === value ? 'var(--accent-green, #4ade80)' : 'transparent',
                    border: '1px solid var(--accent-green, #4ade80)',
                    color:
                      tBin === value
                        ? 'var(--bg-primary, #0f0f1a)'
                        : 'var(--accent-green, #4ade80)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <LossReadout
                label={t.mseLabel}
                value={formatNum(squaredError(p, tBin), locale)}
                color="var(--accent-orange, #fb923c)"
              />
              <LossReadout
                label={t.ceLabel}
                value={formatNum(binaryCrossEntropy(p, tBin), locale)}
                color="var(--accent-red, #f87171)"
              />
            </div>
          </>
        )}

        {mode === 'multiclass' && (
          <>
            {logits.map((value, index) => (
              <Slider
                key={index}
                label={`${t.logitLabel} z${index + 1}`}
                value={value}
                display={formatNum(value, locale)}
                min={-2}
                max={4}
                step={0.5}
                onChange={(v) => setLogits((prev) => prev.map((pv, i) => (i === index ? v : pv)))}
              />
            ))}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                marginBottom: '12px',
                fontSize: '12px',
                color: 'var(--text-muted, #64748b)',
              }}
            >
              <span>{t.trueClassLabel}</span>
              {[0, 1, 2].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTrueClass(value)}
                  style={{
                    padding: '3px 12px',
                    background:
                      trueClass === value ? 'var(--accent-green, #4ade80)' : 'transparent',
                    border: '1px solid var(--accent-green, #4ade80)',
                    color:
                      trueClass === value
                        ? 'var(--bg-primary, #0f0f1a)'
                        : 'var(--accent-green, #4ade80)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                  }}
                >
                  {value + 1}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <LossReadout
                label={t.mseLabel}
                value={formatNum(meanSquaredError(probs, trueClass), locale)}
                color="var(--accent-orange, #fb923c)"
              />
              <LossReadout
                label={t.ceLabel}
                value={formatNum(crossEntropy(probs, trueClass), locale)}
                color="var(--accent-red, #f87171)"
              />
            </div>
          </>
        )}

        {confidentWrong && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: 'rgba(248, 113, 113, 0.12)',
              borderLeft: '3px solid var(--accent-red, #f87171)',
              borderRadius: '0 6px 6px 0',
              fontSize: '12px',
              color: 'var(--accent-red, #f87171)',
              fontWeight: 600,
            }}
          >
            {t.confidentWrong}
          </div>
        )}
      </div>
    </div>
  );
}
