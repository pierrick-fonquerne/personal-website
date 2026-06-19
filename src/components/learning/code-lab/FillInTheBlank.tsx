import { useState, useMemo, type JSX, type ChangeEvent } from 'react';
import type { CodeLanguage, FillInContent } from './code-lab-types';
import { checkBlanks, type BlankStatus } from './blank-checker';
import { parseBlankTemplate } from './blank-template';
import CodeBlock from './CodeBlock';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Copy strings for the FillInTheBlank component (UI labels and messages). */
export interface FillInCopy {
  /** Instruction text displayed above the editable code zone. */
  readonly instructions: string;
  /** Label for the "Check answers" button. */
  readonly checkLabel: string;
  /** Label for the "Reveal solution" button. */
  readonly revealLabel: string;
  /** Label for the "Hide solution" button (shown after reveal). */
  readonly hideLabel: string;
  /** Optional label for the "Reset" button. Omit to hide the button. */
  readonly resetLabel?: string;
  /** Message shown when at least one blank is wrong after checking. */
  readonly statusIncomplete: string;
  /** Message shown when all blanks are correct. */
  readonly statusComplete: string;
  /** Accessible label for a hint button. */
  readonly hintLabel?: string;
  /** Hint text keyed by blank id. */
  readonly hints?: Record<string, string>;
  /** Base accessible label for input fields. Defaults to "Champ à compléter". */
  readonly inputAriaLabel?: string;
}

