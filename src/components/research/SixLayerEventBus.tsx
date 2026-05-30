import { useEffect, useRef, useState, type JSX } from 'react';

export type AeifLayer =
  | 'events'
  | 'neural'
  | 'perception'
  | 'memory'
  | 'cognition'
  | 'identity';

export type EmittableEvent = 'touch' | 'sound' | 'vision';

export interface SixLayerLabels {
  helpText?: string;
  emitTouch?: string;
  emitSound?: string;
  emitVision?: string;
  resetLabel?: string;
  layerNames?: Partial<Record<AeifLayer, string>>;
  transforms?: Partial<Record<AeifLayer, string>>;
}

export interface SixLayerEventBusProps {
  labels?: SixLayerLabels;
}

const LAYER_ORDER: AeifLayer[] = [
  'events',
  'neural',
  'perception',
  'memory',
  'cognition',
  'identity',
];

const EVENT_ICONS: Record<EmittableEvent, string> = {
  touch: '●',
  sound: '◆',
  vision: '▲',
};

const STEP_MS = 450;

interface PropagationState {
  event: EmittableEvent;
  reachedIndex: number;
}

export default function SixLayerEventBus({ labels = {} }: SixLayerEventBusProps): JSX.Element {
  const [propagation, setPropagation] = useState<PropagationState | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const helpText =
    labels.helpText ??
    'Émets un événement sensoriel et regarde-le remonter les couches, transformé à chaque étage.';

  const emitTouchLabel = labels.emitTouch ?? 'Toucher';
  const emitSoundLabel = labels.emitSound ?? 'Entendre';
  const emitVisionLabel = labels.emitVision ?? 'Voir';
  const resetLabel = labels.resetLabel ?? 'Réinitialiser';

  const defaultLayerNames: Record<AeifLayer, string> = {
    events: 'aei-events',
    neural: 'aei-neural',
    perception: 'aei-perception',
    memory: 'aei-memory',
    cognition: 'aei-cognition',
    identity: 'aei-identity',
  };

  const defaultTransforms: Record<AeifLayer, string> = {
    events: 'Événement brut horodaté',
    neural: 'Signal propagé',
    perception: 'Percept structuré',
    memory: 'Souvenir encodé',
    cognition: 'Décision formée',
    identity: 'Trait renforcé',
  };

  const layerNames: Record<AeifLayer, string> = {
    events: labels.layerNames?.events ?? defaultLayerNames.events,
    neural: labels.layerNames?.neural ?? defaultLayerNames.neural,
    perception: labels.layerNames?.perception ?? defaultLayerNames.perception,
    memory: labels.layerNames?.memory ?? defaultLayerNames.memory,
    cognition: labels.layerNames?.cognition ?? defaultLayerNames.cognition,
    identity: labels.layerNames?.identity ?? defaultLayerNames.identity,
  };

  const transforms: Record<AeifLayer, string> = {
    events: labels.transforms?.events ?? defaultTransforms.events,
    neural: labels.transforms?.neural ?? defaultTransforms.neural,
    perception: labels.transforms?.perception ?? defaultTransforms.perception,
    memory: labels.transforms?.memory ?? defaultTransforms.memory,
    cognition: labels.transforms?.cognition ?? defaultTransforms.cognition,
    identity: labels.transforms?.identity ?? defaultTransforms.identity,
  };

  const clearTimer = (): void => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  const emit = (kind: EmittableEvent): void => {
    clearTimer();
    setPropagation({ event: kind, reachedIndex: 0 });

    intervalRef.current = setInterval(() => {
      setPropagation((current) => {
        if (current === null) {
          clearTimer();
          return null;
        }
        const next = current.reachedIndex + 1;
        if (next >= LAYER_ORDER.length) {
          clearTimer();
          return { ...current, reachedIndex: LAYER_ORDER.length - 1 };
        }
        return { ...current, reachedIndex: next };
      });
    }, STEP_MS);
  };

  const reset = (): void => {
    clearTimer();
    setPropagation(null);
  };

  const buttonClass =
    'rounded-sm border border-[var(--color-line)] px-3 py-1.5 font-mono text-[12px] tracking-[0.04em] text-[var(--color-fg)] transition-colors duration-200 hover:border-[var(--color-line-strong)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40';

  const reachedLayer =
    propagation !== null ? LAYER_ORDER[propagation.reachedIndex] : null;

  const liveText =
    reachedLayer !== null
      ? `${layerNames[reachedLayer as AeifLayer]} : ${transforms[reachedLayer as AeifLayer]}`
      : '';

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <div className="flex flex-col gap-5">
        <p className="text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{helpText}</p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            onClick={() => emit('touch')}
            aria-label={emitTouchLabel}
          >
            {EVENT_ICONS.touch} {emitTouchLabel}
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => emit('sound')}
            aria-label={emitSoundLabel}
          >
            {EVENT_ICONS.sound} {emitSoundLabel}
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => emit('vision')}
            aria-label={emitVisionLabel}
          >
            {EVENT_ICONS.vision} {emitVisionLabel}
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={reset}
            aria-label={resetLabel}
          >
            {resetLabel}
          </button>
        </div>

        {propagation !== null && (
          <div className="flex items-center gap-2 font-mono text-[12px] text-[var(--color-fg-muted)]">
            <span
              className="inline-block h-2 w-2 rounded-full bg-[var(--color-accent)]"
              aria-hidden="true"
            />
            <span>
              {propagation.event === 'touch'
                ? emitTouchLabel
                : propagation.event === 'sound'
                  ? emitSoundLabel
                  : emitVisionLabel}
            </span>
          </div>
        )}

        <div
          className="flex flex-col-reverse gap-1"
          role="list"
          aria-label="Couches AEIF"
        >
          {LAYER_ORDER.map((layer, index) => {
            const isReached =
              propagation !== null && index <= propagation.reachedIndex;
            const isActive =
              propagation !== null && index === propagation.reachedIndex;

            return (
              <div
                key={layer}
                role="listitem"
                className="flex items-center justify-between rounded px-4 py-2.5 transition-all duration-300"
                style={{
                  border: isActive
                    ? '1.5px solid var(--color-accent)'
                    : '1.5px solid var(--color-line)',
                  boxShadow: isActive
                    ? '0 0 8px 1px var(--color-accent)'
                    : 'none',
                  opacity: isReached ? 1 : 0.45,
                }}
              >
                <span
                  className="font-mono text-[12px] tracking-[0.06em] uppercase"
                  style={{
                    color: isActive
                      ? 'var(--color-accent)'
                      : isReached
                        ? 'var(--color-fg)'
                        : 'var(--color-fg-dim)',
                  }}
                >
                  {layerNames[layer]}
                </span>

                {isReached && (
                  <span
                    className="text-[11px] text-[var(--color-fg-muted)]"
                    style={{
                      fontStyle: 'italic',
                    }}
                  >
                    {transforms[layer]}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {liveText}
        </div>
      </div>
    </figure>
  );
}
