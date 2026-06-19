/**
 * CodeLab - Root island mounted in course MDX.
 *
 * Reads a CodeLabExercise, manages the active language tab,
 * and dispatches to the appropriate mode sub-component.
 * Each sub-component receives key=activeLanguage so that switching language
 * remounts it and resets its internal state.
 */
import { useState, type JSX } from 'react';
import type { CodeLabExercise, CodeLanguage } from './code-lab/code-lab-types';
import { availableLanguages } from './code-lab/code-lab-types';
import LanguageTabs from './code-lab/LanguageTabs';
import FillInTheBlank, { type FillInCopy } from './code-lab/FillInTheBlank';
import BeforeAfter, { type BeforeAfterCopy } from './code-lab/BeforeAfter';
import AnnotatedWalkthrough, { type AnnotatedCopy } from './code-lab/AnnotatedWalkthrough';
import CodeQuiz, { type QuizCopy } from './code-lab/CodeQuiz';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Copy strings for the CodeLab orchestrator and its child mode components. */
export interface CodeLabCopy {
  readonly title?: string;
  /** Label overrides for the language tabs (defaults: C#/Rust from LanguageTabs). */
  readonly languageLabels?: Partial<Record<CodeLanguage, string>>;
  readonly fillIn?: FillInCopy;
  readonly beforeAfter?: BeforeAfterCopy;
  readonly annotated?: AnnotatedCopy;
  readonly quiz?: QuizCopy;
}

/** Props for the CodeLab root island. */
export interface CodeLabProps {
  readonly exercise: CodeLabExercise;
  readonly copy: CodeLabCopy;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Root CodeLab island.
 *
 * Orchestrates language selection (via LanguageTabs) and delegates rendering
 * to the appropriate mode sub-component based on exercise.mode.
 * The key=activeLanguage prop on each sub-component ensures its internal state
 * is reset whenever the active language changes.
 */
export default function CodeLab({ exercise, copy }: CodeLabProps): JSX.Element {
  const languages = availableLanguages(exercise);

  // Hooks must be called unconditionally before any conditional return.
  const [activeLanguage, setActiveLanguage] = useState<CodeLanguage>(
    languages[0] ?? 'csharp',
  );

  // Defensive case: exercise with no content renders nothing.
  if (languages.length === 0) {
    return <></>;
  }

  // ---------------------------------------------------------------------------
  // Mode dispatch
  // The switch narrows exercise to the correct variant so exercise.content[activeLanguage]
  // has the right type in each branch. Content is accessed inside each case to preserve
  // TypeScript's discriminated-union narrowing.
  // ---------------------------------------------------------------------------

  function renderMode(): JSX.Element | null {
    switch (exercise.mode) {
      case 'fill-in-the-blank': {
        const content = exercise.content[activeLanguage];
        if (content === undefined || copy.fillIn === undefined) return null;
        return (
          <FillInTheBlank
            key={activeLanguage}
            content={content}
            language={activeLanguage}
            copy={copy.fillIn}
          />
        );
      }
      case 'before-after': {
        const content = exercise.content[activeLanguage];
        if (content === undefined || copy.beforeAfter === undefined) return null;
        return (
          <BeforeAfter
            key={activeLanguage}
            content={content}
            language={activeLanguage}
            copy={copy.beforeAfter}
          />
        );
      }
      case 'annotated-walkthrough': {
        const content = exercise.content[activeLanguage];
        if (content === undefined || copy.annotated === undefined) return null;
        return (
          <AnnotatedWalkthrough
            key={activeLanguage}
            content={content}
            language={activeLanguage}
            copy={copy.annotated}
          />
        );
      }
      case 'code-quiz': {
        const content = exercise.content[activeLanguage];
        if (content === undefined || copy.quiz === undefined) return null;
        return (
          <CodeQuiz
            key={activeLanguage}
            content={content}
            language={activeLanguage}
            copy={copy.quiz}
          />
        );
      }
    }
  }

  return (
    <section
      className="my-6 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-4"
      aria-label={copy.title}
    >
      {copy.title !== undefined && (
        <h3 className="mb-3 text-base font-semibold text-[var(--color-fg)]">
          {copy.title}
        </h3>
      )}

      <LanguageTabs
        languages={languages}
        activeLanguage={activeLanguage}
        onSelect={setActiveLanguage}
        labels={copy.languageLabels}
      />

      {renderMode()}
    </section>
  );
}