/** Props for the FillInTheBlank interactive fill-in-the-blank component. */
export interface FillInTheBlankProps {
  readonly content: FillInContent;
  readonly language: CodeLanguage;
  readonly copy: FillInCopy;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_INPUT_ARIA_LABEL = 'Champ à compléter';

// ---------------------------------------------------------------------------
// Helper: build solution code string from segments + blanks
// ---------------------------------------------------------------------------

/**
 * Reconstruct the full solution code by replacing each blank segment with the
 * expected answer from the blanks definition. If a blank id is not found in the
 * definition, it is replaced with an empty string.
 */
function buildSolutionCode(
  segments: ReturnType<typeof parseBlankTemplate>,
  blanks: FillInContent['blanks'],
): string {
  const expectedById = new Map(blanks.map((b) => [b.id, b.expected]));
  return segments
    .map((seg) => (seg.kind === 'text' ? seg.value : (expectedById.get(seg.id) ?? '')))
    .join('');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Interactive fill-in-the-blank code exercise.
 *
 * Architecture note on revealed vs editable view:
 * When the solution is revealed, the editable zone is hidden (display:none via
 * Tailwind's `hidden` class) and the CodeBlock solution is shown beneath the
 * action buttons. This avoids layout shift while keeping the editable inputs
 * mounted so their answers are preserved when the learner hides the solution.
 */
export default function FillInTheBlank({
  content,
  language,
  copy,
}: FillInTheBlankProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // Derived segments (memoized - only recomputed when template changes)
  // ---------------------------------------------------------------------------

  const segments = useMemo(
    () => parseBlankTemplate(content.template),
    [content.template],
  );

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isChecked, setIsChecked] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [openHints, setOpenHints] = useState<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const summary = isChecked ? checkBlanks(answers, content.blanks) : null;

  const statusByBlankId = useMemo<Map<string, BlankStatus>>(() => {
    if (!summary) return new Map();
    return new Map(summary.results.map((r) => [r.id, r.status]));
  }, [summary]);

  const solutionCode = useMemo(
    () => buildSolutionCode(segments, content.blanks),
    [segments, content.blanks],
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleAnswerChange(id: string, value: string): void {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function handleCheck(): void {
    setIsChecked(true);
  }

  function handleRevealToggle(): void {
    setIsRevealed((prev) => !prev);
  }

  function handleReset(): void {
    setAnswers({});
    setIsChecked(false);
    setIsRevealed(false);
    setOpenHints(new Set());
  }

  function handleHintToggle(id: string): void {
    setOpenHints((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Render: blank counter for aria labels
  // ---------------------------------------------------------------------------

  let blankCounter = 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="my-4 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-4">
      {/* Instructions */}
      <p className="mb-3 text-sm text-[var(--color-fg)]">{copy.instructions}</p>

      {/* Editable code zone - hidden when solution is revealed */}
      <div className={isRevealed ? 'hidden' : undefined}>
        <pre className="cl-fill__code overflow-x-auto rounded-md bg-[var(--color-bg-elevated)] p-4 font-mono text-sm leading-relaxed">
          <code>
            {segments.map((seg, index) => {
              if (seg.kind === 'text') {
                return (
                  <span key={index} style={{ whiteSpace: 'pre' }}>
                    {seg.value}
                  </span>
                );
              }

              // blank segment
              blankCounter += 1;
              const currentCounter = blankCounter;
              const id = seg.id;
              const status = statusByBlankId.get(id);
              const hintText = copy.hints?.[id];
              const isHintOpen = openHints.has(id);
              const inputAriaBase = copy.inputAriaLabel ?? DEFAULT_INPUT_ARIA_LABEL;

              return (
                <span key={index} className="inline-flex flex-col align-bottom">
                  <input
                    type="text"
                    aria-label={`${inputAriaBase} ${currentCounter}`}
                    value={answers[id] ?? ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleAnswerChange(id, e.target.value)
                    }
                    data-blank-status={status ?? null}
                    className={[
                      'cl-fill__input',
                      'inline-block rounded border px-1 font-mono text-sm',
                      'bg-[var(--color-bg)] text-[var(--color-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50',
                      status === 'correct'
                        ? 'cl-fill__input--correct border-green-500/70'
                        : status === 'incorrect'
                          ? 'cl-fill__input--incorrect border-red-500/70'
                          : status === 'empty'
                            ? 'cl-fill__input--empty border-yellow-500/70'
                            : 'border-[var(--color-line)]',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    size={Math.max(8, (content.blanks.find((b) => b.id === id)?.expected.length ?? 8) + 2)}
                  />
                  {/* Hint button - only when a hint exists for this blank */}
                  {hintText !== undefined && copy.hintLabel !== undefined && (
                    <span className="mt-0.5 inline-flex flex-col">
                      <button
                        type="button"
                        aria-label={copy.hintLabel}
                        onClick={() => handleHintToggle(id)}
                        className="text-xs text-[var(--color-fg-muted)] underline hover:text-[var(--color-accent)]"
                      >
                        {copy.hintLabel}
                      </button>
                      {isHintOpen && (
                        <span className="mt-0.5 block text-xs text-[var(--color-fg-muted)] italic">
                          {hintText}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              );
            })}
          </code>
        </pre>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCheck}
          className="rounded border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-3 py-1.5 text-sm text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50"
        >
          {copy.checkLabel}
        </button>

        <button
          type="button"
          onClick={handleRevealToggle}
          className="rounded border border-[var(--color-line)] px-3 py-1.5 text-sm text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50"
        >
          {isRevealed ? copy.hideLabel : copy.revealLabel}
        </button>

        {copy.resetLabel !== undefined && (
          <button
            type="button"
            onClick={handleReset}
            className="rounded border border-[var(--color-line)] px-3 py-1.5 text-sm text-[var(--color-fg-muted)] hover:border-[var(--color-line)] hover:text-[var(--color-fg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50"
          >
            {copy.resetLabel}
          </button>
        )}
      </div>

      {/* Status message (aria-live region - always mounted) */}
      <div aria-live="polite" className="mt-2 min-h-[1.25rem] text-sm">
        {summary !== null && (
          <span
            className={
              summary.isComplete ? 'text-green-500' : 'text-[var(--color-fg-muted)]'
            }
          >
            {summary.isComplete ? copy.statusComplete : copy.statusIncomplete}
          </span>
        )}
      </div>

      {/* Solution view - rendered via CodeBlock when revealed */}
      {isRevealed && (
        <div className="mt-3">
          <CodeBlock code={solutionCode} language={language} />
        </div>
      )}
    </div>
  );
}
