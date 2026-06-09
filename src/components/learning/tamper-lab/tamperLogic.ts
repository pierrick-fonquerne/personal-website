export function toBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function toText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function streamCipher(input: Uint8Array, key: Uint8Array): Uint8Array {
  const out = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) {
    out[i] = input[i] ^ key[i % key.length];
  }
  return out;
}

export function flipBit(input: Uint8Array, bitIndex: number): Uint8Array {
  const out = input.slice();
  const byte = Math.floor(bitIndex / 8);
  const bit = bitIndex % 8;
  out[byte] = out[byte] ^ (1 << bit);
  return out;
}

export function computeTag(ciphertext: Uint8Array, key: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash = Math.imul(hash ^ key[i], 0x01000193) >>> 0;
  }
  for (let i = 0; i < ciphertext.length; i++) {
    hash = Math.imul(hash ^ ciphertext[i], 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function aeadOpen(
  ciphertext: Uint8Array,
  tag: number,
  key: Uint8Array,
): string | null {
  if (computeTag(ciphertext, key) !== tag) return null;
  return toText(streamCipher(ciphertext, key));
}
