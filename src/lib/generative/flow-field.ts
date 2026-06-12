import { valueNoise } from './noise';

/** Configuration for a flow field animation. */
export interface FlowFieldConfiguration {
  seed: number;
  noiseScale: number;
  speed: number;
  driftSpeed: number;
  pointerRadius: number;
  pointerStrength: number;
}

/** A single particle moving through the field. */
export interface Particle {
  x: number;
  y: number;
  isAccent: boolean;
}

/** Canvas or viewport dimensions. */
export interface Bounds {
  width: number;
  height: number;
}

/** Cursor or touch position in canvas space. */
export interface Pointer {
  x: number;
  y: number;
}

/** 2D vector used for velocity and force calculations. */
export interface Vector2 {
  x: number;
  y: number;
}

/** Return value of stepParticle: the updated particle and a respawn flag. */
export interface StepResult {
  particle: Particle;
  hasRespawned: boolean;
}

/** Injected randomness source, keeping the engine pure and deterministically testable. */
export type RandomSource = () => number;

const OUT_OF_BOUNDS_MARGIN = 4;
const POINTER_DISTANCE_EPSILON = 0.5;

/** Same field for every visitor on a given day: the artwork changes daily. */
export function dailySeed(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/**
 * Direction of the flow at a point, drifting slowly over time.
 *
 * The `time` parameter is an abstract animation clock in arbitrary units.
 * The renderer chooses the per-frame increment passed here; `driftSpeed`
 * converts it to angular drift in radians.
 */
export function fieldAngle(
  x: number,
  y: number,
  time: number,
  configuration: FlowFieldConfiguration,
): number {
  const noise = valueNoise(
    x * configuration.noiseScale,
    y * configuration.noiseScale,
    configuration.seed,
  );
  return noise * Math.PI * 4 + time * configuration.driftSpeed;
}

/** Radial push away from the pointer, fading linearly to zero at the radius. */
export function pointerRepulsion(
  x: number,
  y: number,
  pointer: Pointer,
  configuration: FlowFieldConfiguration,
): Vector2 {
  const dx = x - pointer.x;
  const dy = y - pointer.y;
  const distance = Math.hypot(dx, dy);
  if (distance < POINTER_DISTANCE_EPSILON || distance >= configuration.pointerRadius) {
    return { x: 0, y: 0 };
  }
  const falloff = 1 - distance / configuration.pointerRadius;
  const scale = (configuration.pointerStrength * falloff) / distance;
  return { x: dx * scale, y: dy * scale };
}

/** Place a new particle at a random position within the bounds. */
export function spawnParticle(
  bounds: Bounds,
  isAccent: boolean,
  random: RandomSource,
): Particle {
  return {
    x: random() * bounds.width,
    y: random() * bounds.height,
    isAccent,
  };
}

/**
 * Advance a particle by one frame, respawning it when it leaves the bounds.
 *
 * The `time` parameter is an abstract animation clock in arbitrary units.
 * The renderer chooses the per-frame increment passed here; `driftSpeed`
 * converts it to angular drift in radians.
 */
export function stepParticle(
  particle: Particle,
  time: number,
  configuration: FlowFieldConfiguration,
  bounds: Bounds,
  pointer: Pointer | null,
  random: RandomSource,
): StepResult {
  const angle = fieldAngle(particle.x, particle.y, time, configuration);
  let velocityX = Math.cos(angle) * configuration.speed;
  let velocityY = Math.sin(angle) * configuration.speed;
  if (pointer !== null) {
    const repulsion = pointerRepulsion(particle.x, particle.y, pointer, configuration);
    velocityX += repulsion.x;
    velocityY += repulsion.y;
  }
  const next: Particle = {
    x: particle.x + velocityX,
    y: particle.y + velocityY,
    isAccent: particle.isAccent,
  };
  if (isOutOfBounds(next, bounds)) {
    return { particle: spawnParticle(bounds, particle.isAccent, random), hasRespawned: true };
  }
  return { particle: next, hasRespawned: false };
}

function isOutOfBounds(particle: Particle, bounds: Bounds): boolean {
  return (
    particle.x < -OUT_OF_BOUNDS_MARGIN ||
    particle.x > bounds.width + OUT_OF_BOUNDS_MARGIN ||
    particle.y < -OUT_OF_BOUNDS_MARGIN ||
    particle.y > bounds.height + OUT_OF_BOUNDS_MARGIN
  );
}
