import type { RandomSource } from '../flow-field';
import type { ArtConfig, ParamSpec } from './piece';

/** Build a configuration from the piece defaults and a seed. */
export function defaultConfig(
  params: ParamSpec[],
  defaults: Record<string, number>,
  seed: number,
): ArtConfig {
  const config: ArtConfig = { seed };
  for (const param of params) {
    config[param.key] = defaults[param.key];
  }
  return config;
}

/** Clamp a value to the inclusive [min, max] range of a parameter. */
export function clampToSpec(value: number, spec: ParamSpec): number {
  return Math.min(spec.max, Math.max(spec.min, value));
}

/** Serialize a configuration to a URL query string. */
export function encodeConfig(config: ArtConfig, params: ParamSpec[]): string {
  const search = new URLSearchParams();
  search.set('seed', String(config.seed));
  for (const param of params) {
    search.set(param.key, String(config[param.key]));
  }
  return search.toString();
}

/** Parse a URL query string into a configuration, clamping and falling back as needed. */
export function decodeConfig(
  query: string,
  params: ParamSpec[],
  defaults: Record<string, number>,
  fallbackSeed: number,
): ArtConfig {
  const search = new URLSearchParams(query);
  const seedRaw = search.get('seed');
  const seedParsed = seedRaw === null ? Number.NaN : Number(seedRaw);
  const config: ArtConfig = { seed: Number.isFinite(seedParsed) ? seedParsed : fallbackSeed };
  for (const param of params) {
    const raw = search.get(param.key);
    const parsed = raw === null ? Number.NaN : Number(raw);
    config[param.key] = Number.isFinite(parsed) ? clampToSpec(parsed, param) : defaults[param.key];
  }
  return config;
}

/** Count the decimal places of a step, so random values can be snapped cleanly. */
function decimalPlaces(value: number): number {
  const text = String(value);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

/** Draw a random configuration within the parameter bounds, snapped to each step grid. */
export function randomConfig(
  params: ParamSpec[],
  random: RandomSource,
  seed: number,
): ArtConfig {
  const config: ArtConfig = { seed };
  for (const param of params) {
    const steps = Math.round((param.max - param.min) / param.step);
    const index = Math.min(steps, Math.floor(random() * (steps + 1)));
    const raw = param.min + index * param.step;
    const snapped = Number(raw.toFixed(decimalPlaces(param.step)));
    config[param.key] = clampToSpec(snapped, param);
  }
  return config;
}

/** Pick a fresh integer seed for the "surprise me" action. */
export function randomSeed(random: RandomSource): number {
  return Math.floor(random() * 100000000);
}
