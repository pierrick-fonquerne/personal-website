import { describe, it, expect } from 'vitest';
import {
  toBytes, toText, streamCipher, flipBit, computeTag, aeadOpen,
} from './tamperLogic';

const key = toBytes('keystream-secret-key');

describe('streamCipher', () => {
  it('round-trips plaintext (XOR is its own inverse)', () => {
    const pt = toBytes('attack at dawn');
    const ct = streamCipher(pt, key);
    expect(toText(streamCipher(ct, key))).toBe('attack at dawn');
  });
});

describe('flipBit', () => {
  it('flips exactly one bit', () => {
    const bytes = toBytes('A'); // 0x41
    const flipped = flipBit(bytes, 0);
    let diff = 0;
    for (let b = 0; b < 8; b++) {
      if (((bytes[0] >> b) & 1) !== ((flipped[0] >> b) & 1)) diff++;
    }
    expect(diff).toBe(1);
  });
});

describe('unauthenticated tampering', () => {
  it('silently changes the decrypted plaintext', () => {
    const pt = toBytes('transfer 100');
    const ct = streamCipher(pt, key);
    const tampered = flipBit(ct, 8); // touche le 2e octet
    const out = toText(streamCipher(tampered, key));
    expect(out).not.toBe('transfer 100');
    expect(out.length).toBe(pt.length);
  });
});

describe('aeadOpen', () => {
  it('returns the plaintext when ciphertext is intact', () => {
    const pt = toBytes('transfer 100');
    const ct = streamCipher(pt, key);
    const tag = computeTag(ct, key);
    expect(aeadOpen(ct, tag, key)).toBe('transfer 100');
  });

  it('returns null when the ciphertext is tampered', () => {
    const pt = toBytes('transfer 100');
    const ct = streamCipher(pt, key);
    const tag = computeTag(ct, key);
    const tampered = flipBit(ct, 8);
    expect(aeadOpen(tampered, tag, key)).toBeNull();
  });
});
