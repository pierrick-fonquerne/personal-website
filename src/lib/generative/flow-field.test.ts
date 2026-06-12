import { describe, expect, it } from 'vitest';
import {
  dailySeed,
  fieldAngle,
  pointerRepulsion,
  spawnParticle,
  stepParticle,
  type FlowFieldConfiguration,
} from './flow-field';

const configuration: FlowFieldConfiguration = {
  seed: 20260612,
  noiseScale: 0.005,
  speed: 1.2,
  driftSpeed: 6,
  pointerRadius: 110,
  pointerStrength: 2.6,
};

const bounds = { width: 800, height: 400 };

describe('dailySeed', () => {
  it('encodes the date as YYYYMMDD', () => {
    expect(dailySeed(new Date(2026, 5, 12))).toBe(20260612);
  });
});

describe('fieldAngle', () => {
  it('is deterministic for the same position, time and configuration', () => {
    expect(fieldAngle(100, 200, 1.5, configuration)).toBe(
      fieldAngle(100, 200, 1.5, configuration),
    );
  });

  it('changes over time so the field drifts', () => {
    expect(fieldAngle(100, 200, 0, configuration)).not.toBe(
      fieldAngle(100, 200, 1, configuration),
    );
  });
});

describe('pointerRepulsion', () => {
  it('is zero at or beyond the pointer radius', () => {
    const pointer = { x: 0, y: 0 };
    const force = pointerRepulsion(configuration.pointerRadius, 0, pointer, configuration);
    expect(force.x).toBe(0);
    expect(force.y).toBe(0);
  });

  it('pushes radially away from the pointer', () => {
    const pointer = { x: 100, y: 100 };
    const force = pointerRepulsion(150, 100, pointer, configuration);
    expect(force.x).toBeGreaterThan(0);
    expect(force.y).toBeCloseTo(0, 10);
  });

  it('weakens as distance grows (linear falloff)', () => {
    const pointer = { x: 0, y: 0 };
    const near = pointerRepulsion(20, 0, pointer, configuration);
    const far = pointerRepulsion(80, 0, pointer, configuration);
    expect(near.x).toBeGreaterThan(far.x);
  });
});

describe('stepParticle', () => {
  it('moves along the field angle at configured speed', () => {
    const particle = { x: 400, y: 200, isAccent: false };
    const angle = fieldAngle(400, 200, 0.5, configuration);
    const { particle: next, hasRespawned } = stepParticle(
      particle, 0.5, configuration, bounds, null, () => 0.5,
    );
    expect(hasRespawned).toBe(false);
    expect(next.x).toBeCloseTo(400 + Math.cos(angle) * configuration.speed, 10);
    expect(next.y).toBeCloseTo(200 + Math.sin(angle) * configuration.speed, 10);
  });

  it('respawns inside the bounds when leaving them', () => {
    const particle = { x: bounds.width + 10, y: 200, isAccent: true };
    const { particle: next, hasRespawned } = stepParticle(
      particle, 0, configuration, bounds, null, () => 0.25,
    );
    expect(hasRespawned).toBe(true);
    expect(next.x).toBeGreaterThanOrEqual(0);
    expect(next.x).toBeLessThanOrEqual(bounds.width);
    expect(next.y).toBeGreaterThanOrEqual(0);
    expect(next.y).toBeLessThanOrEqual(bounds.height);
    expect(next.isAccent).toBe(true);
  });

  it('applies pointer repulsion to the velocity', () => {
    const particle = { x: 400, y: 200, isAccent: false };
    const calm = stepParticle(particle, 0.5, configuration, bounds, null, () => 0.5);
    const pushed = stepParticle(
      particle, 0.5, configuration, bounds, { x: 395, y: 200 }, () => 0.5,
    );
    expect(pushed.particle.x).toBeGreaterThan(calm.particle.x);
  });
});

describe('spawnParticle', () => {
  it('places the particle inside the bounds using the injected random source', () => {
    const particle = spawnParticle(bounds, false, () => 0.5);
    expect(particle).toEqual({ x: 400, y: 200, isAccent: false });
  });
});
