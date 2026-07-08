import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChapterAudioPlayer, { type ChapterAudioLabels } from './ChapterAudioPlayer';

const labels: ChapterAudioLabels = {
  listen: 'Ecouter',
  pause: 'Pause',
  resume: 'Reprendre',
  stop: 'Arreter',
  close: 'Fermer',
  speed: 'Vitesse',
  loading: 'Chargement',
  error: 'Erreur',
  webSpeechBadge: 'Synthese vocale',
  mp3Badge: 'MP3',
  download: 'Telecharger',
  skipBack: 'Reculer',
  skipForward: 'Avancer',
  nextChapterIn: (seconds) => `Chapitre suivant dans ${seconds}s`,
  playNext: 'Lire la suite',
  cancel: 'Annuler',
  shortcuts: 'Raccourcis',
  shortcutsTitle: 'Raccourcis clavier',
  shortcutPlayPause: 'Lecture / pause',
  shortcutSkipBack: 'Reculer',
  shortcutSkipForward: 'Avancer',
  shortcutFineSeek: 'Avance fine',
  shortcutJump: 'Sauter a',
};

// Long enough so char-index math stays exact (no floating point rounding).
const READABLE_TEXT = 'a'.repeat(120);

class FakeSpeechSynthesisUtterance {
  text: string;
  lang = '';
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  onboundary: ((ev: { charIndex: number }) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

function setupSpeechSynthesis(): { speak: ReturnType<typeof vi.fn> } {
  const speak = vi.fn();
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => [],
      speak,
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
  (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance =
    FakeSpeechSynthesisUtterance;
  return { speak };
}

async function renderInSpeechMode(): Promise<{ speak: ReturnType<typeof vi.fn> }> {
  const content = document.createElement('div');
  content.id = 'chapter-content';
  content.textContent = READABLE_TEXT;
  document.body.appendChild(content);

  const { speak } = setupSpeechSynthesis();

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
  );

  render(
    <ChapterAudioPlayer
      locale="fr"
      courseSlug="cours-test"
      moduleSlug="chapitre-test"
      contentSelector="#chapter-content"
      labels={labels}
    />,
  );

  const playButton = await screen.findByRole('button', { name: labels.listen });
  await waitFor(() => expect(playButton).not.toBeDisabled());
  fireEvent.click(playButton);

  return { speak };
}

describe('ChapterAudioPlayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('keeps saving playback position periodically despite frequent progress updates', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const { speak } = await renderInSpeechMode();
    const utterance = speak.mock.calls[0][0] as FakeSpeechSynthesisUtterance;

    // Simulate the real-world situation: progress advances every second, well
    // below the 5s save interval, for 6 seconds.
    for (let i = 0; i < 6; i += 1) {
      act(() => {
        utterance.onboundary?.({ charIndex: (i + 1) * 15 });
        vi.advanceTimersByTime(1000);
      });
    }

    const positionCalls = setItemSpy.mock.calls.filter(([key]) =>
      String(key).startsWith('audio-player:pos:'),
    );
    expect(positionCalls.length).toBeGreaterThan(0);
  });

  it('resumes narration at the current character when the playback rate changes', async () => {
    const { speak } = await renderInSpeechMode();
    const firstUtterance = speak.mock.calls[0][0] as FakeSpeechSynthesisUtterance;

    // charIndex chosen so charsPerSecond(15) * rate(1) divides it evenly,
    // avoiding floating point rounding when the component recomputes it.
    act(() => {
      firstUtterance.onboundary?.({ charIndex: 30 });
    });

    fireEvent.click(screen.getByRole('button', { name: '1.25x' }));

    await waitFor(() => expect(speak).toHaveBeenCalledTimes(2));
    const secondUtterance = speak.mock.calls[1][0] as FakeSpeechSynthesisUtterance;

    expect(secondUtterance.text).toBe(READABLE_TEXT.slice(30));
    expect(secondUtterance.rate).toBe(1.25);
  });
});
