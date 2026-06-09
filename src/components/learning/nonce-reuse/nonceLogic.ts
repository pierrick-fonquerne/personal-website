export function toBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const n = Math.min(a.length, b.length);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = a[i] ^ b[i];
  return out;
}

export function streamCipher(input: Uint8Array, keystream: Uint8Array): Uint8Array {
  const out = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] ^ keystream[i % keystream.length];
  return out;
}

export function recoverOther(c1: Uint8Array, c2: Uint8Array, knownPlaintext: Uint8Array): string {
  const leaked = xorBytes(c1, c2);
  const other = xorBytes(leaked, knownPlaintext);
  return new TextDecoder().decode(other);
}
