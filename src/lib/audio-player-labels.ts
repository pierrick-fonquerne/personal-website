import type { ChapterAudioLabels } from '../components/learning/ChapterAudioPlayer';
import type { Translations } from '../i18n/en';

export function audioPlayerLabels(t: Translations): ChapterAudioLabels {
  return {
    listen: t.toolbar.listen,
    pause: t.toolbar.pause,
    resume: t.toolbar.resume,
    stop: t.toolbar.stop,
    close: t.toolbar.close,
    speed: t.toolbar.speed,
    loading: t.toolbar.loading,
    error: t.toolbar.error,
    webSpeechBadge: t.toolbar.webSpeechBadge,
    mp3Badge: t.toolbar.mp3Badge,
    download: t.toolbar.download,
    skipBack: t.toolbar.skipBack,
    skipForward: t.toolbar.skipForward,
    nextChapterIn: t.toolbar.nextChapterIn,
    playNext: t.toolbar.playNext,
    cancel: t.toolbar.cancel,
    shortcuts: t.toolbar.shortcuts,
    shortcutsTitle: t.toolbar.shortcutsTitle,
    shortcutPlayPause: t.toolbar.shortcutPlayPause,
    shortcutSkipBack: t.toolbar.shortcutSkipBack,
    shortcutSkipForward: t.toolbar.shortcutSkipForward,
    shortcutFineSeek: t.toolbar.shortcutFineSeek,
    shortcutJump: t.toolbar.shortcutJump,
  };
}
