import { readThemeColors } from '../../lib/generative/backdrop-support';
import { findPiece } from '../../lib/generative/pieces/registry';
import type { ArtConfig } from '../../lib/generative/pieces/piece';

const WARMUP_FRAMES = 220;

/** Render a piece off screen at the given resolution and trigger a PNG download. */
export function exportPieceToPng(
  pieceId: string,
  config: ArtConfig,
  width: number,
  height: number,
): void {
  const piece = findPiece(pieceId);
  if (piece === undefined) {
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) {
    return;
  }
  const colors = readThemeColors();
  const bounds = { width, height };
  context.fillStyle = colors.background;
  context.fillRect(0, 0, width, height);
  const renderer = piece.createRenderer(config, bounds, Math.random);
  let time = 0;
  for (let frame = 0; frame < WARMUP_FRAMES; frame++) {
    time += piece.timeIncrement;
    renderer.renderFrame(
      { context, bounds, colors, pointer: null, time, random: Math.random },
      config,
    );
  }
  canvas.toBlob((blob) => {
    if (blob === null) {
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `code-art-${piece.id}-${config.seed}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
