import { useMemo, useState, type JSX } from 'react';

type ActivationKind = 'identity' | 'sigmoid' | 'relu' | 'tanh';

interface NeuronInput {
  label: string;
  defaultValue: number;
  min?: number;
  max?: number;
}

interface NeuronWeight {
  label: string;
  defaultValue: number;
  min?: number;
  max?: number;
}

interface BiasConfig {
  defaultValue: number;
  min?: number;
  max?: number;
}

interface Props {
  inputs: NeuronInput[];
  weights: NeuronWeight[];
  bias?: BiasConfig;
  activation?: ActivationKind;
  showCalculation?: boolean;
}

const ACTIVATION_FN: Record<ActivationKind, (x: number) => number> = {
  identity: (x) => x,
  sigmoid: (x) => 1 / (1 + Math.exp(-x)),
  relu: (x) => Math.max(0, x),
  tanh: (x) => Math.tanh(x),
};

const ACTIVATION_LABEL: Record<ActivationKind, string> = {
  identity: 'id',
  sigmoid: 'σ',
  relu: 'ReLU',
  tanh: 'tanh',
};

function clampRange(min: number | undefined, max: number | undefined): [number, number] {
  return [min ?? -2, max ?? 2];
}

function formatNumber(n: number): string {
  return n.toFixed(2);
}

