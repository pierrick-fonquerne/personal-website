/**
 * Pure engine for the MessageTaxonomyExplorer interactive component.
 *
 * Classifies a message into one of the three architectural families from two
 * orthogonal axes:
 *
 * - command: an instruction addressed to a single known recipient that changes
 *   state (e.g. "Charge the payment").
 * - query: a request addressed to a single known recipient that only reads
 *   state (e.g. "What is the order total?").
 * - event: a fact broadcast to unknown subscribers (e.g. "OrderPlaced"); once
 *   a message is broadcast, whether it writes or reads no longer determines its
 *   family.
 *
 * The classification is a two-question decision tree:
 *   1. isBroadcast === true   -> 'event'
 *   2. else mutatesState true  -> 'command'
 *   3. else                    -> 'query'
 */

/** One of the three architectural message families. */
export type MessageFamily = 'command' | 'query' | 'event';

/** The two orthogonal axes that determine a message family. */
export interface MessageAxes {
  /** True when the message is broadcast to unknown subscribers. */
  readonly isBroadcast: boolean;
  /** True when the message writes or changes state. */
  readonly mutatesState: boolean;
}

/** Classifies a message into one of the three families from its two axes. */
export function classifyByAxes(axes: MessageAxes): MessageFamily {
  if (axes.isBroadcast) {
    return 'event';
  }
  if (axes.mutatesState) {
    return 'command';
  }
  return 'query';
}

/** A message in the catalog: its identity plus its two true axes. */
export interface TaxonomyMessage extends MessageAxes {
  readonly id: string;
}

/** The true family of a catalog message (derived from its axes). */
export function familyOf(message: TaxonomyMessage): MessageFamily {
  return classifyByAxes(message);
}

/** Per-message grading result. */
export interface MessageResult {
  readonly id: string;
  readonly expected: MessageFamily;
  readonly guess: MessageFamily | null;
  readonly isCorrect: boolean;
}

/** Aggregate score over a set of assignments. */
export interface AssignmentScore {
  readonly correct: number;
  readonly total: number;
  readonly results: readonly MessageResult[];
}

/**
 * Grades a learner's bin assignments against the catalog.
 * assignments maps a message id to the family bin it was dropped into,
 * or null if it was left unassigned (counted as incorrect).
 *
 * @param messages - The ordered catalog of messages to grade.
 * @param assignments - Map of message id to the chosen family bin, or null.
 */
export function scoreAssignments(
  messages: readonly TaxonomyMessage[],
  assignments: Readonly<Record<string, MessageFamily | null>>,
): AssignmentScore {
  const results: MessageResult[] = messages.map((message) => {
    const expected = familyOf(message);
    const guess = assignments[message.id] ?? null;
    return {
      id: message.id,
      expected,
      guess,
      isCorrect: guess === expected,
    };
  });

  const correct = results.reduce((count, result) => count + (result.isCorrect ? 1 : 0), 0);

  return {
    correct,
    total: messages.length,
    results,
  };
}
