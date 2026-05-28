import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type MouseEvent as ReactMouseEvent,
} from 'react';
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
  download: string;
  skipBack: string;
  skipForward: string;
  nextChapterIn: (seconds: number) => string;
  playNext: string;
  cancel: string;
  shortcuts: string;
  shortcutsTitle: string;
  shortcutPlayPause: string;
  shortcutSkipBack: string;
  shortcutSkipForward: string;
  shortcutFineSeek: string;
  shortcutJump: string;
}

interface Props {
  locale: 'fr' | 'en';
  courseSlug: string;
  moduleSlug: string;
  contentSelector: string;
  labels: ChapterAudioLabels;
  chapterTitle?: string;
  nextHref?: string;
  nextTitle?: string;
}

type Source = 'mp3' | 'speech' | 'unknown';
type Status = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

function manifestKey(locale: string, course: string, mod: string): string {
  return `${locale}/${course}/${mod}`;
}

function pickBestVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return undefined;
  const langPrefix = lang.split('-')[0].toLowerCase();
  const matches = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  if (matches.length === 0) return undefined;
  const scored = matches.map((voice) => {
    const name = voice.name.toLowerCase();
    let score = 0;
    if (name.includes('google')) score += 100;
    if (name.includes('natural') || name.includes('neural')) score += 60;
    if (name.includes('online') || name.includes('cloud')) score += 40;
    if (!voice.localService) score += 30;
    if (voice.lang.toLowerCase() === lang.toLowerCase()) score += 20;
    if (voice.default) score += 10;
    if (name.includes('microsoft david') || name.includes('microsoft zira')) score -= 50;
    if (name.includes('eloquence') || name.includes('compact')) score -= 30;
    return { voice, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].voice;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const RATE_STORAGE_KEY = 'audio-player:rate';
function positionStorageKey(locale: string, course: string, mod: string): string {
  return `audio-player:pos:${locale}/${course}/${mod}`;
}

function loadStoredRate(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const raw = window.localStorage.getItem(RATE_STORAGE_KEY);
    if (!raw) return 1;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  } catch {
    return 1;
  }
}

function loadStoredPosition(locale: string, course: string, mod: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(positionStorageKey(locale, course, mod));
    if (!raw) return 0;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveStoredRate(value: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RATE_STORAGE_KEY, String(value));
  } catch {
    /* localStorage unavailable */
  }
}

function saveStoredPosition(locale: string, course: string, mod: string, value: number): void {
  if (typeof window === 'undefined') return;
  try {
    if (value <= 0.5) {
      window.localStorage.removeItem(positionStorageKey(locale, course, mod));
    } else {
      window.localStorage.setItem(positionStorageKey(locale, course, mod), String(value));
    }
  } catch {
    /* localStorage unavailable */
  }
}

