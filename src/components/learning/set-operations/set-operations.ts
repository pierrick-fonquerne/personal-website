/**
 * Moteur pur des operations ensemblistes sur un univers fini.
 *
 * Chaque operation ensembliste se ramene a un connecteur logique du chapitre 1,
 * applique a la condition d'appartenance : l'union est un "ou", l'intersection un
 * "et", le complement un "non". Le moteur n'embarque aucun texte de langue : tout
 * le naturel (FR / EN) reste dans le MDX via les labels du composant.
 */

/** Un univers fini et l'appartenance des elements aux deux ensembles A et B. */
export interface SetUniverse {
  /** Tous les elements du domaine, dans l'ordre d'affichage. */
  elements: string[];
  /** Les elements appartenant a A. */
  a: string[];
  /** Les elements appartenant a B. */
  b: string[];
}

/** Une expression ensembliste : un arbre d'operations sur les litteraux A et B. */
export type SetExpression =
  | { kind: 'literal'; set: 'A' | 'B' }
  | { kind: 'complement'; operand: SetExpression }
  | { kind: 'union'; left: SetExpression; right: SetExpression }
  | { kind: 'intersection'; left: SetExpression; right: SetExpression }
  | { kind: 'difference'; left: SetExpression; right: SetExpression };

// ---------------------------------------------------------------------------
// Constructeurs
// ---------------------------------------------------------------------------

/** Le litteral A. */
export const litA: SetExpression = { kind: 'literal', set: 'A' };

/** Le litteral B. */
export const litB: SetExpression = { kind: 'literal', set: 'B' };

/** Le complement (relatif a l'univers) d'une expression. */
export const complement = (operand: SetExpression): SetExpression => ({
  kind: 'complement',
  operand,
});

/** L'union de deux expressions. */
export const union = (left: SetExpression, right: SetExpression): SetExpression => ({
  kind: 'union',
  left,
  right,
});

/** L'intersection de deux expressions. */
export const intersection = (left: SetExpression, right: SetExpression): SetExpression => ({
  kind: 'intersection',
  left,
  right,
});

/** La difference (left prive de right). */
export const difference = (left: SetExpression, right: SetExpression): SetExpression => ({
  kind: 'difference',
  left,
  right,
});

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/**
 * Condition d'appartenance d'un element a une expression : chaque noeud de l'arbre
 * devient un connecteur booleen. C'est la traduction directe operation -> connecteur.
 */
function satisfies(expr: SetExpression, element: string, universe: SetUniverse): boolean {
  switch (expr.kind) {
    case 'literal':
      return (expr.set === 'A' ? universe.a : universe.b).includes(element);
    case 'complement':
      return !satisfies(expr.operand, element, universe);
    case 'union':
      return satisfies(expr.left, element, universe) || satisfies(expr.right, element, universe);
    case 'intersection':
      return satisfies(expr.left, element, universe) && satisfies(expr.right, element, universe);
    case 'difference':
      return satisfies(expr.left, element, universe) && !satisfies(expr.right, element, universe);
  }
}

/**
 * Evalue une expression sur un univers : renvoie les elements (dans l'ordre de
 * `universe.elements`) qui satisfont l'expression. Le complement est relatif a l'univers.
 */
export function evaluate(expr: SetExpression, universe: SetUniverse): string[] {
  return universe.elements.filter((element) => satisfies(expr, element, universe));
}

// ---------------------------------------------------------------------------
// Egalite et coincidence
// ---------------------------------------------------------------------------

/** Egalite ensembliste (insensible a l'ordre et aux doublons) de deux collections. */
export function areEqualSets(left: string[], right: string[]): boolean {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  if (leftSet.size !== rightSet.size) {
    return false;
  }
  for (const element of leftSet) {
    if (!rightSet.has(element)) {
      return false;
    }
  }
  return true;
}

/**
 * Vrai si deux expressions selectionnent exactement les memes elements sur cet univers.
 * C'est la verification de De Morgan sur un univers fini concret.
 */
export function expressionsCoincide(
  exprA: SetExpression,
  exprB: SetExpression,
  universe: SetUniverse,
): boolean {
  return areEqualSets(evaluate(exprA, universe), evaluate(exprB, universe));
}

// ---------------------------------------------------------------------------
// Condition d'appartenance symbolique
// ---------------------------------------------------------------------------

/**
 * Rend la condition d'appartenance sous forme symbolique, neutre vis-a-vis de la langue :
 * union -> "x ∈ A ∨ x ∈ B", complement -> "¬(x ∈ A)", etc. Pour l'affichage du predicat.
 */
export function membershipFormula(expr: SetExpression): string {
  switch (expr.kind) {
    case 'literal':
      return `x ∈ ${expr.set}`;
    case 'complement':
      return `¬(${membershipFormula(expr.operand)})`;
    case 'union':
      return `${membershipFormula(expr.left)} ∨ ${membershipFormula(expr.right)}`;
    case 'intersection':
      return `${membershipFormula(expr.left)} ∧ ${membershipFormula(expr.right)}`;
    case 'difference':
      return `${membershipFormula(expr.left)} ∧ ¬(${membershipFormula(expr.right)})`;
  }
}
