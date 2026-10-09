import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GradientDescentLab from './GradientDescentLab';

describe('GradientDescentLab', () => {
  it('starts in parabola mode at iteration 0 with the default learning rate', () => {
    render(<GradientDescentLab locale="fr" defaultLearningRate={0.1} />);
    expect(screen.getByTestId('descent-iteration')).toHaveTextContent('0');
    expect(screen.getByTestId('descent-regime')).toHaveTextContent('converge');
  });

  it('advances one iteration per step click', () => {
    render(<GradientDescentLab locale="fr" defaultLearningRate={0.1} />);
    fireEvent.click(screen.getByTestId('descent-step'));
    fireEvent.click(screen.getByTestId('descent-step'));
    expect(screen.getByTestId('descent-iteration')).toHaveTextContent('2');
    expect(screen.getByTestId('descent-weight')).toHaveTextContent('1,28');
  });

  it('reports divergence when the learning rate exceeds 1 / a', () => {
    render(<GradientDescentLab locale="fr" defaultLearningRate={0.1} />);
    fireEvent.change(screen.getByTestId('descent-learning-rate'), { target: { value: '1.1' } });
    expect(screen.getByTestId('descent-regime')).toHaveTextContent('diverge');
  });

  it('resets the trajectory when the learning rate changes', () => {
    render(<GradientDescentLab locale="fr" defaultLearningRate={0.1} />);
    fireEvent.click(screen.getByTestId('descent-step'));
    fireEvent.change(screen.getByTestId('descent-learning-rate'), { target: { value: '0.75' } });
    expect(screen.getByTestId('descent-iteration')).toHaveTextContent('0');
  });

  it('resets to iteration 0 on reset click', () => {
    render(<GradientDescentLab locale="fr" defaultLearningRate={0.1} />);
    fireEvent.click(screen.getByTestId('descent-step'));
    fireEvent.click(screen.getByTestId('descent-reset'));
    expect(screen.getByTestId('descent-iteration')).toHaveTextContent('0');
  });

  it('switches to the ravine mode and shows the contour map', () => {
    render(<GradientDescentLab locale="en" defaultLearningRate={0.09} />);
    fireEvent.click(screen.getByTestId('descent-mode-ravine'));
    expect(screen.getByTestId('descent-ravine-map')).toBeInTheDocument();
    expect(screen.queryByTestId('descent-regime')).not.toBeInTheDocument();
  });

  it('starts directly in ravine mode when requested', () => {
    render(<GradientDescentLab locale="en" defaultMode="ravine" />);
    expect(screen.getByTestId('descent-ravine-map')).toBeInTheDocument();
  });

  it('does not announce every step in the live status', () => {
    render(<GradientDescentLab locale="fr" defaultLearningRate={0.1} />);
    const status = screen.getByRole('status');
    const before = status.textContent;
    fireEvent.click(screen.getByTestId('descent-step'));
    fireEvent.click(screen.getByTestId('descent-step'));
    expect(status.textContent).toBe(before);
    expect(document.querySelector('[aria-live]')).toBeNull();
  });

  it('announces the regime change in the live status', () => {
    render(<GradientDescentLab locale="fr" defaultLearningRate={0.1} />);
    fireEvent.change(screen.getByTestId('descent-learning-rate'), { target: { value: '1.1' } });
    expect(screen.getByRole('status')).toHaveTextContent('diverge');
  });

  it('keeps step and run focusable with aria-disabled once finished', () => {
    render(<GradientDescentLab locale="fr" defaultLearningRate={0.1} />);
    const stepButton = screen.getByTestId('descent-step');
    expect(stepButton).not.toHaveAttribute('aria-disabled', 'true');
    for (let index = 0; index < 30; index += 1) fireEvent.click(stepButton);
    expect(screen.getByTestId('descent-iteration')).toHaveTextContent('30');
    expect(stepButton).toHaveAttribute('aria-disabled', 'true');
    expect(stepButton).not.toBeDisabled();
    expect(screen.getByTestId('descent-run')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(stepButton);
    expect(screen.getByTestId('descent-iteration')).toHaveTextContent('30');
  });

  it('shows a message when the run stops at 30 iterations, in both modes', () => {
    const { unmount } = render(<GradientDescentLab locale="en" defaultLearningRate={0.05} />);
    expect(screen.queryByTestId('descent-stop-message')).not.toBeInTheDocument();
    for (let index = 0; index < 30; index += 1) fireEvent.click(screen.getByTestId('descent-step'));
    expect(screen.getByTestId('descent-stop-message')).toHaveTextContent('30');
    unmount();
    render(<GradientDescentLab locale="en" defaultMode="ravine" defaultLearningRate={0.05} />);
    for (let index = 0; index < 30; index += 1) fireEvent.click(screen.getByTestId('descent-step'));
    expect(screen.getByTestId('descent-stop-message')).toHaveTextContent('30');
  });

  it('names the slider stably and exposes its value as text', () => {
    render(<GradientDescentLab locale="fr" defaultLearningRate={0.1} />);
    const slider = screen.getByTestId('descent-learning-rate');
    expect(slider).toHaveAccessibleName('Taux d’apprentissage η');
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('0,1'));
    expect(slider).toHaveAttribute('aria-valuetext', expect.stringContaining('converge'));
  });

  it('groups the mode buttons and marks the active one', () => {
    render(<GradientDescentLab locale="fr" />);
    expect(screen.getByRole('group')).toHaveAccessibleName();
    expect(screen.getByTestId('descent-mode-parabola')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('descent-mode-parabola')).toHaveStyle({ fontWeight: '600' });
    expect(screen.getByTestId('descent-mode-ravine')).not.toHaveStyle({ fontWeight: '600' });
  });

  it('hides the decorative axis letters from assistive technology', () => {
    render(<GradientDescentLab locale="fr" />);
    const texts = screen.getByTestId('descent-parabola-curve').querySelectorAll('text');
    expect(texts.length).toBe(2);
    texts.forEach((text) => expect(text).toHaveAttribute('aria-hidden', 'true'));
  });

  it('classifies the ravine behaviour in French', () => {
    render(<GradientDescentLab locale="fr" defaultMode="ravine" />);
    const slider = screen.getByTestId('descent-learning-rate');
    const status = screen.getByTestId('descent-ravine-status');
    expect(status).toHaveTextContent('zigzag');
    fireEvent.change(slider, { target: { value: '0.1' } });
    expect(status).toHaveTextContent('rebondit sans fin');
    fireEvent.change(slider, { target: { value: '0.12' } });
    expect(status).toHaveTextContent('diverge');
    fireEvent.change(slider, { target: { value: '0.05' } });
    expect(status).toHaveTextContent('descend sans zigzag');
  });

  it('classifies the ravine behaviour in English', () => {
    render(<GradientDescentLab locale="en" defaultMode="ravine" />);
    expect(screen.getByTestId('descent-ravine-status')).toHaveTextContent('zigzag');
  });

  it('starts the ravine at its own default rate when switching modes', () => {
    render(<GradientDescentLab locale="en" defaultLearningRate={0.1} />);
    fireEvent.click(screen.getByTestId('descent-mode-ravine'));
    expect(screen.getByTestId('descent-learning-rate')).toHaveValue('0.09');
  });

  it('restores the requested rate when switching back to the initial mode', () => {
    render(<GradientDescentLab locale="en" defaultLearningRate={0.5} />);
    fireEvent.click(screen.getByTestId('descent-mode-ravine'));
    fireEvent.click(screen.getByTestId('descent-mode-parabola'));
    expect(screen.getByTestId('descent-learning-rate')).toHaveValue('0.5');
  });
});
