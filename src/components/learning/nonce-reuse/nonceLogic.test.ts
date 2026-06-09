import { describe, it, expect } from 'vitest';
import { toBytes, xorBytes, streamCipher, recoverOther } from './nonceLogic';

const keystream = toBytes('same-nonce-same-key-keystream-block');

describe('nonce reuse leak', () => {
  it('xor of two ciphertexts equals xor of two plaintexts', () => {
    const p1 = toBytes('hello world aaa');
    const p2 = toBytes('attack at dawn!');
    const c1 = streamCipher(p1, keystream);
    const c2 = streamCipher(p2, keystream);
    expect(Array.from(xorBytes(c1, c2))).toEqual(Array.from(xorBytes(p1, p2)));
  });

  it('recovers the second plaintext when the first is known', () => {
    const p1 = toBytes('hello world aaa');
    const p2 = toBytes('attack at dawn!');
    const c1 = streamCipher(p1, keystream);
    const c2 = streamCipher(p2, keystream);
    expect(recoverOther(c1, c2, p1)).toBe('attack at dawn!');
  });
});
