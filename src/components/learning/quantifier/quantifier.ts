/**
 * Pure first-order quantification engine: evaluates a quantified statement over
 * one finite domain (unary predicate) or two finite domains (binary relation).
 * No DOM, no React: it is the testable core behind the QuantifierLab component.
 *
 * The engine is deliberately blind to variable names. It quantifies an "outer"
 * slot then an "inner" slot, so swapping the quantifier order (forall-x exists-y
 * versus exists-y forall-x) is just a matter of which domain the caller passes
 * as outer, evaluated against the very same relation.
 */

export type Quantifier = 'forall' | 'exists';

export interface UnaryVerdict {
  /** Truth value of the quantified statement over the domain. */
  readonly value: boolean;
  /**
   * The element that settles the verdict: the witness when an existential is
   * true, the counter-example when a universal is false, null otherwise.
   */
  readonly decisive: string | null;
}

/**
 * Evaluates a single-quantifier statement, for example "for all x, holds(x)".
 *
 * @param quantifier - whether the statement is universal or existential.
 * @param domain - the finite set of elements the variable ranges over.
 * @param holds - the predicate, true when the element satisfies it.
 */
export function evaluateUnary(
  quantifier: Quantifier,
  domain: readonly string[],
  holds: (element: string) => boolean,
): UnaryVerdict {
  if (quantifier === 'forall') {
    const counterExample = domain.find((element) => !holds(element));
    return { value: counterExample === undefined, decisive: counterExample ?? null };
  }

  const witness = domain.find((element) => holds(element));
  return { value: witness !== undefined, decisive: witness ?? null };
}

export interface NestedRow {
  /** The outer-slot element this row reports on. */
  readonly outer: string;
  /** Truth value of the inner-quantified statement for this outer element. */
  readonly innerValue: boolean;
  /** Element that settles the inner statement for this row, or null. */
  readonly innerDecisive: string | null;
}

export interface NestedVerdict {
  /** Truth value of the whole two-quantifier statement. */
  readonly value: boolean;
  /** One entry per outer-slot element, in domain order. */
  readonly rows: readonly NestedRow[];
  /** The outer element that settles the whole verdict, or null. */
  readonly decisive: string | null;
}

/**
 * Evaluates a two-quantifier statement, for example
 * "for all x (outer), there exists y (inner) such that relation(x, y)".
 *
 * @param outer - quantifier binding the outer slot.
 * @param inner - quantifier binding the inner slot.
 * @param outerDomain - elements the outer slot ranges over.
 * @param innerDomain - elements the inner slot ranges over.
 * @param relation - true when the (outer, inner) pair is related.
 */
export function evaluateNested(
  outer: Quantifier,
  inner: Quantifier,
  outerDomain: readonly string[],
  innerDomain: readonly string[],
  relation: (outerElement: string, innerElement: string) => boolean,
): NestedVerdict {
  const rows: NestedRow[] = outerDomain.map((outerElement) => {
    const innerVerdict = evaluateUnary(inner, innerDomain, (innerElement) =>
      relation(outerElement, innerElement),
    );
    return {
      outer: outerElement,
      innerValue: innerVerdict.value,
      innerDecisive: innerVerdict.decisive,
    };
  });

  const innerHolds = new Map(rows.map((row) => [row.outer, row.innerValue]));
  const outerVerdict = evaluateUnary(outer, outerDomain, (outerElement) =>
    innerHolds.get(outerElement) ?? false,
  );

  return { value: outerVerdict.value, rows, decisive: outerVerdict.decisive };
}
