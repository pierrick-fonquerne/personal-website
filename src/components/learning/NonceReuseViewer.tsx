import { useState, type JSX } from 'react';
import { toBytes, xorBytes, streamCipher, recoverOther } from './nonce-reuse/nonceLogic';

export interface NonceReuseLabels {
  plaintext1: string;
  plaintext2: string;
  ciphertextXor: string;
  recovered: string;
  default1: string;
  default2: string;
}

interface Props {
  labels: NonceReuseLabels;
}

const KEYSTREAM = toBytes('reused-nonce-fixed-keystream-block-xx');

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
}

export default function NonceReuseViewer({ labels }: Props): JSX.Element {
  const [p1, setP1] = useState(labels.default1);
  const [p2, setP2] = useState(labels.default2);

  const b1 = toBytes(p1);
  const b2 = toBytes(p2);
  const c1 = streamCipher(b1, KEYSTREAM);
  const c2 = streamCipher(b2, KEYSTREAM);
  const recovered = recoverOther(c1, c2, b1);

  return (
    <div className="my-4 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-4">
      <label className="mb-1 block font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
        {labels.plaintext1}
      </label>
      <input
        data-testid="nonce-input-1"
        value={p1}
        onChange={(e) => setP1(e.target.value)}
        className="mb-3 w-full rounded border border-[var(--color-line)] bg-transparent px-2 py-1 font-mono text-[13px]"
      />
      <label className="mb-1 block font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
        {labels.plaintext2}
      </label>
      <input
        data-testid="nonce-input-2"
        value={p2}
        onChange={(e) => setP2(e.target.value)}
        className="mb-3 w-full rounded border border-[var(--color-line)] bg-transparent px-2 py-1 font-mono text-[13px]"
      />
      <div className="mb-1 font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
        {labels.ciphertextXor}
      </div>
      <div className="mb-3 font-mono text-[12px] break-all text-[var(--color-fg-dim)]">
        {toHex(xorBytes(c1, c2))}
      </div>
      <div className="mb-1 font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] uppercase">
        {labels.recovered}
      </div>
      <div data-testid="nonce-recovered" className="font-mono text-[14px] text-[var(--color-accent)]">
        {recovered}
      </div>
    </div>
  );
}
