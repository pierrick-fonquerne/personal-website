import { useState, type JSX } from 'react';
import type { AnnotatedContent, CodeLanguage } from './code-lab-types';
import CodeBlock from './CodeBlock';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Copy strings for the AnnotatedWalkthrough navigation and step counter. */
export interface AnnotatedCopy {
  /** Label for the Previous button, e.g. "Précédent". */
  readonly previousLabel: string;
  /** Label for the Next button, e.g. "Suivant". */
  readonly nextLabel: string;
  /** Word for the step counter, e.g. "Étape". Optional. */
  readonly stepLabel?: string;
  /** Separator for the step counter, e.g. "sur" or "/". Optional, defaults to "/". */
  readonly ofLabel?: string;
  /** Annotation text keyed by step id. */
  readonly annotations: Record<string, string>;
}

/** Props for the AnnotatedWalkthrough component. */
export interface AnnotatedWalkthroughProps {
  /** Full code listing and ordered annotation steps. */
  readonly content: AnnotatedContent;
  /** Programming language for syntax highlighting. */
  readonly language: CodeLanguage;
  /** Visible and accessible copy strings. */
  readonly copy: AnnotatedCopy;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a step counter string from current index, total, and optional labels. */
function buildCounter(
  currentIndex: number,
  total: number,
  stepLabel: string | undefined,
  ofLabel: string | undefined,
): string {
  const separator = ofLabel ?? '/';
  const parts: string[] = [];
  if (stepLabel) {
    parts.push(stepLabel);
  }
  parts.push(String(currentIndex + 1));
  parts.push(separator);
  parts.push(String(total));
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Annotated walkthrough component.
 *
 * Renders a full code listing stepped through one annotation at a time.
 * Each step highlights a line range in the CodeBlock and shows the
 * corresponding annotation text. Navigation is provided via Previous / Next
 * buttons with bounds-clamped disable states.
 *
 * Defensive case: when content.steps is empty, renders the code listing alone
 * without any navigation or annotation panel.
 */
export default function AnnotatedWalkthrough({
  content,
  language,
  copy,
}: AnnotatedWalkthroughProps): JSX.Element {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const { steps } = content;
  const hasSteps = steps.length > 0;

  // Defensive case: no steps - render code only.
  if (!hasSteps) {
    return (
      <div className="my-4 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)]">
        <div className="p-4">
          <CodeBlock code={content.code} language={language} />
        </div>
      </div>
    );
  }

  const currentStep = steps[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  const annotation = copy.annotations[currentStep.id] ?? '';
  const counter = buildCounter(currentStepIndex, steps.length, copy.stepLabel, copy.ofLabel);

  function handlePrevious(): void {
    if (!isFirst) {
      setCurrentStepIndex((i) => i - 1);
    }
  }

  function handleNext(): void {
    if (!isLast) {
      setCurrentStepIndex((i) => i + 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Button styling helpers
  // ---------------------------------------------------------------------------

  function navButtonClass(disabled: boolean): string {
    return [
      'rounded border px-3 py-1 text-sm font-medium transition-colors',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]',
      disabled
        ? 'cursor-not-allowed border-[var(--color-line)] text-[var(--color-fg-dim)] opacity-40'
        : [
            'border-[var(--color-line)] text-[var(--color-fg-muted)]',
            'hover:border-[var(--color-line-strong)] hover:text-[var(--color-fg)] hover:bg-[var(--color-hover)]',
          ].join(' '),
    ].join(' ');
  }

  return (
    <div className="my-4 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)]">
      {/* Code listing with step highlighting */}
      <div className="p-4">
        <CodeBlock
          code={content.code}
          language={language}
          highlightedLines={currentStep.lineRange}
        />
      </div>

      {/* Annotation panel */}
      <div className="border-t border-[var(--color-line)] p-4">
        <p
          aria-live="polite"
          className="text-sm leading-relaxed text-[var(--color-fg-muted)]"
        >
          {annotation}
        </p>
      </div>

      {/* Navigation bar */}
      <div className="flex items-center justify-between border-t border-[var(--color-line)] px-4 py-3">
        <button
          type="button"
          disabled={isFirst}
          onClick={handlePrevious}
          className={navButtonClass(isFirst)}
        >
          {copy.previousLabel}
        </button>

        <span className="text-sm text-[var(--color-fg-dim)]">{counter}</span>

        <button
          type="button"
          disabled={isLast}
          onClick={handleNext}
          className={navButtonClass(isLast)}
        >
          {copy.nextLabel}
        </button>
      </div>
    </div>
  );
}
