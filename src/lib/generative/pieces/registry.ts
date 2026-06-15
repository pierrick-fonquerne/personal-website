import { flowFieldPiece } from './flow-field-piece';
import { networkPiece } from './network-piece';
import type { GenerativePiece } from './piece';

/** Ordered list of playable pieces, the single source for gallery and atelier. */
export const PIECES: GenerativePiece[] = [flowFieldPiece, networkPiece];

/** Resolve a piece by its id, or undefined when no piece matches. */
export function findPiece(id: string | undefined): GenerativePiece | undefined {
  return PIECES.find((piece) => piece.id === id);
}
