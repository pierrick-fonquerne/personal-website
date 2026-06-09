import { useState, type JSX } from 'react';
import { toBytes, toText, streamCipher, flipBit, computeTag, aeadOpen } from './tamper-lab/tamperLogic';

export interface TamperLabLabels {
  message: string;
  flip: string;
  reset: string;
  modeSimple: string;
  modeAead: string;
  intact: string;
  outputLabel: string;
  rejected: string;
  defaultMessage: string;
}

interface Props {
  labels: TamperLabLabels;
}

const KEY = toBytes('demo-keystream-key-2026');

export default function TamperLab({ labels }: Props): JSX.Element {
  const plaintext = toBytes(labels.defaultMessage);
  const baseCipher = streamCipher(plaintext, KEY);
  const baseTag = computeTag(baseCipher, KEY);

  const [cipher, setCipher] = useState<Uint8Array>(baseCipher);
  const [mode, setMode] = useState<'simple' | 'aead'>('simple');

  const handleFlip = (): void => {
    const bitIndex = cipher.length > 1 ? 8 : 0;
    setCipher(flipBit(cipher, bitIndex));
  };

  const handleReset = (): void => setCipher(baseCipher);

  let output: string;
  if (mode === 'aead') {
    const opened = aeadOpen(cipher, baseTag, KEY);
    output = opened === null ? labels.rejected : opened;
  } else {
    output = toText(streamCipher(cipher, KEY));
  }

  return (
    <div className="my-4 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-4">
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          data-testid="tamper-mode-simple"
          onClick={() => setMode('simple')}
          className={mode === 'simple' ? 'font-medium text-[var(--color-accent)]' : 'text-[var(--color-fg-muted)]'}
        >
          {labels.modeSimple}
        </button>
        <button
          type="button"
          data-testid="tamper-mode-aead"
          onClick={() => setMode('aead')}
          className={mode === 'aead' ? 'font-medium text-[var(--color-accent)]' : 'text-[var(--color-fg-muted)]'}
        >
          {labels.modeAead}
        </button>
      </div>
      <div className="mb-2 font-mono text-[12px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
        {labels.outputLabel}
      </div>
      <div data-testid="tamper-output" className="mb-3 font-mono text-[14px] text-[var(--color-fg)]">
        {output}
      </div>
      <div className="flex gap-2">
        <button type="button" data-testid="tamper-flip" onClick={handleFlip} className="rounded border border-[var(--color-line)] px-3 py-1">
          {labels.flip}
        </button>
        <button type="button" data-testid="tamper-reset" onClick={handleReset} className="rounded border border-[var(--color-line)] px-3 py-1">
          {labels.reset}
        </button>
      </div>
    </div>
  );
}
