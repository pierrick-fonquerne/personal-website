import { valueNoise } from './noise';
import type { Bounds, Pointer, RandomSource } from './flow-field';

/** Configuration for a living network animation. */
export interface NetworkConfiguration {
  seed: number;
  driftSpeed: number;
  noiseScale: number;
  linkDistance: number;
  pulseSpeed: number;
  basePulseRate: number;
  pointerRadius: number;
  activationBoost: number;
  glowDecay: number;
}

/** A node drifting through the field, glowing when activated. */
export interface NetworkNode {
  x: number;
  y: number;
  noiseOffsetX: number;
  noiseOffsetY: number;
  glow: number;
}

/** A proximity link between two nodes, identified by their indices. */
export interface NetworkEdge {
  from: number;
  to: number;
  distance: number;
}

/** A pulse traveling along an edge. */
export interface NetworkPulse {
  from: number;
  to: number;
  progress: number;
}

/** Result of advancing a pulse by one frame. */
export interface PulseStepResult {
  pulse: NetworkPulse | null;
  arrivedAt: number | null;
}

const WRAP_MARGIN = 8;
const STRETCHED_EDGE_FACTOR = 1.5;
const POINTER_GLOW_STRENGTH = 0.6;

/** Place nodes at random positions inside the bounds. */
export function createNodes(
  count: number,
  bounds: Bounds,
  random: RandomSource,
): NetworkNode[] {
  return Array.from({ length: count }, () => ({
    x: random() * bounds.width,
    y: random() * bounds.height,
    noiseOffsetX: random() * 100,
    noiseOffsetY: random() * 100,
    glow: 0,
  }));
}

/**
 * Advance a node by one frame: noise driven drift, wrap around at the
 * bounds, glow decay, and pointer proximity glow. The time parameter is an
 * abstract animation clock in arbitrary units chosen by the renderer.
 */
export function stepNode(
  node: NetworkNode,
  time: number,
  configuration: NetworkConfiguration,
  bounds: Bounds,
  pointer: Pointer | null,
): NetworkNode {
  const angle =
    valueNoise(
      (node.noiseOffsetX + time) * configuration.noiseScale,
      node.noiseOffsetY * configuration.noiseScale,
      configuration.seed,
    ) * Math.PI * 4;
  let x = node.x + Math.cos(angle) * configuration.driftSpeed;
  let y = node.y + Math.sin(angle) * configuration.driftSpeed;
  if (x > bounds.width + WRAP_MARGIN) x = -WRAP_MARGIN;
  if (x < -WRAP_MARGIN) x = bounds.width + WRAP_MARGIN;
  if (y > bounds.height + WRAP_MARGIN) y = -WRAP_MARGIN;
  if (y < -WRAP_MARGIN) y = bounds.height + WRAP_MARGIN;
  let glow = Math.max(0, node.glow - configuration.glowDecay);
  if (pointer !== null) {
    const distance = Math.hypot(x - pointer.x, y - pointer.y);
    if (distance < configuration.pointerRadius) {
      const proximityGlow =
        (1 - distance / configuration.pointerRadius) * POINTER_GLOW_STRENGTH;
      glow = Math.max(glow, proximityGlow);
    }
  }
  return {
    x,
    y,
    noiseOffsetX: node.noiseOffsetX,
    noiseOffsetY: node.noiseOffsetY,
    glow,
  };
}

/** All pairs closer than linkDistance, each pair listed once (from < to). */
export function computeEdges(
  nodes: NetworkNode[],
  linkDistance: number,
): NetworkEdge[] {
  const edges: NetworkEdge[] = [];
  for (let from = 0; from < nodes.length; from++) {
    for (let to = from + 1; to < nodes.length; to++) {
      const distance = Math.hypot(nodes[from].x - nodes[to].x, nodes[from].y - nodes[to].y);
      if (distance < linkDistance) {
        edges.push({ from, to, distance });
      }
    }
  }
  return edges;
}

/**
 * Possibly emit a pulse on a random edge. The emission probability is
 * basePulseRate, multiplied by activationBoost when the edge midpoint lies
 * within pointerRadius of the pointer. Uses two draws from random: edge
 * selection then emission roll.
 */
export function maybeEmitPulse(
  edges: NetworkEdge[],
  nodes: NetworkNode[],
  pointer: Pointer | null,
  configuration: NetworkConfiguration,
  random: RandomSource,
): NetworkPulse | null {
  if (edges.length === 0) {
    return null;
  }
  const edge = edges[Math.min(edges.length - 1, Math.floor(random() * edges.length))];
  let rate = configuration.basePulseRate;
  if (pointer !== null) {
    const midpointX = (nodes[edge.from].x + nodes[edge.to].x) / 2;
    const midpointY = (nodes[edge.from].y + nodes[edge.to].y) / 2;
    const distance = Math.hypot(midpointX - pointer.x, midpointY - pointer.y);
    if (distance < configuration.pointerRadius) {
      rate *= configuration.activationBoost;
    }
  }
  if (random() < rate) {
    return { from: edge.from, to: edge.to, progress: 0 };
  }
  return null;
}

/**
 * Advance a pulse by one frame. The pulse dies silently when its edge has
 * stretched beyond linkDistance times the stretch factor, and reports the
 * arrival node index when it completes.
 */
export function stepPulse(
  pulse: NetworkPulse,
  nodes: NetworkNode[],
  configuration: NetworkConfiguration,
): PulseStepResult {
  const distance = Math.hypot(
    nodes[pulse.from].x - nodes[pulse.to].x,
    nodes[pulse.from].y - nodes[pulse.to].y,
  );
  if (distance > configuration.linkDistance * STRETCHED_EDGE_FACTOR) {
    return { pulse: null, arrivedAt: null };
  }
  const progress = pulse.progress + configuration.pulseSpeed;
  if (progress >= 1) {
    return { pulse: null, arrivedAt: pulse.to };
  }
  return { pulse: { from: pulse.from, to: pulse.to, progress }, arrivedAt: null };
}
