/** Deterministic integer hash mapped to [0, 1]. ix, iy and seed are expected to be integers. */
function hashCoordinates(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695040);
  h = Math.imul(h ^ (h >> 13), 1274126177);
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967295;
}

/** Cubic Hermite smoothstep: zero derivative at both endpoints. */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Coherent value noise in [0, 1]: random but continuous, the organic core of the field. */
export function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const a = hashCoordinates(ix, iy, seed);
  const b = hashCoordinates(ix + 1, iy, seed);
  const c = hashCoordinates(ix, iy + 1, seed);
  const d = hashCoordinates(ix + 1, iy + 1, seed);
  const ux = smoothstep(fx);
  const uy = smoothstep(fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
