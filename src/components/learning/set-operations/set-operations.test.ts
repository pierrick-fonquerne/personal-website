import { describe, expect, it } from 'vitest';
import {
  areEqualSets,
  complement,
  difference,
  evaluate,
  expressionsCoincide,
  intersection,
  litA,
  litB,
  membershipFormula,
  union,
  type SetUniverse,
} from './set-operations';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Univers de demonstration du chapitre : U = {1..6}, A = {1,2,3}, B = {3,4,5}. */
const universe: SetUniverse = {
  elements: ['1', '2', '3', '4', '5', '6'],
  a: ['1', '2', '3'],
  b: ['3', '4', '5'],
};

// ---------------------------------------------------------------------------
// evaluate
// ---------------------------------------------------------------------------

describe('evaluate', () => {
  it('returns the members of A for a literal A', () => {
    expect(evaluate(litA, universe)).toEqual(['1', '2', '3']);
  });

  it('returns the members of B for a literal B', () => {
    expect(evaluate(litB, universe)).toEqual(['3', '4', '5']);
  });

  it('union is the elements in A or in B', () => {
    expect(evaluate(union(litA, litB), universe)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('intersection is the elements in A and in B', () => {
    expect(evaluate(intersection(litA, litB), universe)).toEqual(['3']);
  });

  it('complement is relative to the universe', () => {
    expect(evaluate(complement(litA), universe)).toEqual(['4', '5', '6']);
  });

  it('difference A minus B keeps what is in A but not in B', () => {
    expect(evaluate(difference(litA, litB), universe)).toEqual(['1', '2']);
  });

  it('preserves the universe display order in the result', () => {
    const scrambled: SetUniverse = {
      elements: ['6', '5', '4', '3', '2', '1'],
      a: ['1', '2', '3'],
      b: ['3', '4', '5'],
    };
    expect(evaluate(union(litA, litB), scrambled)).toEqual(['5', '4', '3', '2', '1']);
  });

  it('evaluates a nested De Morgan expression (A union B) complement', () => {
    expect(evaluate(complement(union(litA, litB)), universe)).toEqual(['6']);
  });

  it('evaluates the dual A-complement intersection B-complement', () => {
    expect(evaluate(intersection(complement(litA), complement(litB)), universe)).toEqual(['6']);
  });
});

// ---------------------------------------------------------------------------
// areEqualSets
// ---------------------------------------------------------------------------

describe('areEqualSets', () => {
  it('is true regardless of order', () => {
    expect(areEqualSets(['1', '2', '3'], ['3', '1', '2'])).toBe(true);
  });

  it('ignores duplicates', () => {
    expect(areEqualSets(['1', '1', '2'], ['2', '1'])).toBe(true);
  });

  it('is false when an element differs', () => {
    expect(areEqualSets(['1', '2'], ['1', '3'])).toBe(false);
  });

  it('is false when sizes differ', () => {
    expect(areEqualSets(['1', '2'], ['1', '2', '3'])).toBe(false);
  });

  it('two empty collections are equal', () => {
    expect(areEqualSets([], [])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// expressionsCoincide (verification de De Morgan)
// ---------------------------------------------------------------------------

describe('expressionsCoincide', () => {
  it('confirms De Morgan: (A union B) complement equals A-complement inter B-complement', () => {
    const left = complement(union(litA, litB));
    const right = intersection(complement(litA), complement(litB));
    expect(expressionsCoincide(left, right, universe)).toBe(true);
  });

  it('confirms the second De Morgan law on intersection', () => {
    const left = complement(intersection(litA, litB));
    const right = union(complement(litA), complement(litB));
    expect(expressionsCoincide(left, right, universe)).toBe(true);
  });

  it('is false for a wrong identity (union is not intersection)', () => {
    expect(expressionsCoincide(union(litA, litB), intersection(litA, litB), universe)).toBe(false);
  });

  it('holds on any universe where the law is structural', () => {
    const other: SetUniverse = {
      elements: ['a', 'b', 'c', 'd'],
      a: ['a', 'b'],
      b: ['b', 'c'],
    };
    const left = complement(union(litA, litB));
    const right = intersection(complement(litA), complement(litB));
    expect(expressionsCoincide(left, right, other)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// membershipFormula (condition symbolique d'appartenance)
// ---------------------------------------------------------------------------

describe('membershipFormula', () => {
  it('describes a literal', () => {
    expect(membershipFormula(litA)).toBe('x ∈ A');
  });

  it('describes a union with the logical or', () => {
    expect(membershipFormula(union(litA, litB))).toBe('x ∈ A ∨ x ∈ B');
  });

  it('describes an intersection with the logical and', () => {
    expect(membershipFormula(intersection(litA, litB))).toBe('x ∈ A ∧ x ∈ B');
  });

  it('describes a complement with the negation', () => {
    expect(membershipFormula(complement(litA))).toBe('¬(x ∈ A)');
  });

  it('describes a difference as a conjunction with a negation', () => {
    expect(membershipFormula(difference(litA, litB))).toBe('x ∈ A ∧ ¬(x ∈ B)');
  });

  it('parenthesises a nested De Morgan expression', () => {
    expect(membershipFormula(complement(union(litA, litB)))).toBe('¬(x ∈ A ∨ x ∈ B)');
  });
});
