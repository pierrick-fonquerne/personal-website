import { describe, expect, it } from 'vitest';
import {
  computeEdges,
  createNodes,
  maybeEmitPulse,
  stepNode,
  stepPulse,
  type NetworkConfiguration,
  type NetworkNode,
} from './network';

const configuration: NetworkConfiguration = {
  seed: 20260612,
  driftSpeed: 0.35,
  noiseScale: 1,
  linkDistance: 70,
  pulseSpeed: 0.04,
  basePulseRate: 0.002,
  pointerRadius: 120,
  activationBoost: 8,
  glowDecay: 0.015,
};

const bounds = { width: 800, height: 600 };

function nodeAt(x: number, y: number, glow = 0): NetworkNode {
  return { x, y, noiseOffsetX: 10, noiseOffsetY: 20, glow };
}

describe('createNodes', () => {
  it('places every node inside the bounds with the injected random source', () => {
    const nodes = createNodes(5, bounds, () => 0.5);
    expect(nodes).toHaveLength(5);
    for (const node of nodes) {
      expect(node.x).toBe(400);
      expect(node.y).toBe(300);
      expect(node.glow).toBe(0);
    }
  });
});

describe('stepNode', () => {
  it('drifts deterministically for the same inputs', () => {
    const node = nodeAt(100, 100);
    const first = stepNode(node, 1.5, configuration, bounds, null);
    const second = stepNode(node, 1.5, configuration, bounds, null);
    expect(first).toEqual(second);
  });

  it('moves the node by driftSpeed', () => {
    const node = nodeAt(400, 300);
    const next = stepNode(node, 0.5, configuration, bounds, null);
    const distance = Math.hypot(next.x - node.x, next.y - node.y);
    expect(distance).toBeCloseTo(configuration.driftSpeed, 10);
  });

  it('wraps around the bounds instead of leaving them', () => {
    const beyondRight = stepNode(nodeAt(bounds.width + 9, 300), 0, configuration, bounds, null);
    expect(beyondRight.x).toBeLessThan(0);
    const beyondTop = stepNode(nodeAt(400, -9), 0, configuration, bounds, null);
    expect(beyondTop.y).toBeGreaterThan(bounds.height);
  });

  it('decays the glow over time', () => {
    const node = nodeAt(400, 300, 1);
    const next = stepNode(node, 0.5, configuration, bounds, null);
    expect(next.glow).toBeCloseTo(1 - configuration.glowDecay, 10);
  });

  it('lights up nodes near the pointer', () => {
    const node = nodeAt(400, 300);
    const next = stepNode(node, 0.5, configuration, bounds, { x: 400, y: 310 });
    expect(next.glow).toBeGreaterThan(0.4);
  });

  it('ignores a pointer beyond the activation radius', () => {
    const node = nodeAt(100, 100);
    const next = stepNode(node, 0.5, configuration, bounds, { x: 700, y: 500 });
    expect(next.glow).toBe(0);
  });
});

describe('computeEdges', () => {
  it('links only pairs closer than linkDistance, without duplicates', () => {
    const nodes = [nodeAt(0, 0), nodeAt(50, 0), nodeAt(500, 0)];
    const edges = computeEdges(nodes, configuration.linkDistance);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toEqual({ from: 0, to: 1, distance: 50 });
  });
});

describe('maybeEmitPulse', () => {
  const nodes = [nodeAt(100, 100), nodeAt(150, 100)];
  const edges = computeEdges(nodes, configuration.linkDistance);

  it('emits nothing when there are no edges', () => {
    expect(maybeEmitPulse([], nodes, null, configuration, () => 0)).toBeNull();
  });

  it('emits rarely at base rate', () => {
    const roll = configuration.basePulseRate * 2;
    const sequence = [0, roll];
    let index = 0;
    const random = () => sequence[index++] ?? 0;
    expect(maybeEmitPulse(edges, nodes, null, configuration, random)).toBeNull();
  });

  it('boosts emission for edges near the pointer', () => {
    const roll = configuration.basePulseRate * 2;
    const sequence = [0, roll];
    let index = 0;
    const random = () => sequence[index++] ?? 0;
    const pointer = { x: 125, y: 100 };
    const pulse = maybeEmitPulse(edges, nodes, pointer, configuration, random);
    expect(pulse).toEqual({ from: 0, to: 1, progress: 0 });
  });
});

describe('stepPulse', () => {
  it('progresses along the edge', () => {
    const nodes = [nodeAt(100, 100), nodeAt(150, 100)];
    const result = stepPulse({ from: 0, to: 1, progress: 0.5 }, nodes, configuration);
    expect(result.pulse?.progress).toBeCloseTo(0.5 + configuration.pulseSpeed, 10);
    expect(result.arrivedAt).toBeNull();
  });

  it('reports the arrival node when the progress completes', () => {
    const nodes = [nodeAt(100, 100), nodeAt(150, 100)];
    const result = stepPulse({ from: 0, to: 1, progress: 0.99 }, nodes, configuration);
    expect(result.pulse).toBeNull();
    expect(result.arrivedAt).toBe(1);
  });

  it('dies silently when its edge has stretched too far', () => {
    const nodes = [nodeAt(0, 0), nodeAt(300, 0)];
    const result = stepPulse({ from: 0, to: 1, progress: 0.5 }, nodes, configuration);
    expect(result.pulse).toBeNull();
    expect(result.arrivedAt).toBeNull();
  });
});
