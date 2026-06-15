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
  respawnChance: 0,
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

  it('drifts spatially rather than as a global phase rotation: angle differences between fixed points evolve over time', () => {
    const differenceEarly =
      fieldAngle(100, 200, 0, configuration) - fieldAngle(300, 250, 0, configuration);
    const differenceLate =
      fieldAngle(100, 200, 2, configuration) - fieldAngle(300, 250, 2, configuration);
    expect(differenceEarly).not.toBeCloseTo(differenceLate, 5);
  });

  it('is spatially continuous: neighboring points give close angles', () => {
    for (let i = 0; i < 200; i++) {
      const x = i * 3.7;
      const y = i * 1.9;
      const delta = Math.abs(
        fieldAngle(x + 1, y, 0.5, configuration) - fieldAngle(x, y, 0.5, configuration),
      );
      expect(delta).toBeLessThan(0.5);
    }
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

  it('is zero when the particle nearly coincides with the pointer', () => {
    const pointer = { x: 100, y: 100 };
    const force = pointerRepulsion(100.0001, 100, pointer, configuration);
    expect(force.x).toBe(0);
    expect(force.y).toBe(0);
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

  it('respawns over time with a small per-frame probability, even while inside the bounds', () => {
    const particle = { x: 400, y: 200, isAccent: true };
    const aging: FlowFieldConfiguration = { ...configuration, respawnChance: 0.01 };
    const { particle: next, hasRespawned } = stepParticle(
      particle, 0.5, aging, bounds, null, () => 0.0001,
    );
    expect(hasRespawned).toBe(true);
    expect(next.isAccent).toBe(true);
    expect(next.x).toBeGreaterThanOrEqual(0);
    expect(next.x).toBeLessThanOrEqual(bounds.width);
  });

  it('stays alive when the lifespan draw is above the respawn chance', () => {
    const particle = { x: 400, y: 200, isAccent: false };
    const aging: FlowFieldConfiguration = { ...configuration, respawnChance: 0.01 };
    const { hasRespawned } = stepParticle(particle, 0.5, aging, bounds, null, () => 0.99);
    expect(hasRespawned).toBe(false);
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
