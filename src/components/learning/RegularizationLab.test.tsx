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
});
