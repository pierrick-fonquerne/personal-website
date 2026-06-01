/**
 * Pure propositional-logic engine: tokenizes, parses and evaluates boolean
 * formulas, and builds their truth tables. No DOM, no React: it is the testable
 * core behind the TruthTableBuilder component.
 *
 * Grammar (lowest to highest binding precedence):
 *   iff  ::= imp ( '⇔' imp )*
 *   imp  ::= or  ( '⇒' imp )?            // right associative
 *   or   ::= and ( '∨' and )*
 *   and  ::= not ( '∧' not )*
 *   not  ::= '¬' not | atom
 *   atom ::= VARIABLE | '(' iff ')'
 *
 * Unicode connectives and ASCII aliases are both accepted:
 *   ¬ ! ~   ∧ &   ∨ |   ⇒ -> =>   ⇔ <-> <=>
 */

export type BinaryOperator = 'and' | 'or' | 'imp' | 'iff';

export type AstNode =
  | { readonly type: 'var'; readonly name: string }
  | { readonly type: 'not'; readonly operand: AstNode }
  | { readonly type: BinaryOperator; readonly left: AstNode; readonly right: AstNode };

export interface TruthTableRow {
  readonly values: boolean[];
  readonly results: boolean[];
}

export interface TruthTable {
  readonly variables: string[];
  readonly rows: TruthTableRow[];
}

/** Raised when an expression cannot be tokenized or parsed. */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

type TokenType = 'var' | 'not' | 'and' | 'or' | 'imp' | 'iff' | 'lparen' | 'rparen';

interface Token {
  readonly type: TokenType;
  readonly name?: string;
}

const VARIABLE_START = /[A-Za-z]/;
const VARIABLE_PART = /[A-Za-z0-9_]/;

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  const matches = (literal: string): boolean =>
    expression.startsWith(literal, index);

  while (index < expression.length) {
    const char = expression[index] ?? '';

    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      index += 1;
      continue;
    }

    if (matches('<->') || matches('<=>')) {
      tokens.push({ type: 'iff' });
      index += 3;
      continue;
    }

    if (matches('->') || matches('=>')) {
      tokens.push({ type: 'imp' });
      index += 2;
      continue;
    }

    if (char === '¬' || char === '!' || char === '~') {
      tokens.push({ type: 'not' });
      index += 1;
      continue;
    }

    if (char === '∧' || char === '&') {
      tokens.push({ type: 'and' });
      index += 1;
      continue;
    }

    if (char === '∨' || char === '|') {
      tokens.push({ type: 'or' });
      index += 1;
      continue;
    }

    if (char === '⇒') {
      tokens.push({ type: 'imp' });
      index += 1;
      continue;
    }

    if (char === '⇔') {
      tokens.push({ type: 'iff' });
      index += 1;
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'lparen' });
      index += 1;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'rparen' });
      index += 1;
      continue;
    }

    if (VARIABLE_START.test(char)) {
      let name = char;
      index += 1;
      while (index < expression.length && VARIABLE_PART.test(expression[index] ?? '')) {
        name += expression[index];
        index += 1;
      }
      tokens.push({ type: 'var', name });
      continue;
    }

    throw new ParseError(`Unexpected character "${char}" at position ${index}.`);
  }

  return tokens;
}