export default function ChapterAudioPlayer({
  locale,
  courseSlug,
  moduleSlug,
  contentSelector,
  labels,
  chapterTitle,
  nextHref,
  nextTitle,
}: Props): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);
  const [status, setStatus] = useState<Status>('idle');
  const [source, setSource] = useState<Source>('unknown');
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [rate, setRate] = useState<number>(() => loadStoredRate());
  const [mp3Url, setMp3Url] = useState<string | null>(null);
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);

  const initialPositionRef = useRef<number>(loadStoredPosition(locale, courseSlug, moduleSlug));
  const positionRestoredRef = useRef<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechStartRef = useRef<number>(0);
  const speechCharsRef = useRef<number>(0);
  const speechTextRef = useRef<string>('');
  const speechCharsPerSecondRef = useRef<number>(15);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const key = useMemo(
    () => manifestKey(locale, courseSlug, moduleSlug),
    [locale, courseSlug, moduleSlug],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const trigger = (): void => {
      window.speechSynthesis.getVoices();
    };
    trigger();
    window.speechSynthesis.addEventListener?.('voiceschanged', trigger);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', trigger);
    };
  }, []);

  useEffect(() => {
    saveStoredRate(rate);
  }, [rate]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const handleBeforeSwap = (): void => {
      if (audioRef.current) audioRef.current.pause();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
    document.addEventListener('astro:before-swap', handleBeforeSwap);
    window.addEventListener('beforeunload', handleBeforeSwap);
    return () => {
      document.removeEventListener('astro:before-swap', handleBeforeSwap);
      window.removeEventListener('beforeunload', handleBeforeSwap);
    };
  }, []);

  useEffect(() => {
    if (status !== 'playing') return undefined;
    const id = window.setInterval(() => {
      saveStoredPosition(locale, courseSlug, moduleSlug, progress);
    }, 5000);
    return () => window.clearInterval(id);
  }, [courseSlug, locale, moduleSlug, progress, status]);

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

  const speakFromChar = useCallback(
    (text: string, startChar: number): void => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setStatus('error');
        return;
      }
      window.speechSynthesis.cancel();
      const clampedStart = Math.max(0, Math.min(startChar, text.length - 1));
      const remaining = text.slice(clampedStart);
      const utterance = new SpeechSynthesisUtterance(remaining);
      const langTag = locale === 'fr' ? 'fr-FR' : 'en-US';
      utterance.lang = langTag;
      const bestVoice = pickBestVoice(langTag);
      if (bestVoice) utterance.voice = bestVoice;
      utterance.rate = rate;
      speechCharsRef.current = text.length;
      speechTextRef.current = text;
      speechStartRef.current = Date.now();
      const totalDuration = text.length / (speechCharsPerSecondRef.current * rate);
      setDuration(totalDuration);
      setProgress(clampedStart / speechCharsPerSecondRef.current / rate);

      utterance.onboundary = (ev) => {
        if (typeof ev.charIndex === 'number' && speechCharsRef.current > 0) {
          const absoluteChar = clampedStart + ev.charIndex;
          setProgress(absoluteChar / speechCharsPerSecondRef.current / rate);
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
    },
    [locale, rate],
  );

  const playSpeech = useCallback((): void => {
    const text = extractReadableText(contentSelector);
    if (!text) {
      setStatus('error');
      return;
    }
    speakFromChar(text, 0);
  }, [contentSelector, speakFromChar]);

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

  const handleSeek = useCallback(
    (targetSeconds: number): void => {
      const clamped = Math.max(0, Math.min(targetSeconds, duration || targetSeconds));
      if (source === 'mp3' && audioRef.current) {
        audioRef.current.currentTime = clamped;
        setProgress(clamped);
      } else if (source === 'speech' && speechTextRef.current) {
        const charIndex = Math.floor(clamped * speechCharsPerSecondRef.current * rate);
        speakFromChar(speechTextRef.current, charIndex);
      }
    },
    [duration, rate, source, speakFromChar],
  );

  const handleSkip = useCallback(
    (delta: number): void => {
      handleSeek(progress + delta);
    },
    [handleSeek, progress],
  );

  const handleProgressBarClick = useCallback(
    (ev: ReactMouseEvent<HTMLDivElement>): void => {
      const bar = progressBarRef.current;
      if (!bar || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      handleSeek(fraction * duration);
    },
    [duration, handleSeek],
  );

  const handleRateChange = useCallback(
    (newRate: number): void => {
      setRate(newRate);
      saveStoredRate(newRate);
      if (source === 'mp3' && audioRef.current) {
        audioRef.current.playbackRate = newRate;
      } else if (source === 'speech' && status === 'playing') {
        playSpeech();
      }
    },
    [playSpeech, source, status],
  );

  const onAudioLoadedMetadata = (): void => {
    const el = audioRef.current;
    if (!el) return;
    if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
    if (!positionRestoredRef.current && initialPositionRef.current > 0) {
      el.currentTime = Math.min(initialPositionRef.current, el.duration - 1);
      setProgress(el.currentTime);
      positionRestoredRef.current = true;
    }
  };

  const onAudioTimeUpdate = (): void => {
    const el = audioRef.current;
    if (!el) return;
    setProgress(el.currentTime);
    if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
  };

  const onAudioEnded = (): void => {
    setStatus('idle');
    setProgress(0);
    saveStoredPosition(locale, courseSlug, moduleSlug, 0);
    if (nextHref) {
      setNextCountdown(5);
    }
  };

  useEffect(() => {
    if (nextCountdown === null) return undefined;
    if (nextCountdown <= 0) {
      if (typeof window !== 'undefined' && nextHref) {
        window.location.assign(nextHref);
      }
      return undefined;
    }
    const id = window.setTimeout(() => setNextCountdown((n) => (n === null ? null : n - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [nextCountdown, nextHref]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (ev: KeyboardEvent): void => {
      const target = ev.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      if (ev.key === ' ' || ev.code === 'Space' || ev.key.toLowerCase() === 'k') {
        ev.preventDefault();
        if (isPlaying) handlePause();
        else handlePlay();
      } else if (ev.key.toLowerCase() === 'j') {
        ev.preventDefault();
        handleSkip(-15);
      } else if (ev.key.toLowerCase() === 'l') {
        ev.preventDefault();
        handleSkip(15);
      } else if (/^[0-9]$/.test(ev.key) && duration > 0) {
        ev.preventDefault();
        const fraction = Number.parseInt(ev.key, 10) / 10;
        handleSeek(fraction * duration);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration, handlePause, handlePlay, handleSeek, handleSkip, status, open]);

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
          {chapterTitle && (
            <div className="mx-auto mb-2 flex max-w-[1280px] items-center justify-between gap-3 font-mono text-[10px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
              <span className="truncate">{chapterTitle}</span>
              {nextCountdown !== null && nextTitle && (
                <span className="flex items-center gap-2">
                  <span>{labels.nextChapterIn(nextCountdown)} — {nextTitle}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (nextHref && typeof window !== 'undefined') window.location.assign(nextHref);
                    }}
                    className="cursor-pointer rounded border border-[var(--color-fg)] px-2 py-0.5 text-[var(--color-fg)] hover:opacity-80"
                  >
                    {labels.playNext}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNextCountdown(null)}
                    className="cursor-pointer rounded border border-[var(--color-line)] px-2 py-0.5 hover:border-[var(--color-line-strong)]"
                  >
                    {labels.cancel}
                  </button>
                </span>
              )}
            </div>
          )}
          <div className="mx-auto flex max-w-[1280px] items-center gap-4">
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => handleSkip(-15)}
                aria-label={labels.skipBack}
                title={`${labels.skipBack} (J)`}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="18 17 13 12 18 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={isPlaying ? handlePause : handlePlay}
                aria-label={isPlaying ? labels.pause : labels.resume}
                title={`${isPlaying ? labels.pause : labels.resume} (Espace / K)`}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-fg)] hover:border-[var(--color-line-strong)]"
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
              <button
                type="button"
                onClick={() => handleSkip(15)}
                aria-label={labels.skipForward}
                title={`${labels.skipForward} (L)`}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="13 17 18 12 13 7" />
                  <polyline points="6 17 11 12 6 7" />
                </svg>
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <div
                ref={progressBarRef}
                onClick={handleProgressBarClick}
                className="group h-2 w-full cursor-pointer overflow-hidden rounded-full bg-[var(--color-line)]"
                role="slider"
                tabIndex={0}
                aria-label={`${labels.listen} — progress`}
                aria-valuemin={0}
                aria-valuemax={duration || 1}
                aria-valuenow={progress}
                onKeyDown={(ev) => {
                  if (ev.key === 'ArrowLeft') handleSkip(-5);
                  else if (ev.key === 'ArrowRight') handleSkip(5);
                }}
              >
                <div
                  className="h-full bg-[var(--color-fg)] transition-all duration-100"
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

            {mp3Url && (
              <a
                href={mp3Url}
                download
                aria-label={labels.download}
                title={labels.download}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </a>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowShortcuts((v) => !v)}
                aria-label={labels.shortcuts}
                aria-expanded={showShortcuts}
                title={labels.shortcuts}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
              {showShortcuts && (
                <div
                  className="absolute right-0 bottom-[calc(100%+8px)] w-72 rounded-md border border-[var(--color-line)] bg-[var(--color-bg)] p-3 shadow-[0_-2px_12px_rgba(0,0,0,0.25)]"
                  role="dialog"
                  aria-label={labels.shortcutsTitle}
                >
                  <p className="mb-2 font-mono text-[10px] tracking-[0.14em] text-[var(--color-fg-muted)] uppercase">
                    {labels.shortcutsTitle}
                  </p>
                  <ul className="space-y-1.5 text-[12px] leading-tight">
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-[var(--color-fg)]">{labels.shortcutPlayPause}</span>
                      <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">
                        <kbd className="rounded border border-[var(--color-line)] px-1.5 py-0.5">Espace</kbd>{' '}
                        <kbd className="rounded border border-[var(--color-line)] px-1.5 py-0.5">K</kbd>
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-[var(--color-fg)]">{labels.shortcutSkipBack}</span>
                      <kbd className="rounded border border-[var(--color-line)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-fg-muted)]">J</kbd>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-[var(--color-fg)]">{labels.shortcutSkipForward}</span>
                      <kbd className="rounded border border-[var(--color-line)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-fg-muted)]">L</kbd>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-[var(--color-fg)]">{labels.shortcutFineSeek}</span>
                      <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">
                        <kbd className="rounded border border-[var(--color-line)] px-1.5 py-0.5">←</kbd>{' '}
                        <kbd className="rounded border border-[var(--color-line)] px-1.5 py-0.5">→</kbd>
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="text-[var(--color-fg)]">{labels.shortcutJump}</span>
                      <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">
                        <kbd className="rounded border border-[var(--color-line)] px-1.5 py-0.5">0</kbd>…<kbd className="rounded border border-[var(--color-line)] px-1.5 py-0.5">9</kbd>
                      </span>
                    </li>
                  </ul>
                </div>
              )}
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
              onLoadedMetadata={onAudioLoadedMetadata}
              className="hidden"
            />
          )}
        </div>
      )}
    </>
  );
}
