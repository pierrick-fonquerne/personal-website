import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RegularizationLab from './RegularizationLab';

describe('RegularizationLab', () => {
  it('starts in penalty mode at degree 9 without penalty and diagnoses overfitting', () => {
    render(<RegularizationLab locale="fr" />);
    expect(screen.getByTestId('regularization-degree')).toHaveValue('9');
    expect(screen.getByTestId('regularization-penalty-value')).toHaveTextContent('0');
    expect(screen.getByTestId('regularization-training-error')).toHaveTextContent('0,000');
    expect(screen.getByTestId('regularization-diagnosis')).toHaveTextContent('sur-apprentissage');
  });

  it('reaches a balanced fit with a moderate penalty', () => {
    render(<RegularizationLab locale="fr" />);
    fireEvent.change(screen.getByTestId('regularization-penalty'), { target: { value: '5' } });
    expect(screen.getByTestId('regularization-diagnosis')).toHaveTextContent('équilibre');
  });

  it('diagnoses underfitting at degree 1', () => {
    render(<RegularizationLab locale="fr" />);
    fireEvent.change(screen.getByTestId('regularization-degree'), { target: { value: '1' } });
    expect(screen.getByTestId('regularization-diagnosis')).toHaveTextContent('sous-apprentissage');
  });

  it('speaks English when asked', () => {
    render(<RegularizationLab locale="en" />);
    expect(screen.getByTestId('regularization-diagnosis')).toHaveTextContent('overfitting');
  });

  it('switches to early stopping at epoch 0, then advances one checkpoint per step', () => {
    render(<RegularizationLab locale="fr" />);
    fireEvent.click(screen.getByTestId('regularization-mode-early-stopping'));
    expect(screen.getByTestId('regularization-epoch')).toHaveTextContent(/^0$/);
    expect(screen.queryByTestId('regularization-penalty')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('regularization-step'));
    expect(screen.getByTestId('regularization-epoch')).not.toHaveTextContent(/^0$/);
  });

  it('goes back to epoch 0 on reset', () => {
    render(<RegularizationLab locale="fr" defaultMode="early-stopping" />);
    fireEvent.click(screen.getByTestId('regularization-step'));
    fireEvent.click(screen.getByTestId('regularization-step'));
    fireEvent.click(screen.getByTestId('regularization-reset'));
    expect(screen.getByTestId('regularization-epoch')).toHaveTextContent(/^0$/);
  });

  it('shows the best validation epoch in early stopping mode', () => {
    render(<RegularizationLab locale="en" defaultMode="early-stopping" />);
    expect(screen.getByTestId('regularization-best-epoch')).toHaveTextContent(/\d/);
  });

  it('exposes a polite status region without announcing every step', () => {
    render(<RegularizationLab locale="fr" defaultMode="early-stopping" />);
    const status = screen.getByRole('status');
    const before = status.textContent;
    fireEvent.click(screen.getByTestId('regularization-step'));
    expect(status.textContent).toBe(before);
    expect(document.querySelector('[aria-live]')).toBeNull();
  });

  it('exposes the mode buttons as toggle buttons that keep focus', () => {
    render(<RegularizationLab locale="fr" />);
    const penaltyButton = screen.getByTestId('regularization-mode-penalty');
    const earlyButton = screen.getByTestId('regularization-mode-early-stopping');
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(penaltyButton).toHaveAttribute('aria-pressed', 'true');
    expect(earlyButton).toHaveAttribute('aria-pressed', 'false');
    earlyButton.focus();
    fireEvent.click(earlyButton);
    expect(penaltyButton).toHaveAttribute('aria-pressed', 'false');
    expect(earlyButton).toHaveAttribute('aria-pressed', 'true');
    expect(earlyButton).toHaveFocus();
  });

  it('shows a legend naming both curves and both markers', () => {
    render(<RegularizationLab locale="en" />);
    const legend = screen.getByTestId('regularization-legend');
    expect(legend).toHaveTextContent('Training error');
    expect(legend).toHaveTextContent('Validation error');
    expect(legend).toHaveTextContent('best');
    expect(legend).toHaveTextContent('current');
  });

  it('gives the penalty slider a readable value text', () => {
    render(<RegularizationLab locale="fr" />);
    const slider = screen.getByTestId('regularization-penalty');
    expect(slider).toHaveAttribute('aria-valuetext', '0');
    fireEvent.change(slider, { target: { value: '5' } });
    expect(slider.getAttribute('aria-valuetext')).toMatch(/^10 puissance moins \d+$/);
    expect(slider.getAttribute('aria-valuetext')).not.toMatch(/[⁰-⁹⁻]/);
  });
});
