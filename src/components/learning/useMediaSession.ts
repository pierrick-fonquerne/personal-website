import { useEffect, useRef } from 'react';

/**
 * Artwork descriptor passed to the Media Session metadata.
 */
export interface MediaSessionArtwork {
  src: string;
  sizes: string;
  type: string;
}

/**
 * Action callbacks wired to the platform media controls (lock screen,
 * notification, Bluetooth headset).
 */
export interface MediaSessionHandlers {
  play: () => void;
  pause: () => void;
  stop?: () => void;
  seekBackward: () => void;
  seekForward: () => void;
  seekTo?: (time: number) => void;
  nextTrack?: () => void;
}

/**
 * Options driving the Media Session integration.
 */
export interface UseMediaSessionOptions {
  active: boolean;
  isPlaying: boolean;
  title: string;
  artist: string;
  album?: string;
  artwork?: MediaSessionArtwork[];
  duration: number;
  position: number;
  playbackRate: number;
  supportsPosition: boolean;
  handlers: MediaSessionHandlers;
}

/**
 * Determines whether the Media Session API is available in the current browser.
 */
function hasMediaSession(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
}

/**
 * Wires the platform Media Session to the chapter audio player so playback can
 * be controlled from the lock screen, notification shade and connected devices.
 *
 * The hook is a no-op when the API is unavailable. Position state is only
 * published when the underlying source exposes a real timeline (MP3 mode);
 * speech synthesis still receives metadata and transport handlers.
 */
export function useMediaSession(options: UseMediaSessionOptions): void {
  const {
    active,
    isPlaying,
    title,
    artist,
    album,
    artwork,
    duration,
    position,
    playbackRate,
    supportsPosition,
    handlers,
  } = options;

  const handlersRef = useRef<MediaSessionHandlers>(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!hasMediaSession() || !active || typeof window.MediaMetadata === 'undefined') {
      return;
    }
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title,
      artist,
      album: album ?? artist,
      artwork: artwork ?? [],
    });
  }, [active, title, artist, album, artwork]);

  useEffect(() => {
    if (!hasMediaSession() || !active) {
      return;
    }
    const session = navigator.mediaSession;
    const set = (action: MediaSessionAction, handler: (() => void) | null) => {
      try {
        session.setActionHandler(action, handler);
      } catch {
        /* unsupported action on this platform */
      }
    };

    set('play', () => handlersRef.current.play());
    set('pause', () => handlersRef.current.pause());
    set('stop', () => handlersRef.current.stop?.());
    set('seekbackward', () => handlersRef.current.seekBackward());
    set('seekforward', () => handlersRef.current.seekForward());
    set('seekto', (details?: MediaSessionActionDetails) => {
      if (typeof details?.seekTime === 'number') {
        handlersRef.current.seekTo?.(details.seekTime);
      }
    });
    set('nexttrack', () => handlersRef.current.nextTrack?.());

    return () => {
      const actions: MediaSessionAction[] = [
        'play',
        'pause',
        'stop',
        'seekbackward',
        'seekforward',
        'seekto',
        'nexttrack',
      ];
      actions.forEach((action) => set(action, null));
    };
  }, [active]);

  useEffect(() => {
    if (!hasMediaSession() || !active) {
      return;
    }
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [active, isPlaying]);

  useEffect(() => {
    if (!hasMediaSession() || !active || !supportsPosition) {
      return;
    }
    if (
      typeof navigator.mediaSession.setPositionState !== 'function' ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      return;
    }
    try {
      navigator.mediaSession.setPositionState({
        duration,
        position: Math.min(Math.max(position, 0), duration),
        playbackRate: playbackRate > 0 ? playbackRate : 1,
      });
    } catch {
      /* invalid position state, ignore */
    }
  }, [active, supportsPosition, duration, position, playbackRate]);

  useEffect(() => {
    return () => {
      if (!hasMediaSession()) {
        return;
      }
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    };
  }, []);
}
