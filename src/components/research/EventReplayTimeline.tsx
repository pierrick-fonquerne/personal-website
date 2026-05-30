import { useCallback, useEffect, useRef, useState, type JSX } from 'react';

export type LivedEventKind = 'sensory' | 'pain' | 'emotion' | 'consolidation';

export interface LivedEvent {
  id: string;
  t: number;
  kind: LivedEventKind;
  label: string;
}

export interface EventReplayLabels {
  helpText?: string;
  playLabel?: string;
  replayLabel?: string;
  timeLabel?: string;
  episodicLabel?: string;
  traitLabel?: string;
  traitName?: string;
  emptyEpisodic?: string;
}

export interface EventReplayTimelineProps {
  events?: LivedEvent[];
  labels?: EventReplayLabels;
}

const DEFAULT_EVENTS: LivedEvent[] = [
  { id: 'e0', t: 0, kind: 'sensory', label: 'Je vois une flamme orange' },
  { id: 'e1', t: 1, kind: 'sensory', label: 'Je tends la main vers le feu' },
  { id: 'e2', t: 2, kind: 'pain', label: 'Douleur vive à la main' },
  { id: 'e3', t: 3, kind: 'emotion', label: 'Peur associée au feu' },
  { id: 'e4', t: 4, kind: 'sensory', label: 'Je revois une flamme' },
  { id: 'e5', t: 5, kind: 'emotion', label: 'Recul instinctif' },
  { id: 'e6', t: 6, kind: 'consolidation', label: 'Le feu brûle : souvenir consolidé' },
];

const KIND_COLOR: Record<LivedEventKind, string> = {
  sensory: 'var(--color-fg-muted)',
  pain: 'var(--color-accent)',
  emotion: 'var(--color-accent)',
  consolidation: 'var(--color-fg)',
};

const KIND_BADGE: Record<LivedEventKind, string> = {
  sensory: 'sensoriel',
  pain: 'douleur',
  emotion: 'émotion',
  consolidation: 'consolidation',
};

const buttonClass =
  'rounded-sm border border-[var(--color-line)] px-3 py-1.5 font-mono text-[12px] tracking-[0.04em] text-[var(--color-fg)] transition-colors duration-200 hover:border-[var(--color-line-strong)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function EventReplayTimeline({
  events = DEFAULT_EVENTS,
  labels = {},
}: EventReplayTimelineProps): JSX.Element {
  const sorted = [...events].sort((a, b) => a.t - b.t);
  const maxCursor = sorted.length;

  const [cursor, setCursor] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);

  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const DURATION_MS = 2500;

  const helpText =
    labels.helpText ??
    'Fais glisser le temps. Chaque expérience est un événement immuable qui nourrit la mémoire et fait émerger un trait.';
  const playLabel = labels.playLabel ?? 'Rejouer';
  const replayLabel = labels.replayLabel ?? 'Rejouer';
  const timeLabel = labels.timeLabel ?? 'Temps';
  const episodicLabel = labels.episodicLabel ?? 'Mémoire épisodique';
  const traitLabel = labels.traitLabel ?? 'Trait émergent';
  const traitName = labels.traitName ?? 'Peur du feu';
  const emptyEpisodic = labels.emptyEpisodic ?? 'Aucun événement vécu pour l\'instant.';

  const stopAnimation = useCallback((): void => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  const animate = useCallback(
    (timestamp: number): void => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = clamp(elapsed / DURATION_MS, 0, 1);
      const next = Math.round(progress * maxCursor);
      setCursor(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setPlaying(false);
        rafRef.current = null;
        startTimeRef.current = null;
      }
    },
    [maxCursor],
  );

  const handlePlay = useCallback((): void => {
    stopAnimation();
    setCursor(0);
    setPlaying(true);
    startTimeRef.current = null;
    rafRef.current = requestAnimationFrame(animate);
  }, [animate, stopAnimation]);

  useEffect(() => {
    return (): void => {
      stopAnimation();
    };
  }, [stopAnimation]);

  const visibleEvents = sorted.slice(0, cursor);

  const totalWeighted = sorted.filter(
    (ev) => ev.kind === 'pain' || ev.kind === 'emotion' || ev.kind === 'consolidation',
  ).length;

  const seenWeighted = visibleEvents.filter(
    (ev) => ev.kind === 'pain' || ev.kind === 'emotion' || ev.kind === 'consolidation',
  ).length;

  const traitStrength = totalWeighted === 0 ? 0 : clamp(seenWeighted / totalWeighted, 0, 1);
  const traitPercent = Math.round(traitStrength * 100);

  const isAtEnd = cursor === maxCursor;
  const actionLabel = isAtEnd ? replayLabel : playLabel;

  return (
    <figure className="my-6 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-5">
      <p className="mb-4 text-[14px] leading-[1.55] text-[var(--color-fg-muted)]">{helpText}</p>

      <div className="mb-5 flex flex-col gap-2">
        <label
          htmlFor="timeline-cursor"
          className="font-mono text-[11px] tracking-[0.06em] uppercase text-[var(--color-fg-dim)]"
        >
          {timeLabel} - {cursor} / {maxCursor}
        </label>
        <div className="flex items-center gap-3">
          <input
            id="timeline-cursor"
            type="range"
            min={0}
            max={maxCursor}
            value={cursor}
            onChange={(e): void => {
              stopAnimation();
              setPlaying(false);
              setCursor(Number(e.target.value));
            }}
            aria-label={timeLabel}
            className="h-1.5 w-full flex-1 cursor-pointer accent-[var(--color-accent)]"
          />
          <button
            type="button"
            className={buttonClass}
            onClick={handlePlay}
            disabled={playing}
            aria-label={actionLabel}
          >
            {actionLabel}
          </button>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 font-mono text-[11px] tracking-[0.06em] uppercase text-[var(--color-fg-dim)]">
            {episodicLabel}
          </p>
          <ul className="flex flex-col gap-1.5">
            {visibleEvents.length === 0 && (
              <li className="text-[13px] italic text-[var(--color-fg-dim)]">{emptyEpisodic}</li>
            )}
            {visibleEvents.map((ev) => (
              <li
                key={ev.id}
                className="flex items-start gap-2 rounded-sm border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-1.5"
              >
                <span
                  className="mt-0.5 shrink-0 font-mono text-[10px] tracking-[0.05em] uppercase"
                  style={{ color: KIND_COLOR[ev.kind] }}
                >
                  {KIND_BADGE[ev.kind]}
                </span>
                <span className="text-[13px] leading-[1.5]" style={{ color: KIND_COLOR[ev.kind] }}>
                  {ev.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 font-mono text-[11px] tracking-[0.06em] uppercase text-[var(--color-fg-dim)]">
            {traitLabel}
          </p>
          <div
            className="rounded-sm border border-[var(--color-line)] bg-[var(--color-bg)] p-4"
            role="img"
            aria-label={`${traitName} - ${traitPercent}%`}
          >
            <p className="mb-3 text-[13px] text-[var(--color-fg)]">{traitName}</p>
            <div
              className="h-3 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--color-line)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${traitPercent}%`,
                  background: 'var(--color-accent)',
                }}
              />
            </div>
            <p className="mt-2 font-mono text-[12px] text-[var(--color-fg-dim)]">
              {traitPercent}%
            </p>
          </div>
        </div>
      </div>
    </figure>
  );
}
