import { describe, expect, it } from 'vitest';
import { evaluateNested, evaluateUnary, type Quantifier } from './quantifier';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const people = ['Alice', 'Bob', 'Carol'] as const;

/** Diagonal relation: each element relates only to itself. */
const diagonal = (outer: string, inner: string): boolean => outer === inner;

/** Total relation: everyone relates to everyone. */
const everyone = (): boolean => true;

/** Empty relation: nobody relates to anybody. */
const nobody = (): boolean => false;

// ---------------------------------------------------------------------------
// evaluateUnary
// ---------------------------------------------------------------------------

describe('evaluateUnary', () => {
  it('forall is true when the predicate holds for every element, with no decisive element', () => {
    const verdict = evaluateUnary('forall', people, () => true);
    expect(verdict.value).toBe(true);
    expect(verdict.decisive).toBeNull();
  });

  it('forall is false and points to the first counter-example', () => {
    const verdict = evaluateUnary('forall', people, (x) => x !== 'Bob');
    expect(verdict.value).toBe(false);
    expect(verdict.decisive).toBe('Bob');
  });

  it('exists is true and points to the first witness', () => {
    const verdict = evaluateUnary('exists', people, (x) => x === 'Carol');
    expect(verdict.value).toBe(true);
    expect(verdict.decisive).toBe('Carol');
  });

  it('exists is false when no element satisfies the predicate, with no decisive element', () => {
    const verdict = evaluateUnary('exists', people, () => false);
    expect(verdict.value).toBe(false);
    expect(verdict.decisive).toBeNull();
  });

  it('forall is vacuously true on an empty domain', () => {
    const verdict = evaluateUnary('forall', [], () => false);
    expect(verdict.value).toBe(true);
    expect(verdict.decisive).toBeNull();
  });

  it('exists is false on an empty domain', () => {
    const verdict = evaluateUnary('exists', [], () => true);
    expect(verdict.value).toBe(false);
    expect(verdict.decisive).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// evaluateNested: the order of quantifiers
// ---------------------------------------------------------------------------

describe('evaluateNested', () => {
  it('forall-exists is TRUE on the diagonal relation (each element has itself)', () => {
    const verdict = evaluateNested('forall', 'exists', people, people, diagonal);
    expect(verdict.value).toBe(true);
    expect(verdict.decisive).toBeNull();
  });

  it('exists-forall is FALSE on the diagonal relation (no universal partner)', () => {
    const verdict = evaluateNested('exists', 'forall', people, people, diagonal);
    expect(verdict.value).toBe(false);
    expect(verdict.decisive).toBeNull();
  });

  it('the same diagonal relation flips truth value when the quantifier order swaps', () => {
    const forallExists = evaluateNested('forall', 'exists', people, people, diagonal);
    const existsForall = evaluateNested('exists', 'forall', people, people, diagonal);
    expect(forallExists.value).not.toBe(existsForall.value);
  });

  it('exposes one row per outer element with the inner verdict', () => {
    const verdict = evaluateNested('forall', 'exists', people, people, diagonal);
    expect(verdict.rows).toHaveLength(3);
    expect(verdict.rows.map((row) => row.outer)).toEqual(['Alice', 'Bob', 'Carol']);
    expect(verdict.rows.every((row) => row.innerValue)).toBe(true);
  });

  it('records the inner witness (exists) per row on the diagonal', () => {
    const verdict = evaluateNested('forall', 'exists', people, people, diagonal);
    expect(verdict.rows.map((row) => row.innerDecisive)).toEqual([
      'Alice',
      'Bob',
      'Carol',
    ]);
  });

  it('forall-exists is FALSE when one outer element relates to nobody, pointing to that counter-example', () => {
    const missingBob = (outer: string, inner: string): boolean =>
      outer !== 'Bob' && outer === inner;
    const verdict = evaluateNested('forall', 'exists', people, people, missingBob);
    expect(verdict.value).toBe(false);
    expect(verdict.decisive).toBe('Bob');
  });

  it('exists-forall is TRUE on the total relation, pointing to the first universal witness', () => {
    const verdict = evaluateNested('exists', 'forall', people, people, everyone);
    expect(verdict.value).toBe(true);
    expect(verdict.decisive).toBe('Alice');
  });

  it('forall-forall is FALSE on the empty relation, pointing to the first outer counter-example', () => {
    const verdict = evaluateNested('forall', 'forall', people, people, nobody);
    expect(verdict.value).toBe(false);
    expect(verdict.decisive).toBe('Alice');
  });

  it('exists-exists is TRUE on the diagonal, pointing to the first outer witness', () => {
    const verdict = evaluateNested('exists', 'exists', people, people, diagonal);
    expect(verdict.value).toBe(true);
    expect(verdict.decisive).toBe('Alice');
  });

  it('forall-forall is vacuously TRUE when the outer domain is empty', () => {
    const verdict = evaluateNested('forall', 'forall', [], people, everyone);
    expect(verdict.value).toBe(true);
    expect(verdict.rows).toHaveLength(0);
  });
});

// Type-level smoke: the Quantifier union stays the two intended tags.
const quantifiers: Quantifier[] = ['forall', 'exists'];
describe('Quantifier union', () => {
  it('has exactly the two expected tags', () => {
    expect(quantifiers).toEqual(['forall', 'exists']);
  });
});
