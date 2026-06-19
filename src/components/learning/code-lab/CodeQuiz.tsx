import { useState, useMemo, type JSX, type ChangeEvent } from 'react';
import type { CodeLanguage, QuizContent } from './code-lab-types';
import { gradeQuiz, type QuizStatus } from './quiz-grader';
import CodeBlock from './CodeBlock';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Copy strings for one quiz question option. */
export interface QuizQuestionCopy {
  readonly prompt: string;
  /** Label keyed by option id. */
  readonly options: Record<string, string>;
}

/** Copy strings for the CodeQuiz component (UI labels and messages). */
export interface QuizCopy {
  readonly submitLabel: string;
  readonly correctFeedback: string;
  readonly incorrectFeedback: string;
  /** Shown when a submitted question has no answer selected. Optional. */
  readonly unansweredFeedback?: string;
  /** Copy keyed by question id. */
  readonly questions: Record<string, QuizQuestionCopy>;
}

/** Props for the CodeQuiz interactive code-quiz component. */
export interface CodeQuizProps {
  readonly content: QuizContent;
  readonly language: CodeLanguage;
  readonly copy: QuizCopy;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the feedback string for a given quiz status.
 * Falls back to incorrectFeedback when unansweredFeedback is absent.
 */
function resolveFeedback(status: QuizStatus, copy: QuizCopy): string {
  if (status === 'correct') return copy.correctFeedback;
  if (status === 'unanswered') return copy.unansweredFeedback ?? copy.incorrectFeedback;
  return copy.incorrectFeedback;
}

/**
 * Determine the Tailwind border class for a question fieldset based on its quiz status.
 * No status styling before submission (status is null).
 */
function questionBorderClass(status: QuizStatus | null): string {
  if (status === 'correct') return 'border-green-500/70';
  if (status === 'incorrect' || status === 'unanswered') return 'border-red-500/70';
  return 'border-[var(--color-line)]';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Interactive code-quiz exercise.
 *
 * Displays a code snippet via CodeBlock, then presents one or more
 * multiple-choice questions. Questions with one correct option use radio inputs;
 * questions with multiple correct options (or allowMultiple:true) use checkboxes.
 * Grading is delegated to gradeQuiz from quiz-grader.
 */
export default function CodeQuiz({
  content,
  language,
  copy,
}: CodeQuizProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const summary = useMemo(
    () => (isSubmitted ? gradeQuiz(answers, content.questions) : null),
    [isSubmitted, answers, content.questions],
  );

  const statusByQuestionId = useMemo<Map<string, QuizStatus>>(() => {
    if (!summary) return new Map();
    return new Map(summary.results.map((r) => [r.questionId, r.status]));
  }, [summary]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleRadioChange(questionId: string, optionId: string): void {
    setAnswers((prev) => ({ ...prev, [questionId]: [optionId] }));
  }

  function handleCheckboxChange(
    questionId: string,
    optionId: string,
    checked: boolean,
  ): void {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      const next = checked
        ? [...current, optionId]
        : current.filter((id) => id !== optionId);
      return { ...prev, [questionId]: next };
    });
  }

  function handleSubmit(): void {
    setIsSubmitted(true);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="my-4 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-4">
      {/* Code snippet */}
      <CodeBlock code={content.code} language={language} />

      {/* Questions */}
      <div className="mt-4 flex flex-col gap-4">
        {content.questions.map((question) => {
          const isMultiple =
            question.allowMultiple ??
            question.options.filter((o) => o.isCorrect).length > 1;

          const questionCopy = copy.questions[question.id];
          const status = statusByQuestionId.get(question.id) ?? null;
          const feedbackText = status !== null ? resolveFeedback(status, copy) : null;
          const selectedIds = answers[question.id] ?? [];

          return (
            <fieldset
              key={question.id}
              className={[
                'rounded border p-3',
                questionBorderClass(status),
              ].join(' ')}
            >
              <legend className="mb-2 px-1 text-sm font-medium text-[var(--color-fg)]">
                {questionCopy.prompt}
              </legend>

              <div className="flex flex-col gap-1.5">
                {question.options.map((option) => {
                  const inputId = `${question.id}-${option.id}`;
                  const label = questionCopy.options[option.id];

                  if (isMultiple) {
                    return (
                      <label
                        key={option.id}
                        htmlFor={inputId}
                        className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-fg)]"
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={selectedIds.includes(option.id)}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleCheckboxChange(question.id, option.id, e.target.checked)
                          }
                          className="accent-[var(--color-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50"
                        />
                        {label}
                      </label>
                    );
                  }

                  return (
                    <label
                      key={option.id}
                      htmlFor={inputId}
                      className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-fg)]"
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name={question.id}
                        checked={selectedIds.includes(option.id)}
                        onChange={() => handleRadioChange(question.id, option.id)}
                        className="accent-[var(--color-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50"
                      />
                      {label}
                    </label>
                  );
                })}
              </div>

              {/* Per-question feedback (aria-live region - always mounted) */}
              <div
                aria-live="polite"
                className="mt-2 min-h-[1.25rem] text-sm"
              >
                {feedbackText !== null && (
                  <span
                    className={
                      status === 'correct'
                        ? 'text-green-500'
                        : 'text-[var(--color-fg-muted)]'
                    }
                  >
                    {feedbackText}
                  </span>
                )}
              </div>
            </fieldset>
          );
        })}
      </div>

      {/* Submit button */}
      <div className="mt-4">
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-3 py-1.5 text-sm text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50"
        >
          {copy.submitLabel}
        </button>
      </div>
    </div>
  );
}
