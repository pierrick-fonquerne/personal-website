import { describe, expect, it } from 'vitest';
import { edgeLit } from './BackpropStepper';

// Node indices, matching the NODES table in BackpropStepper.tsx:
// 0,1 = input (x1, x2) ; 2,3 = hidden (h1, h2) ; 4 = output (y hat).
const INPUT_TO_HIDDEN: readonly (readonly [number, number])[] = [
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
];
const HIDDEN_TO_OUTPUT: readonly (readonly [number, number])[] = [
  [2, 4],
  [3, 4],
];

describe('edgeLit', () => {
  it('lights the input-to-hidden edges when the hidden layer is highlighted during the forward pass', () => {
    for (const [from, to] of INPUT_TO_HIDDEN) {
      expect(edgeLit(from, to, 'hidden', 'forward')).toBe(true);
    }
  });

  it('does not use the same edges for the hidden layer during the backward pass', () => {
    // This is the actual regression: the backward branch used to be a
    // byte-for-byte copy of the forward one, so propagation direction was
    // never visually distinguished.
    const forwardLit = INPUT_TO_HIDDEN.map(([from, to]) => edgeLit(from, to, 'hidden', 'forward'));
    const backwardLit = INPUT_TO_HIDDEN.map(([from, to]) =>
      edgeLit(from, to, 'hidden', 'backward'),
    );
    expect(backwardLit).not.toEqual(forwardLit);
  });

  it('lights the hidden-to-output edges (not the input-to-hidden ones) when the hidden layer is highlighted during the backward pass', () => {
    for (const [from, to] of HIDDEN_TO_OUTPUT) {
      expect(edgeLit(from, to, 'hidden', 'backward')).toBe(true);
    }
    for (const [from, to] of INPUT_TO_HIDDEN) {
      expect(edgeLit(from, to, 'hidden', 'backward')).toBe(false);
    }
  });

  it('still lights the hidden-to-output edges when the output layer is highlighted, forward or backward', () => {
    for (const [from, to] of HIDDEN_TO_OUTPUT) {
      expect(edgeLit(from, to, 'output', 'forward')).toBe(true);
      expect(edgeLit(from, to, 'output', 'backward')).toBe(true);
    }
  });

  it('returns false for an out-of-range node index', () => {
    expect(edgeLit(-1, 2, 'hidden', 'forward')).toBe(false);
    expect(edgeLit(0, 99, 'hidden', 'backward')).toBe(false);
  });
});
