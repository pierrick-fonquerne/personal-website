// src/lib/generative/pieces/piece.ts
import type { ThemeColors } from '../backdrop-support';
import type { Bounds, Pointer, RandomSource } from '../flow-field';

/** One playable parameter of a generative piece: drives a slider, the URL and the random draw. */
export interface ParamSpec {
  key: string;
  labelFr: string;
  labelEn: string;
  min: number;
  max: number;
  step: number;
  /** When true, changing this value rebuilds the simulation state (counts). */
  structural?: boolean;
}

/** A flat numeric configuration: the daily or shared seed plus one entry per ParamSpec. */
export interface ArtConfig {
  seed: number;
  [key: string]: number;
}

/** Everything a piece needs to draw one frame, injected by the renderer host. */
export interface PieceFrameContext {
  context: CanvasRenderingContext2D;
  bounds: Bounds;
  colors: ThemeColors;
  pointer: Pointer | null;
  time: number;
  random: RandomSource;
}

/** Stateful renderer for a single piece instance; owns its simulation state in a closure. */
export interface PieceRenderer {
  resize(bounds: Bounds, config: ArtConfig, random: RandomSource): void;
  renderFrame(frame: PieceFrameContext, config: ArtConfig): void;
}

/** A generative piece: metadata, its playable parameters, and a renderer factory. */
export interface GenerativePiece {
  id: string;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  params: ParamSpec[];
  defaults: Record<string, number>;
  timeIncrement: number;
  createRenderer(config: ArtConfig, bounds: Bounds, random: RandomSource): PieceRenderer;
}
