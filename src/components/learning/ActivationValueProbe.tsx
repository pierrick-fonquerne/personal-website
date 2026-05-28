import { useMemo, useState, type JSX } from 'react';

type ActivationKind = 'identity' | 'sigmoid' | 'relu' | 'tanh';

interface Props {
  initialX?: number;
  range?: [number, number];
  labels?: {
    title?: string;
    valueColumnLabel?: string;
    derivativeColumnLabel?: string;
    helpText?: string;
  };
}

const ACTIVATION_FN: Record<ActivationKind, (x: number) => number> = {
  identity: (x) => x,
  sigmoid: (x) => 1 / (1 + Math.exp(-x)),
  relu: (x) => Math.max(0, x),
  tanh: (x) => Math.tanh(x),
};

const ACTIVATION_DERIVATIVE: Record<ActivationKind, (x: number) => number> = {
  identity: () => 1,
  sigmoid: (x) => {
    const s = 1 / (1 + Math.exp(-x));
    return s * (1 - s);
  },
  relu: (x) => (x > 0 ? 1 : 0),
  tanh: (x) => 1 - Math.tanh(x) ** 2,
};

const ACTIVATION_LABEL: Record<ActivationKind, string> = {
  identity: 'Identity',
  sigmoid: 'Sigmoid',
  relu: 'ReLU',
  tanh: 'Tanh',
};

const ACTIVATION_COLOR: Record<ActivationKind, string> = {
  identity: '#9ca3af',
  sigmoid: '#60a5fa',
  relu: '#34d399',
  tanh: '#f472b6',
};

const ORDER: ActivationKind[] = ['identity', 'sigmoid', 'relu', 'tanh'];

function formatNumber(n: number): string {
  if (Math.abs(n) < 0.001 && n !== 0) return n.toExponential(2);
  return n.toFixed(3);
}

export default function ActivationValueProbe({
  initialX = 0,
  range = [-5, 5],
  labels = {},
}: Props): JSX.Element {
  const [x, setX] = useState<number>(initialX);

  const rows = useMemo(
    () =>
      ORDER.map((kind) => ({
        kind,
        label: ACTIVATION_LABEL[kind],
        color: ACTIVATION_COLOR[kind],
        value: ACTIVATION_FN[kind](x),
        derivative: ACTIVATION_DERIVATIVE[kind](x),
      })),
    [x],
  );

  const valueLabel = labels.valueColumnLabel ?? 'f(x)';
  const derivLabel = labels.derivativeColumnLabel ?? "f'(x)";
  const helpText =
    labels.helpText ??
    "Bouge le curseur pour voir comment chaque fonction et sa dérivée réagissent à la même valeur d'entrée.";

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <label className="block">
        <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
          x = <span className="text-[var(--color-accent)]">{x.toFixed(2)}</span>
        </span>
        <input
          type="range"
          min={range[0]}
          max={range[1]}
          step={0.05}
          value={x}
          onChange={(e) => setX(Number(e.target.value))}
          className="learning-slider"
        />
      </label>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full font-mono text-[13px]">
          <thead>
            <tr className="border-b border-[var(--color-line-strong)]">
              <th className="py-2 text-left tracking-[0.12em] text-[var(--color-fg-muted)] text-[11px] uppercase">
                Fonction
              </th>
              <th className="py-2 text-right tracking-[0.12em] text-[var(--color-fg-muted)] text-[11px] uppercase">
                {valueLabel}
              </th>
              <th className="py-2 text-right tracking-[0.12em] text-[var(--color-fg-muted)] text-[11px] uppercase">
                {derivLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.kind} className="border-b border-[var(--color-line)] last:border-b-0">
                <td className="py-2.5">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block h-[3px] w-5 rounded-sm"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="text-[var(--color-fg)]">{row.label}</span>
                  </span>
                </td>
                <td className="py-2.5 text-right tabular-nums text-[var(--color-fg)]">
                  {formatNumber(row.value)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-[var(--color-fg)]">
                  {formatNumber(row.derivative)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[12px] text-[var(--color-fg-dim)] italic">{helpText}</p>
    </figure>
  );
}
