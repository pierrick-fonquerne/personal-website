/**
 * Pure engine for code-quiz exercise grading.
 * No UI, no DOM dependencies - plain TypeScript functions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Une option de reponse. Le libelle (prose, traduit) vit dans `copy`, keye par `id`. */
export interface QuizOption {
  readonly id: string;
  readonly isCorrect: boolean;
}

export interface QuizQuestion {
  readonly id: string;
  readonly options: readonly QuizOption[];
  /**
   * Force multi-choice rendering on the UI side.
   * Default: inferred (more than one correct option).
   * Does NOT affect grading logic.
   */
  readonly allowMultiple?: boolean;
}

export type QuizStatus = 'unanswered' | 'correct' | 'incorrect';

export interface QuizResult {
  readonly questionId: string;
  readonly status: QuizStatus;
}

export interface QuizGradeSummary {
  readonly results: readonly QuizResult[];
  readonly correctCount: number;
  readonly total: number;
  /** True when all questions are correct and total > 0. */
  readonly isComplete: boolean;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Grade a single quiz question against the selected option ids.
 *
 * Semantics:
 * - Deduplicate selectedOptionIds and discard any id not present in question.options.
 * - If the resulting set is empty, return 'unanswered'.
 * - Build correctSet: all option ids where isCorrect === true.
 * - Return 'correct' iff the filtered selection set equals correctSet exactly;
 *   return 'incorrect' otherwise.
 */
export function gradeQuestion(
  selectedOptionIds: readonly string[],
  question: QuizQuestion,
): QuizStatus {
  const knownIds = new Set(question.options.map((o) => o.id));
  const filteredSelection = new Set(selectedOptionIds.filter((id) => knownIds.has(id)));

  if (filteredSelection.size === 0) {
    return 'unanswered';
  }

  const correctSet = new Set(
    question.options.filter((o) => o.isCorrect).map((o) => o.id),
  );

  if (filteredSelection.size !== correctSet.size) {
    return 'incorrect';
  }

  for (const id of filteredSelection) {
    if (!correctSet.has(id)) {
      return 'incorrect';
    }
  }

  return 'correct';
}

/**
 * Grade a full quiz by delegating each question to gradeQuestion.
 *
 * For each question: status = gradeQuestion(answers[question.id] ?? [], question).
 * - correctCount: number of 'correct' statuses.
 * - total: questions.length.
 * - isComplete: correctCount === total && total > 0.
 */
export function gradeQuiz(
  answers: Record<string, readonly string[]>,
  questions: readonly QuizQuestion[],
): QuizGradeSummary {
  const results: QuizResult[] = questions.map((question) => ({
    questionId: question.id,
    status: gradeQuestion(answers[question.id] ?? [], question),
  }));

  const correctCount = results.filter((r) => r.status === 'correct').length;
  const total = questions.length;
  const isComplete = total > 0 && correctCount === total;

  return { results, correctCount, total, isComplete };
}
