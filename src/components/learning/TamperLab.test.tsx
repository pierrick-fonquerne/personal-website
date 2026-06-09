import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TamperLab from './TamperLab';

const labels = {
  message: 'Message',
  flip: 'Inverser un bit',
  reset: 'Reinitialiser',
  modeSimple: 'Chiffrement simple',
  modeAead: 'AEAD',
  intact: 'Intact',
  outputLabel: 'Resultat',
  rejected: 'Ouverture refusee : tag invalide',
  defaultMessage: 'transfer 100',
};

describe('TamperLab', () => {
  it('shows the decrypted message intact at start', () => {
    render(<TamperLab labels={labels} />);
    expect(screen.getByTestId('tamper-output')).toHaveTextContent('transfer 100');
  });

  it('in simple mode, flipping a bit changes the output without rejection', () => {
    render(<TamperLab labels={labels} />);
    fireEvent.click(screen.getByTestId('tamper-flip'));
    const output = screen.getByTestId('tamper-output');
    expect(output).not.toHaveTextContent('transfer 100');
    expect(output).not.toHaveTextContent(labels.rejected);
  });

  it('in aead mode, flipping a bit rejects the open', () => {
    render(<TamperLab labels={labels} />);
    fireEvent.click(screen.getByTestId('tamper-mode-aead'));
    fireEvent.click(screen.getByTestId('tamper-flip'));
    expect(screen.getByTestId('tamper-output')).toHaveTextContent(labels.rejected);
  });
});
