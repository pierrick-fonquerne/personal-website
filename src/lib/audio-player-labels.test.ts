import { describe, expect, it } from 'vitest';

import { audioPlayerLabels } from './audio-player-labels';
import en from '../i18n/en';
import fr from '../i18n/fr';

describe('audioPlayerLabels', () => {
  it('maps the French toolbar strings', () => {
    const labels = audioPlayerLabels(fr);
    expect(labels.listen).toBe(fr.toolbar.listen);
    expect(labels.pause).toBe(fr.toolbar.pause);
    expect(labels.resume).toBe(fr.toolbar.resume);
    expect(labels.stop).toBe(fr.toolbar.stop);
    expect(labels.close).toBe(fr.toolbar.close);
    expect(labels.speed).toBe(fr.toolbar.speed);
    expect(labels.loading).toBe(fr.toolbar.loading);
    expect(labels.error).toBe(fr.toolbar.error);
    expect(labels.webSpeechBadge).toBe(fr.toolbar.webSpeechBadge);
    expect(labels.mp3Badge).toBe(fr.toolbar.mp3Badge);
    expect(labels.download).toBe(fr.toolbar.download);
    expect(labels.skipBack).toBe(fr.toolbar.skipBack);
    expect(labels.skipForward).toBe(fr.toolbar.skipForward);
    expect(labels.nextChapterIn).toBe(fr.toolbar.nextChapterIn);
    expect(labels.playNext).toBe(fr.toolbar.playNext);
    expect(labels.cancel).toBe(fr.toolbar.cancel);
    expect(labels.shortcuts).toBe(fr.toolbar.shortcuts);
    expect(labels.shortcutsTitle).toBe(fr.toolbar.shortcutsTitle);
    expect(labels.shortcutPlayPause).toBe(fr.toolbar.shortcutPlayPause);
    expect(labels.shortcutSkipBack).toBe(fr.toolbar.shortcutSkipBack);
    expect(labels.shortcutSkipForward).toBe(fr.toolbar.shortcutSkipForward);
    expect(labels.shortcutFineSeek).toBe(fr.toolbar.shortcutFineSeek);
    expect(labels.shortcutJump).toBe(fr.toolbar.shortcutJump);
  });

  it('maps the English toolbar strings', () => {
    const labels = audioPlayerLabels(en);
    expect(labels.listen).toBe(en.toolbar.listen);
    expect(labels.pause).toBe(en.toolbar.pause);
    expect(labels.shortcutJump).toBe(en.toolbar.shortcutJump);
    expect(labels.nextChapterIn).toBe(en.toolbar.nextChapterIn);
  });

  it('does not include the print label', () => {
    const labels = audioPlayerLabels(fr);
    expect('print' in labels).toBe(false);
  });
});
