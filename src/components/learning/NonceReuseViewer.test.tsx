import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NonceReuseViewer from './NonceReuseViewer';

const labels = {
  plaintext1: 'Message 1',
  plaintext2: 'Message 2',
  ciphertextXor: 'XOR des chiffres',
  recovered: 'Message 2 reconstruit (Message 1 suppose connu)',
  default1: 'hello world',
  default2: 'attack dawn',
};

describe('NonceReuseViewer', () => {
  it('reconstructs message 2 from message 1', () => {
    render(<NonceReuseViewer labels={labels} />);
    expect(screen.getByTestId('nonce-recovered')).toHaveTextContent('attack dawn');
  });

  it('updates the reconstruction when message 2 changes', () => {
    render(<NonceReuseViewer labels={labels} />);
    fireEvent.change(screen.getByTestId('nonce-input-2'), { target: { value: 'secret text' } });
    expect(screen.getByTestId('nonce-recovered')).toHaveTextContent('secret text');
  });
});
