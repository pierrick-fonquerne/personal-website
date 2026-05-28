import { useMemo, useState, type JSX } from 'react';

type ActivationKind = 'sigmoid' | 'relu' | 'tanh';

interface Props {
  defaultLayers?: number;
  maxLayers?: number;
  defaultActivation?: ActivationKind;
  labels?: {
    layersLabel?: string;
    helpText?: string;
    layerPrefix?: string;
  };
}

const DERIV_FACTOR: Record<ActivationKind, number> = {
  sigmoid: 0.25,
  tanh: 0.4,
  relu: 1,
};

const ACTIVATION_LABEL: Record<ActivationKind, string> = {
  sigmoid: 'Sigmoïde',
  relu: 'ReLU',
  tanh: 'Tanh',
};

const ACTIVATION_COLOR: Record<ActivationKind, string> = {
  sigmoid: '#60a5fa',
  relu: '#34d399',
  tanh: '#f472b6',
};

function formatGradient(g: number): string {
  if (g >= 0.01) return g.toFixed(3);
  if (g >= 1e-6) return g.toExponential(2);
  return g.toExponential(1);
}

export default function VanishingGradientSimulator({
  defaultLayers = 8,
  maxLayers = 20,
  defaultActivation = 'sigmoid',
  labels = {},
}: Props): JSX.Element {
  const [layers, setLayers] = useState<number>(defaultLayers);
  const [activation, setActivation] = useState<ActivationKind>(defaultActivation);

  const factor = DERIV_FACTOR[activation];

  const gradients = useMemo(() => {
    const arr: number[] = [];
    let current = 1;
    arr.push(current);
    for (let i = 1; i < layers; i += 1) {
      current = current * factor;
      arr.push(current);
    }
    return arr;
  }, [layers, factor]);

  const firstLayer = gradients[gradients.length - 1] ?? 1;

  const layersLabel = labels.layersLabel ?? 'Nombre de couches';
  const layerPrefix = labels.layerPrefix ?? 'Couche';
  const helpText =
    labels.helpText ??
    "La couche de sortie reçoit un gradient de 1, qu'on prend comme référence. À chaque couche traversée vers l'entrée, le gradient est multiplié par la dérivée maximale de la fonction choisie. Sigmoïde 0,25, tanh environ 0,4, ReLU 1.";

  const maxBarPx = 240;

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['sigmoid', 'tanh', 'relu'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setActivation(kind)}
            className={[
              'rounded-md border px-3 py-1 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors',
              kind === activation
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-[var(--color-line)] text-[var(--color-fg-muted)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-fg)]',
            ].join(' ')}
          >
            <span aria-hidden="true" className="mr-1.5 inline-block h-[8px] w-[8px] rounded-full align-middle" style={{ backgroundColor: ACTIVATION_COLOR[kind] }} />
            {ACTIVATION_LABEL[kind]}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
          {layersLabel} : <span className="text-[var(--color-accent)]">{layers}</span>
        </span>
        <input
          type="range"
          min={1}
          max={maxLayers}
          step={1}
          value={layers}
          onChange={(e) => setLayers(Number(e.target.value))}
          className="learning-slider"
        />
      </label>

      <div className="mt-5 space-y-1">
        {gradients.map((g, idx) => {
          const layerNumber = gradients.length - idx;
          const pct = Math.max(0.5, Math.min(100, g * 100));
          const widthPx = Math.max(2, (pct / 100) * maxBarPx);
          return (
            <div key={layerNumber} className="flex items-center gap-3 font-mono text-[12px]">
              <span className="w-20 shrink-0 text-right tracking-[0.08em] text-[var(--color-fg-dim)] uppercase">
                {layerPrefix} {String(layerNumber).padStart(2, '0')}
              </span>
              <div className="flex h-[14px] flex-1 items-center">
                <div
                  className="h-full rounded-sm"
                  style={{
                    width: `${widthPx}px`,
                    backgroundColor: ACTIVATION_COLOR[activation],
                    opacity: 0.85,
                  }}
                />
              </div>
              <span className="w-24 shrink-0 text-right tabular-nums text-[var(--color-fg)]">
                {formatGradient(g)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-md border border-[var(--color-line)] bg-[var(--color-bg)] p-3 font-mono text-[12px] leading-relaxed">
        <div className="text-[var(--color-fg-muted)]">
          Gradient effectif à la première couche :{' '}
          <span
            className={
              firstLayer < 1e-3
                ? 'font-semibold text-red-400'
                : firstLayer < 0.1
                  ? 'font-semibold text-amber-400'
                  : 'font-semibold text-[var(--color-accent)]'
            }
          >
            {formatGradient(firstLayer)}
          </span>
        </div>
      </div>

      <p className="mt-3 text-[12px] text-[var(--color-fg-dim)] italic">{helpText}</p>
    </figure>
  );
}
