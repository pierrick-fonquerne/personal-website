import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { extractReadableText } from '../../lib/audio-text-extractor';

interface ManifestEntry {
  url: string;
  duration?: number;
  chars?: number;
}

interface AudioManifest {
  [key: string]: ManifestEntry;
}

export interface ChapterAudioLabels {
  listen: string;
  pause: string;
  resume: string;
  stop: string;
  close: string;
  speed: string;
  loading: string;
  error: string;
  webSpeechBadge: string;
  mp3Badge: string;
}

interface Props {
  locale: 'fr' | 'en';
  courseSlug: string;
  moduleSlug: string;
  contentSelector: string;
  labels: ChapterAudioLabels;
}

type Source = 'mp3' | 'speech' | 'unknown';
type Status = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

function manifestKey(locale: string, course: string, mod: string): string {
  return `${locale}/${course}/${mod}`;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ChapterAudioPlayer({
  locale,
  courseSlug,
  moduleSlug,
  contentSelector,
  labels,
}: Props): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);
  const [status, setStatus] = useState<Status>('idle');
  const [source, setSource] = useState<Source>('unknown');
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [rate, setRate] = useState<number>(1);
  const [mp3Url, setMp3Url] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechStartRef = useRef<number>(0);
  const speechCharsRef = useRef<number>(0);

  const key = useMemo(
    () => manifestKey(locale, courseSlug, moduleSlug),
    [locale, courseSlug, moduleSlug],
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/audio/manifest.json', { cache: 'no-cache' })
      .then((res) => (res.ok ? (res.json() as Promise<AudioManifest>) : null))
      .then((manifest) => {
        if (cancelled || !manifest) return;
        const entry = manifest[key];
        if (entry?.url) {
          setMp3Url(entry.url);
          setSource('mp3');
          if (typeof entry.duration === 'number') setDuration(entry.duration);
        } else {
          setSource('speech');
        }
      })
      .catch(() => {
        if (!cancelled) setSource('speech');
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const stopAll = useCallback((): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setStatus('idle');
    setProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  const playMp3 = useCallback((): void => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = rate;
    void el.play();
    setStatus('playing');
  }, [rate]);

  const playSpeech = useCallback((): void => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setStatus('error');
      return;
    }
    const text = extractReadableText(contentSelector);
    if (!text) {
      setStatus('error');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale === 'fr' ? 'fr-FR' : 'en-US';
    utterance.rate = rate;
    speechCharsRef.current = text.length;
    speechStartRef.current = Date.now();
    setDuration(text.length / (15 * rate));
    setProgress(0);

    utterance.onboundary = (ev) => {
      if (typeof ev.charIndex === 'number' && speechCharsRef.current > 0) {
        setProgress((ev.charIndex / speechCharsRef.current) * (text.length / (15 * rate)));
      }
    };
    utterance.onend = () => {
      setStatus('idle');
      setProgress(0);
    };
    utterance.onerror = () => {
      setStatus('error');
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setStatus('playing');
  }, [contentSelector, locale, rate]);

  const handlePlay = useCallback((): void => {
    setOpen(true);
    if (status === 'paused') {
      if (source === 'mp3' && audioRef.current) {
        audioRef.current.playbackRate = rate;
        void audioRef.current.play();
      } else if (source === 'speech' && typeof window !== 'undefined') {
        window.speechSynthesis.resume();
      }
      setStatus('playing');
      return;
    }
    if (source === 'mp3') {
      playMp3();
    } else {
      playSpeech();
    }
  }, [playMp3, playSpeech, rate, source, status]);

  const handlePause = useCallback((): void => {
    if (source === 'mp3' && audioRef.current) {
      audioRef.current.pause();
    } else if (source === 'speech' && typeof window !== 'undefined') {
      window.speechSynthesis.pause();
    }
    setStatus('paused');
  }, [source]);

  const handleClose = useCallback((): void => {
    stopAll();
    setOpen(false);
  }, [stopAll]);

  const handleRateChange = useCallback(
    (newRate: number): void => {
      setRate(newRate);
      if (source === 'mp3' && audioRef.current) {
        audioRef.current.playbackRate = newRate;
      } else if (source === 'speech' && status === 'playing') {
        playSpeech();
      }
    },
    [playSpeech, source, status],
  );

  const onAudioTimeUpdate = (): void => {
    const el = audioRef.current;
    if (!el) return;
    setProgress(el.currentTime);
    if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
  };

  const onAudioEnded = (): void => {
    setStatus('idle');
    setProgress(0);
  };

  const isPlaying = status === 'playing';
  const isLoadingSource = source === 'unknown';

  return (
    <>
      <button
        type="button"
        onClick={isPlaying ? handlePause : handlePlay}
        aria-label={isPlaying ? labels.pause : labels.listen}
        title={isPlaying ? labels.pause : labels.listen}
        disabled={isLoadingSource}
        className="chapter-audio-player inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] px-3 py-1.5 font-mono text-[11px] tracking-[0.14em] text-[var(--color-fg-muted)] uppercase transition-colors duration-150 hover:border-[var(--color-line-strong)] hover:text-[var(--color-fg)] disabled:cursor-not-allowed disabled:opacity-50"
        data-print="hide"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
        </svg>
        <span>{isPlaying ? labels.pause : labels.listen}</span>
      </button>

      {open && (
        <div
          className="chapter-audio-player fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-line)] bg-[var(--color-bg)] px-6 py-3 shadow-[0_-6px_24px_rgba(0,0,0,0.25)]"
          role="region"
          aria-label={labels.listen}
          data-print="hide"
        >
          <div className="mx-auto flex max-w-[1280px] items-center gap-4">
            <button
              type="button"
              onClick={isPlaying ? handlePause : handlePlay}
              aria-label={isPlaying ? labels.pause : labels.resume}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-fg)] hover:border-[var(--color-line-strong)]"
            >
              {isPlaying ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" />
                  <rect x="14" y="5" width="4" height="14" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <div className="min-w-0 flex-1">
              <div
                className="h-1 w-full overflow-hidden rounded-full bg-[var(--color-line)]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={duration || 1}
                aria-valuenow={progress}
              >
                <div
                  className="h-full bg-[var(--color-fg)]"
                  style={{
                    width:
                      duration > 0
                        ? `${Math.min(100, (progress / duration) * 100)}%`
                        : '0%',
                  }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between font-mono text-[10px] tracking-[0.08em] text-[var(--color-fg-muted)] uppercase">
                <span>{formatTime(progress)}</span>
                <span className="rounded border border-[var(--color-line)] px-1.5 py-0.5">
                  {source === 'mp3' ? labels.mp3Badge : labels.webSpeechBadge}
                </span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <span className="font-mono text-[10px] tracking-[0.08em] text-[var(--color-fg-muted)] uppercase">
                {labels.speed}
              </span>
              {SPEED_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleRateChange(option)}
                  className={`cursor-pointer rounded border px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] uppercase transition-colors duration-150 ${
                    rate === option
                      ? 'border-[var(--color-fg)] text-[var(--color-fg)]'
                      : 'border-[var(--color-line)] text-[var(--color-fg-muted)] hover:border-[var(--color-line-strong)]'
                  }`}
                  aria-pressed={rate === option}
                >
                  {option}x
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label={labels.close}
              title={labels.close}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {mp3Url && (
            <audio
              ref={audioRef}
              src={mp3Url}
              preload="metadata"
              onTimeUpdate={onAudioTimeUpdate}
              onEnded={onAudioEnded}
              onLoadedMetadata={onAudioTimeUpdate}
              className="hidden"
            />
          )}
        </div>
      )}
    </>
  );
}
