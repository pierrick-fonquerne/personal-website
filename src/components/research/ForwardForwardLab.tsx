import { useCallback, useEffect, useRef, useState, type JSX } from 'react';

export type ForwardPassKind = 'positive' | 'negative';

export interface ForwardForwardLabels {
  helpText?: string;
  positiveLabel?: string;
  negativeLabel?: string;
  goodnessLabel?: string;
  thresholdLabel?: string;
  runPositiveLabel?: string;
  runNegativeLabel?: string;
  resetLabel?: string;
  layerLabel?: string;
}

export interface ForwardForwardLabProps {
  layers?: number;
  threshold?: number;
  labels?: ForwardForwardLabels;
}

interface LayerState {
  goodness: number;
  active: boolean;
}

type PassState = 'idle' | 'running';

const HIGH_BASE = 0.78;
const LOW_BASE = 0.22;
const LAYER_OFFSET = 0.04;
const STEP_MS = 320;

function buildIdleLayers(count: number): LayerState[] {
  return Array.from({ length: count }, () => ({ goodness: 0.5, active: false }));
}

function targetGoodness(kind: ForwardPassKind, index: number): number {
  if (kind === 'positive') {
    return HIGH_BASE + index * LAYER_OFFSET * (index % 2 === 0 ? 1 : -1);
  }
  return LOW_BASE + index * LAYER_OFFSET * (index % 2 === 0 ? -1 : 1);
}

export default function ForwardForwardLab({
  layers: layerCount = 4,
  threshold = 0.5,
  labels = {},
}: ForwardForwardLabProps): JSX.Element {
  const [layerStates, setLayerStates] = useState<LayerState[]>(() =>
    buildIdleLayers(layerCount),
  );
  const [passState, setPassState] = useState<PassState>('idle');
  const [lastKind, setLastKind] = useState<ForwardPassKind | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const runPass = useCallback(
    (kind: ForwardPassKind): void => {
      clearTimer();
      setLastKind(kind);
      setPassState('running');
      setLayerStates(buildIdleLayers(layerCount));

      let step = 0;

      const tick = (): void => {
        const current = step;
        step += 1;

        setLayerStates((prev) =>
          prev.map((layer, i) => {
            if (i < current) {
              return { goodness: targetGoodness(kind, i), active: false };
            }
            if (i === current) {
              return { goodness: targetGoodness(kind, i), active: true };
            }
            return layer;
          }),
        );

        if (step < layerCount) {
          timerRef.current = setTimeout(tick, STEP_MS);
        } else {
          timerRef.current = setTimeout(() => {
            setLayerStates((prev) => prev.map((l) => ({ ...l, active: false })));
            setPassState('idle');
          }, STEP_MS);
        }
      };

      timerRef.current = setTimeout(tick, 80);
    },
    [layerCount, clearTimer],
  );

  const reset = useCallback((): void => {
    clearTimer();
    setPassState('idle');
    setLastKind(null);
    setLayerStates(buildIdleLayers(layerCount));
  }, [layerCount, clearTimer]);

  const helpText =
    labels.helpText ??
    "Deux passes avant, jamais de passe arrière. Chaque couche ajuste localement sa qualité pour la rendre haute sur les données réelles et basse sur les données corrompues.";
  const positiveLabel = labels.positiveLabel ?? 'Données positives (réelles)';
  const negativeLabel = labels.negativeLabel ?? 'Données négatives (corrompues)';
  const goodnessLabel = labels.goodnessLabel ?? 'Qualité';
  const thresholdLabel = labels.thresholdLabel ?? 'Seuil';
  const runPositiveLabel = labels.runPositiveLabel ?? 'Passe positive';
  const runNegativeLabel = labels.runNegativeLabel ?? 'Passe négative';
  const resetLabel = labels.resetLabel ?? 'Réinitialiser';
  const layerLabel = labels.layerLabel ?? 'Couche';

  const noBackwardNote =
    "Aucune passe arrière : l'apprentissage est purement local.";

  const buttonClass =
    'rounded-sm border border-[var(--color-line)] px-3 py-1.5 font-mono text-[12px] tracking-[0.04em] text-[var(--color-fg)] transition-colors duration-200 hover:border-[var(--color-line-strong)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40';

  const isRunning = passState === 'running';

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <div className="flex flex-col gap-5">
        <p className="text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{helpText}</p>

        <div
          className="rounded-sm border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 font-mono text-[12px] text-[var(--color-accent)] tracking-[0.03em]"
          role="note"
          aria-label={noBackwardNote}
        >
          {noBackwardNote}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            onClick={() => runPass('positive')}
            disabled={isRunning}
            aria-label={runPositiveLabel}
          >
            {runPositiveLabel}
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => runPass('negative')}
            disabled={isRunning}
            aria-label={runNegativeLabel}
          >
            {runNegativeLabel}
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={reset}
            disabled={isRunning}
            aria-label={resetLabel}
          >
            {resetLabel}
          </button>
        </div>

        {lastKind !== null && (
          <p className="font-mono text-[11px] tracking-[0.06em] text-[var(--color-fg-dim)] uppercase">
            {lastKind === 'positive' ? positiveLabel : negativeLabel}
          </p>
        )}

        <div
          role="list"
          aria-label={`${layerLabel}s`}
          className="flex flex-col gap-3"
        >
          {layerStates.map((layer, index) => {
            const pct = Math.min(1, Math.max(0, layer.goodness));
            const thresholdPct = threshold * 100;
            const barPct = pct * 100;
            const aboveThreshold = pct >= threshold;
            const barColor = aboveThreshold
              ? 'var(--color-accent)'
              : 'var(--color-fg-muted)';

            return (
              <div
                key={index}
                role="listitem"
                aria-label={`${layerLabel} ${index + 1}, ${goodnessLabel}: ${(pct * 100).toFixed(0)}%`}
                className={`flex flex-col gap-1 rounded-sm border px-3 py-2 transition-colors duration-200 ${
                  layer.active
                    ? 'border-[var(--color-accent)]'
                    : 'border-[var(--color-line)]'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.06em] text-[var(--color-fg-dim)] uppercase">
                  <span>
                    {layerLabel} {index + 1}
                  </span>
                  <span className={aboveThreshold ? 'text-[var(--color-accent)]' : ''}>
                    {goodnessLabel} {(pct * 100).toFixed(0)}%
                  </span>
                </div>

                <div
                  role="meter"
                  aria-label={`${goodnessLabel} ${layerLabel} ${index + 1}`}
                  aria-valuenow={Math.round(pct * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="relative h-3 w-full overflow-hidden rounded-full bg-[var(--color-bg)]"
                  style={{ border: '1px solid var(--color-line)' }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: barColor,
                    }}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute top-0 h-full w-[2px]"
                    style={{
                      left: `${thresholdPct}%`,
                      backgroundColor: 'var(--color-line-strong)',
                    }}
                  />
                </div>

                <div className="flex justify-end font-mono text-[10px] text-[var(--color-fg-dim)]">
                  <span>{thresholdLabel} {(threshold * 100).toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </figure>
  );
}