export default function NeuronDiagram({
  inputs,
  weights,
  bias,
  activation = 'sigmoid',
  showCalculation = true,
}: Props): JSX.Element {
  const [inputValues, setInputValues] = useState<number[]>(() =>
    inputs.map((i) => i.defaultValue),
  );
  const [weightValues, setWeightValues] = useState<number[]>(() =>
    weights.map((w) => w.defaultValue),
  );
  const [biasValue, setBiasValue] = useState<number>(bias?.defaultValue ?? 0);

  const z = useMemo(
    () =>
      inputValues.reduce((acc, x, i) => acc + x * (weightValues[i] ?? 0), 0) + biasValue,
    [inputValues, weightValues, biasValue],
  );
  const y = useMemo(() => ACTIVATION_FN[activation](z), [activation, z]);

  const setInputAt = (idx: number, value: number): void => {
    setInputValues((prev) => prev.map((v, i) => (i === idx ? value : v)));
  };
  const setWeightAt = (idx: number, value: number): void => {
    setWeightValues((prev) => prev.map((v, i) => (i === idx ? value : v)));
  };

  const n = inputs.length;
  const svgHeight = 60 + n * 32;
  const sumX = 260;
  const actX = 360;
  const outX = 440;
  const centerY = svgHeight / 2;

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <svg
        viewBox={`0 0 480 ${svgHeight}`}
        className="mx-auto block w-full max-w-[480px]"
        role="img"
        aria-label="Diagramme du neurone"
      >
        {inputs.map((input, i) => {
          const inputY = 30 + i * 32;
          const w = weightValues[i] ?? 0;
          const strokeWidth = 1 + Math.min(3, Math.abs(w) * 1.2);
          return (
            <g key={input.label}>
              <text
                x="20"
                y={inputY + 4}
                fill="var(--color-fg)"
                fontSize="13"
                fontFamily="var(--font-mono)"
              >
                {input.label} = {formatNumber(inputValues[i] ?? 0)}
              </text>
              <line
                x1="100"
                y1={inputY}
                x2={sumX - 20}
                y2={centerY}
                stroke="var(--color-accent)"
                strokeOpacity={Math.min(1, Math.abs(w) / 1.5 + 0.2)}
                strokeWidth={strokeWidth}
              />
              <text
                x={(100 + sumX - 20) / 2}
                y={(inputY + centerY) / 2 - 4}
                fill="var(--color-fg-dim)"
                fontSize="11"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                {weights[i]?.label} = {formatNumber(w)}
              </text>
            </g>
          );
        })}

        {bias && (
          <g>
            <text
              x="20"
              y={svgHeight - 12}
              fill="var(--color-fg-dim)"
              fontSize="12"
              fontFamily="var(--font-mono)"
            >
              b = {formatNumber(biasValue)}
            </text>
            <line
              x1="100"
              y1={svgHeight - 16}
              x2={sumX - 20}
              y2={centerY + 14}
              stroke="var(--color-fg-dim)"
              strokeDasharray="3 3"
              strokeWidth="1.5"
            />
          </g>
        )}

        <circle cx={sumX} cy={centerY} r="22" fill="var(--color-bg)" stroke="var(--color-fg)" strokeWidth="1.5" />
        <text x={sumX} y={centerY + 6} fill="var(--color-fg)" fontSize="18" fontFamily="var(--font-mono)" textAnchor="middle">
          Σ
        </text>

        <line x1={sumX + 22} y1={centerY} x2={actX - 22} y2={centerY} stroke="var(--color-fg)" strokeWidth="1.5" />
        <text x={(sumX + actX) / 2} y={centerY - 8} fill="var(--color-fg-dim)" fontSize="11" fontFamily="var(--font-mono)" textAnchor="middle">
          z = {formatNumber(z)}
        </text>

        <circle cx={actX} cy={centerY} r="22" fill="var(--color-bg)" stroke="var(--color-accent)" strokeWidth="1.5" />
        <text x={actX} y={centerY + 5} fill="var(--color-accent)" fontSize="13" fontFamily="var(--font-mono)" textAnchor="middle">
          {ACTIVATION_LABEL[activation]}
        </text>

        <line x1={actX + 22} y1={centerY} x2={outX} y2={centerY} stroke="var(--color-fg)" strokeWidth="1.5" />
        <text x={outX + 4} y={centerY + 5} fill="var(--color-fg)" fontSize="14" fontFamily="var(--font-mono)">
          y = {formatNumber(y)}
        </text>
      </svg>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {inputs.map((input, i) => {
          const [min, max] = clampRange(input.min, input.max);
          return (
            <label key={`x-${input.label}`} className="block">
              <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
                {input.label} = <span className="text-[var(--color-accent)]">{formatNumber(inputValues[i] ?? 0)}</span>
              </span>
              <input
                type="range"
                min={min}
                max={max}
                step={0.05}
                value={inputValues[i]}
                onChange={(e) => setInputAt(i, Number(e.target.value))}
                className="learning-slider"
              />
            </label>
          );
        })}

        {weights.map((weight, i) => {
          const [min, max] = clampRange(weight.min, weight.max);
          return (
            <label key={`w-${weight.label}`} className="block">
              <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
                {weight.label} = <span className="text-[var(--color-accent)]">{formatNumber(weightValues[i] ?? 0)}</span>
              </span>
              <input
                type="range"
                min={min}
                max={max}
                step={0.05}
                value={weightValues[i]}
                onChange={(e) => setWeightAt(i, Number(e.target.value))}
                className="learning-slider"
              />
            </label>
          );
        })}

        {bias && (
          <label className="block sm:col-span-2">
            <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
              biais = <span className="text-[var(--color-accent)]">{formatNumber(biasValue)}</span>
            </span>
            <input
              type="range"
              min={bias.min ?? -2}
              max={bias.max ?? 2}
              step={0.05}
              value={biasValue}
              onChange={(e) => setBiasValue(Number(e.target.value))}
              className="learning-slider"
            />
          </label>
        )}
      </div>

      {showCalculation && (
        <div className="mt-4 rounded-md border border-[var(--color-line)] bg-[var(--color-bg)] p-3 font-mono text-[12px] leading-relaxed text-[var(--color-fg-muted)]">
          <div>
            z ={' '}
            {inputs.map((input, i) => (
              <span key={`calc-${input.label}`}>
                {i > 0 ? ' + ' : ''}
                {formatNumber(inputValues[i] ?? 0)}·{formatNumber(weightValues[i] ?? 0)}
              </span>
            ))}
            {bias && ` + ${formatNumber(biasValue)}`}{' '}
            <span className="text-[var(--color-fg)]">= {formatNumber(z)}</span>
          </div>
          <div>
            y = {ACTIVATION_LABEL[activation]}(z) ={' '}
            <span className="text-[var(--color-accent)]">{formatNumber(y)}</span>
          </div>
        </div>
      )}
    </figure>
  );
}
