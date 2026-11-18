import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import InitializationLab from './InitializationLab';
import { DICTIONARY_BY_LOCALE } from './initialization/initializationDictionary';
import { XOR_SNAPSHOT_COUNT } from './initialization/initializationLogic';

const FRENCH = DICTIONARY_BY_LOCALE.fr;
const ENGLISH = DICTIONARY_BY_LOCALE.en;

function clickStepUntilFinished(): void {
  for (let index = 0; index < XOR_SNAPSHOT_COUNT; index += 1) {
    fireEvent.click(screen.getByTestId('initialization-step'));
  }
}

describe('InitializationLab', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders the French and English titles', () => {
    const { unmount } = render(<InitializationLab locale="fr" />);
    expect(screen.getByRole('heading', { name: FRENCH.title })).toBeInTheDocument();
    unmount();
    render(<InitializationLab locale="en" />);
    expect(screen.getByRole('heading', { name: ENGLISH.title })).toBeInTheDocument();
  });

  it('exposes the two modes as pressed toggle buttons inside a group', () => {
    render(<InitializationLab locale="fr" />);
    expect(screen.getByRole('group', { name: FRENCH.modeGroup })).toBeInTheDocument();
    const symmetryButton = screen.getByTestId('initialization-mode-symmetry');
    const depthButton = screen.getByTestId('initialization-mode-depth');
    expect(symmetryButton).toHaveAttribute('aria-pressed', 'true');
    expect(depthButton).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(depthButton);
    expect(symmetryButton).toHaveAttribute('aria-pressed', 'false');
    expect(depthButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('changes the displayed score after a step in symmetry mode', () => {
    render(<InitializationLab locale="fr" />);
    const before = screen.getByTestId('initialization-loss').textContent;
    fireEvent.click(screen.getByRole('button', { name: FRENCH.step }));
    expect(screen.getByTestId('initialization-loss').textContent).not.toBe(before);
  });

  it('lets the reader pick the twin or the random start with pressed buttons', () => {
    render(<InitializationLab locale="en" />);
    const twins = screen.getByTestId('initialization-start-twins');
    const random = screen.getByTestId('initialization-start-random');
    fireEvent.click(twins);
    expect(twins).toHaveAttribute('aria-pressed', 'true');
    expect(random).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(random);
    expect(twins).toHaveAttribute('aria-pressed', 'false');
    expect(random).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the twins at distance zero while the random start separates them', () => {
    render(<InitializationLab locale="en" />);
    fireEvent.click(screen.getByTestId('initialization-start-twins'));
    clickStepUntilFinished();
    expect(screen.getByTestId('initialization-twin-distance')).toHaveTextContent(/^0[.,]0+$/);
    fireEvent.click(screen.getByTestId('initialization-start-random'));
    clickStepUntilFinished();
    expect(screen.getByTestId('initialization-twin-distance')).not.toHaveTextContent(/^0[.,]0+$/);
  });

  it('announces only the final diagnosis in symmetry mode', () => {
    render(<InitializationLab locale="en" />);
    fireEvent.click(screen.getByTestId('initialization-start-twins'));
    const status = screen.getByRole('status');
    const before = status.textContent;
    fireEvent.click(screen.getByTestId('initialization-step'));
    expect(status.textContent).toBe(before);
    clickStepUntilFinished();
    expect(status).toHaveTextContent(ENGLISH.twinsStuck);
    fireEvent.click(screen.getByTestId('initialization-start-random'));
    clickStepUntilFinished();
    expect(screen.getByRole('status')).toHaveTextContent(ENGLISH.xorSolved);
    expect(document.querySelector('[aria-live]')).toBeNull();
  });

  it('exposes activation and scheme choices as pressed buttons in depth mode', () => {
    render(<InitializationLab locale="fr" defaultMode="depth" />);
    const tanh = screen.getByTestId('initialization-activation-tanh');
    const relu = screen.getByTestId('initialization-activation-relu');
    expect(relu).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(tanh);
    expect(tanh).toHaveAttribute('aria-pressed', 'true');
    expect(relu).toHaveAttribute('aria-pressed', 'false');
    const he = screen.getByTestId('initialization-scheme-he');
    const standardNormal = screen.getByTestId('initialization-scheme-standard-normal');
    expect(standardNormal).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(he);
    expect(he).toHaveAttribute('aria-pressed', 'true');
    expect(standardNormal).toHaveAttribute('aria-pressed', 'false');
  });

  it('diagnoses explosion, vanishing and stability from the scheme', () => {
    render(<InitializationLab locale="en" defaultMode="depth" />);
    expect(screen.getByRole('status')).toHaveTextContent(ENGLISH.exploding);
    fireEvent.click(screen.getByTestId('initialization-scheme-xavier'));
    expect(screen.getByRole('status')).toHaveTextContent(ENGLISH.vanishing);
    fireEvent.click(screen.getByTestId('initialization-scheme-he'));
    expect(screen.getByRole('status')).toHaveTextContent(ENGLISH.stable);
  });

  it('turns an exploding network stable with the batch norm switch', () => {
    render(<InitializationLab locale="fr" defaultMode="depth" />);
    const switchButton = screen.getByTestId('initialization-batch-norm');
    expect(switchButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status')).toHaveTextContent(FRENCH.exploding);
    fireEvent.click(switchButton);
    expect(switchButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(FRENCH.stable);
  });

  it('leaves no timer behind when unmounted during an animation', () => {
    const { unmount } = render(<InitializationLab locale="fr" />);
    fireEvent.click(screen.getByTestId('initialization-run'));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