class Parser {
  private position = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): AstNode {
    if (this.tokens.length === 0) {
      throw new ParseError('Empty expression.');
    }
    const node = this.parseIff();
    if (this.position < this.tokens.length) {
      throw new ParseError('Unexpected trailing tokens.');
    }
    return node;
  }

  private peek(): TokenType | 'eof' {
    return this.tokens[this.position]?.type ?? 'eof';
  }

  private advance(): Token {
    const token = this.tokens[this.position];
    if (token === undefined) {
      throw new ParseError('Unexpected end of expression.');
    }
    this.position += 1;
    return token;
  }

  private parseIff(): AstNode {
    let left = this.parseImp();
    while (this.peek() === 'iff') {
      this.advance();
      const right = this.parseImp();
      left = { type: 'iff', left, right };
    }
    return left;
  }

  private parseImp(): AstNode {
    const left = this.parseOr();
    if (this.peek() === 'imp') {
      this.advance();
      const right = this.parseImp();
      return { type: 'imp', left, right };
    }
    return left;
  }

  private parseOr(): AstNode {
    let left = this.parseAnd();
    while (this.peek() === 'or') {
      this.advance();
      const right = this.parseAnd();
      left = { type: 'or', left, right };
    }
    return left;
  }

  private parseAnd(): AstNode {
    let left = this.parseNot();
    while (this.peek() === 'and') {
      this.advance();
      const right = this.parseNot();
      left = { type: 'and', left, right };
    }
    return left;
  }

  private parseNot(): AstNode {
    if (this.peek() === 'not') {
      this.advance();
      return { type: 'not', operand: this.parseNot() };
    }
    return this.parseAtom();
  }

  private parseAtom(): AstNode {
    const token = this.advance();
    if (token.type === 'var' && token.name !== undefined) {
      return { type: 'var', name: token.name };
    }
    if (token.type === 'lparen') {
      const node = this.parseIff();
      const closing = this.advance();
      if (closing.type !== 'rparen') {
        throw new ParseError('Expected a closing parenthesis.');
      }
      return node;
    }
    throw new ParseError(`Unexpected token "${token.type}".`);
  }
}

/** Parses an expression into an abstract syntax tree. */
export function parse(expression: string): AstNode {
  return new Parser(tokenize(expression)).parse();
}

/** Returns the variable names used in a tree, in order of first appearance. */
export function variablesOf(node: AstNode): string[] {
  const seen: string[] = [];
  const visit = (current: AstNode): void => {
    if (current.type === 'var') {
      if (!seen.includes(current.name)) {
        seen.push(current.name);
      }
      return;
    }
    if (current.type === 'not') {
      visit(current.operand);
      return;
    }
    visit(current.left);
    visit(current.right);
  };
  visit(node);
  return seen;
}

/** Evaluates a tree under a variable assignment. */
export function evaluate(node: AstNode, environment: Readonly<Record<string, boolean>>): boolean {
  switch (node.type) {
    case 'var': {
      const value = environment[node.name];
      if (value === undefined) {
        throw new ParseError(`Variable "${node.name}" has no assigned value.`);
      }
      return value;
    }
    case 'not':
      return !evaluate(node.operand, environment);
    case 'and':
      return evaluate(node.left, environment) && evaluate(node.right, environment);
    case 'or':
      return evaluate(node.left, environment) || evaluate(node.right, environment);
    case 'imp':
      return !evaluate(node.left, environment) || evaluate(node.right, environment);
    case 'iff':
      return evaluate(node.left, environment) === evaluate(node.right, environment);
  }
}

function unionVariables(trees: AstNode[]): string[] {
  const all: string[] = [];
  for (const tree of trees) {
    for (const name of variablesOf(tree)) {
      if (!all.includes(name)) {
        all.push(name);
      }
    }
  }
  return all;
}

/**
 * Builds the joint truth table for one or more expressions. Rows are ordered
 * "true first": the opening row assigns true to every variable, then the table
 * counts down in binary with the first variable as the most significant bit.
 */
export function buildTruthTable(expressions: string[], variableOrder?: string[]): TruthTable {
  const trees = expressions.map(parse);
  const variables = variableOrder ?? unionVariables(trees);
  const count = variables.length;
  const rows: TruthTableRow[] = [];

  for (let combination = 0; combination < 2 ** count; combination += 1) {
    const values: boolean[] = [];
    const environment: Record<string, boolean> = {};
    for (let position = 0; position < count; position += 1) {
      const bit = (combination >> (count - 1 - position)) & 1;
      const value = bit === 0;
      values.push(value);
      environment[variables[position] ?? ''] = value;
    }
    rows.push({ values, results: trees.map((tree) => evaluate(tree, environment)) });
  }

  return { variables, rows };
}

/** Returns true when two expressions share the same truth table. */
export function areEquivalent(first: string, second: string): boolean {
  const table = buildTruthTable([first, second]);
  return table.rows.every((row) => row.results[0] === row.results[1]);
}
