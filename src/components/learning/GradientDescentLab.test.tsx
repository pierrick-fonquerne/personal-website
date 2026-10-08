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
});
