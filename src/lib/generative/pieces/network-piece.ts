import { withAlpha } from '../backdrop-support';
import type { Bounds, RandomSource } from '../flow-field';
import {
  computeEdges,
  createNodes,
  maybeEmitPulse,
  stepNode,
  stepPulse,
  type NetworkConfiguration,
  type NetworkNode,
  type NetworkPulse,
} from '../network';
import type {
  ArtConfig,
  GenerativePiece,
  ParamSpec,
  PieceFrameContext,
  PieceRenderer,
} from './piece';

const PARAMS: ParamSpec[] = [
  { key: 'nodeCount', labelFr: 'Nœuds', labelEn: 'Nodes', min: 15, max: 140, step: 5, structural: true },
  { key: 'linkDistance', labelFr: 'Distance de lien', labelEn: 'Link distance', min: 30, max: 160, step: 5 },
  { key: 'driftSpeed', labelFr: 'Dérive', labelEn: 'Drift', min: 0.05, max: 1.5, step: 0.05 },
  { key: 'pulseSpeed', labelFr: "Vitesse d'impulsion", labelEn: 'Pulse speed', min: 0.01, max: 0.12, step: 0.01 },
  { key: 'basePulseRate', labelFr: 'Fréquence', labelEn: 'Pulse rate', min: 0.002, max: 0.08, step: 0.002 },
  { key: 'glowDecay', labelFr: 'Persistance lueur', labelEn: 'Glow decay', min: 0.005, max: 0.05, step: 0.005 },
];

const DEFAULTS: Record<string, number> = {
  nodeCount: 60,
  linkDistance: 70,
  driftSpeed: 0.35,
  pulseSpeed: 0.04,
  basePulseRate: 0.02,
  glowDecay: 0.015,
};

const FIXED_POINTER_RADIUS = 120;
const FIXED_ACTIVATION_BOOST = 8;
const NOISE_SCALE = 1;
const EDGE_ALPHA = 0.35;
const NODE_ALPHA = 0.6;
const PULSE_ALPHA = 0.95;
const GLOW_ALPHA = 0.95;
const EMISSION_ATTEMPTS = 3;
const TIME_INCREMENT = 0.0016;

function toConfiguration(config: ArtConfig): NetworkConfiguration {
  return {
    seed: config.seed,
    driftSpeed: config.driftSpeed,
    noiseScale: NOISE_SCALE,
    linkDistance: config.linkDistance,
    pulseSpeed: config.pulseSpeed,
    basePulseRate: config.basePulseRate,
    pointerRadius: FIXED_POINTER_RADIUS,
    activationBoost: FIXED_ACTIVATION_BOOST,
    glowDecay: config.glowDecay,
  };
}

/** The living network piece: drifting nodes, proximity links and traveling pulses. */
export const networkPiece: GenerativePiece = {
  id: 'network',
  titleFr: 'Réseau vivant',
  titleEn: 'Living network',
  descriptionFr: 'Des nœuds dérivent, se relient et échangent des impulsions.',
  descriptionEn: 'Nodes drift, link up and exchange pulses.',
  params: PARAMS,
  defaults: DEFAULTS,
  timeIncrement: TIME_INCREMENT,
  createRenderer(config: ArtConfig, bounds: Bounds, random: RandomSource): PieceRenderer {
    let nodes: NetworkNode[] = createNodes(Math.round(config.nodeCount), bounds, random);
    let pulses: NetworkPulse[] = [];
    let currentBounds = bounds;
    return {
      resize(nextBounds: Bounds, nextConfig: ArtConfig, rng: RandomSource): void {
        currentBounds = nextBounds;
        nodes = createNodes(Math.round(nextConfig.nodeCount), nextBounds, rng);
        pulses = [];
      },
      renderFrame(frame: PieceFrameContext, cfg: ArtConfig): void {
        const configuration = toConfiguration(cfg);
        const { context, colors, pointer, time, random: rng } = frame;
        context.fillStyle = colors.background;
        context.fillRect(0, 0, currentBounds.width, currentBounds.height);

        for (let index = 0; index < nodes.length; index++) {
          nodes[index] = stepNode(nodes[index], time, configuration, currentBounds, pointer);
        }

        const edges = computeEdges(nodes, configuration.linkDistance);
        context.lineWidth = 1;
        for (const edge of edges) {
          const closeness = 1 - edge.distance / configuration.linkDistance;
          context.strokeStyle = withAlpha(colors.foreground, closeness * EDGE_ALPHA);
          context.beginPath();
          context.moveTo(nodes[edge.from].x, nodes[edge.from].y);
          context.lineTo(nodes[edge.to].x, nodes[edge.to].y);
          context.stroke();
        }

        for (let attempt = 0; attempt < EMISSION_ATTEMPTS; attempt++) {
          const emitted = maybeEmitPulse(edges, nodes, pointer, configuration, rng);
          if (emitted !== null) {
            pulses.push(emitted);
          }
        }

        const survivors: NetworkPulse[] = [];
        for (const pulse of pulses) {
          const result = stepPulse(pulse, nodes, configuration);
          if (result.arrivedAt !== null) {
            nodes[result.arrivedAt] = { ...nodes[result.arrivedAt], glow: 1 };
          }
          if (result.pulse !== null) {
            survivors.push(result.pulse);
            const fromNode = nodes[result.pulse.from];
            const toNode = nodes[result.pulse.to];
            const x = fromNode.x + (toNode.x - fromNode.x) * result.pulse.progress;
            const y = fromNode.y + (toNode.y - fromNode.y) * result.pulse.progress;
            context.fillStyle = withAlpha(colors.accent, PULSE_ALPHA);
            context.beginPath();
            context.arc(x, y, 2.4, 0, Math.PI * 2);
            context.fill();
          }
        }
        pulses = survivors;

        for (const node of nodes) {
          if (node.glow > 0) {
            context.fillStyle = withAlpha(colors.accent, node.glow * GLOW_ALPHA);
            context.beginPath();
            context.arc(node.x, node.y, 3, 0, Math.PI * 2);
            context.fill();
          } else {
            context.fillStyle = withAlpha(colors.foreground, NODE_ALPHA);
            context.beginPath();
            context.arc(node.x, node.y, 2, 0, Math.PI * 2);
            context.fill();
          }
        }
      },
    };
  },
};
