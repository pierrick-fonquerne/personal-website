import { withAlpha } from '../backdrop-support';
import {
  spawnParticle,
  stepParticle,
  type Bounds,
  type FlowFieldConfiguration,
  type Particle,
  type RandomSource,
} from '../flow-field';
import type {
  ArtConfig,
  GenerativePiece,
  ParamSpec,
  PieceFrameContext,
  PieceRenderer,
} from './piece';

const PARAMS: ParamSpec[] = [
  { key: 'particleCount', labelFr: 'Particules', labelEn: 'Particles', min: 40, max: 600, step: 10, structural: true },
  { key: 'speed', labelFr: 'Vitesse', labelEn: 'Speed', min: 0.2, max: 3, step: 0.1 },
  { key: 'noiseScale', labelFr: 'Echelle du champ', labelEn: 'Field scale', min: 0.001, max: 0.02, step: 0.001 },
  { key: 'driftSpeed', labelFr: 'Derive', labelEn: 'Drift', min: 0, max: 3, step: 0.1 },
  { key: 'pointerStrength', labelFr: 'Repulsion', labelEn: 'Repulsion', min: 0, max: 6, step: 0.2 },
  { key: 'trailFade', labelFr: 'Remanence', labelEn: 'Trail', min: 0.01, max: 0.3, step: 0.01 },
];

const DEFAULTS: Record<string, number> = {
  particleCount: 280,
  speed: 1.2,
  noiseScale: 0.005,
  driftSpeed: 0.8,
  pointerStrength: 2.6,
  trailFade: 0.05,
};

const FIXED_POINTER_RADIUS = 140;
const FIXED_RESPAWN_CHANCE = 0.004;
const ACCENT_RATIO = 0.16;
const FOREGROUND_ALPHA = 0.32;
const ACCENT_ALPHA = 0.7;
const TIME_INCREMENT = 0.0035;

function toConfiguration(config: ArtConfig): FlowFieldConfiguration {
  return {
    seed: config.seed,
    noiseScale: config.noiseScale,
    speed: config.speed,
    driftSpeed: config.driftSpeed,
    pointerRadius: FIXED_POINTER_RADIUS,
    pointerStrength: config.pointerStrength,
    respawnChance: FIXED_RESPAWN_CHANCE,
  };
}

function buildParticles(config: ArtConfig, bounds: Bounds, random: RandomSource): Particle[] {
  const count = Math.round(config.particleCount);
  return Array.from({ length: count }, (_unused, index) =>
    spawnParticle(bounds, index / count < ACCENT_RATIO, random),
  );
}

/** The flow field piece: particles drifting through a coherent noise field, with trails. */
export const flowFieldPiece: GenerativePiece = {
  id: 'flow-field',
  titleFr: 'Flow field',
  titleEn: 'Flow field',
  descriptionFr: 'Des centaines de particules suivent un champ de bruit coherent.',
  descriptionEn: 'Hundreds of particles follow a coherent noise field.',
  params: PARAMS,
  defaults: DEFAULTS,
  timeIncrement: TIME_INCREMENT,
  createRenderer(config: ArtConfig, bounds: Bounds, random: RandomSource): PieceRenderer {
    let particles = buildParticles(config, bounds, random);
    let currentBounds = bounds;
    return {
      resize(nextBounds: Bounds, nextConfig: ArtConfig, rng: RandomSource): void {
        currentBounds = nextBounds;
        particles = buildParticles(nextConfig, nextBounds, rng);
      },
      renderFrame(frame: PieceFrameContext, cfg: ArtConfig): void {
        const configuration = toConfiguration(cfg);
        const { context, colors, pointer, time, random: rng } = frame;
        context.fillStyle = withAlpha(colors.background, cfg.trailFade);
        context.fillRect(0, 0, currentBounds.width, currentBounds.height);
        context.lineWidth = 1;
        for (let index = 0; index < particles.length; index++) {
          const current = particles[index];
          const { particle: next, hasRespawned } = stepParticle(
            current,
            time,
            configuration,
            currentBounds,
            pointer,
            rng,
          );
          if (!hasRespawned) {
            context.strokeStyle = next.isAccent
              ? withAlpha(colors.accent, ACCENT_ALPHA)
              : withAlpha(colors.foreground, FOREGROUND_ALPHA);
            context.beginPath();
            context.moveTo(current.x, current.y);
            context.lineTo(next.x, next.y);
            context.stroke();
          }
          particles[index] = next;
        }
      },
    };
  },
};
