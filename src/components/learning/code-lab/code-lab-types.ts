/**
 * Shared types for the CodeLab component.
 * CodeLab provides interactive code exercises (fill-in-the-blank, before-after,
 * annotated walkthrough, code quiz) embedded in course chapters.
 */

import type { CodeBlank } from './blank-checker';
import type { QuizQuestion } from './quiz-grader';

/** Programming language of a code exercise snippet. Orthogonal axis to the locale (fr/en). */
export type CodeLanguage = 'csharp' | 'rust';

/** Pedagogical mode of a CodeLab exercise. */
export type CodeLabMode =
  | 'fill-in-the-blank'
  | 'before-after'
  | 'annotated-walkthrough'
  | 'code-quiz';

// ---------------------------------------------------------------------------
// Per-mode content types
// ---------------------------------------------------------------------------

/** Fill-in-the-blank mode: code template with {{blankId}} markers where the learner types. */
export interface FillInContent {
  readonly template: string;
  readonly blanks: readonly CodeBlank[];
}

/** Before-after mode: broken version and corrected version of a snippet. */
export interface BeforeAfterContent {
  readonly before: string;
  readonly after: string;
}

/** An annotation step anchored to a 1-based line range (e.g. "3-5" or "7"). */
export interface AnnotationStep {
  readonly id: string;
  readonly lineRange: string;
}

/** Annotated-walkthrough mode: full code snippet and ordered annotation steps. */
export interface AnnotatedContent {
  readonly code: string;
  readonly steps: readonly AnnotationStep[];
}

/** Code-quiz mode: code snippet and multiple-choice questions. */
export interface QuizContent {
  readonly code: string;
  readonly questions: readonly QuizQuestion[];
}

/**
 * Content keyed by programming language.
 * At least one language must be present at runtime (not enforced by the type to allow
 * partial construction; callers use availableLanguages to discover present keys).
 */
export type LanguageContentMap<TContent> = Partial<Record<CodeLanguage, TContent>>;

// ---------------------------------------------------------------------------
// Discriminated union of exercises
// ---------------------------------------------------------------------------

interface ExerciseBase {
  readonly id: string;
}

/** Fill-in-the-blank exercise. */
export interface FillInExercise extends ExerciseBase {
  readonly mode: 'fill-in-the-blank';
  readonly content: LanguageContentMap<FillInContent>;
}

/** Before-after exercise showing a broken then a corrected snippet. */
export interface BeforeAfterExercise extends ExerciseBase {
  readonly mode: 'before-after';
  readonly content: LanguageContentMap<BeforeAfterContent>;
}

/** Annotated-walkthrough exercise guiding the learner step by step. */
export interface AnnotatedExercise extends ExerciseBase {
  readonly mode: 'annotated-walkthrough';
  readonly content: LanguageContentMap<AnnotatedContent>;
}

/** Code-quiz exercise with multiple-choice questions over a snippet. */
export interface QuizExercise extends ExerciseBase {
  readonly mode: 'code-quiz';
  readonly content: LanguageContentMap<QuizContent>;
}

/** Union of all exercise variants, discriminated by the `mode` field. */
export type CodeLabExercise =
  | FillInExercise
  | BeforeAfterExercise
  | AnnotatedExercise
  | QuizExercise;

// ---------------------------------------------------------------------------
// Language ordering + helper
// ---------------------------------------------------------------------------

/** Canonical display order for language tabs. */
export const LANGUAGE_ORDER: readonly CodeLanguage[] = ['csharp', 'rust'];

/**
 * Returns the languages actually present in the exercise, in canonical order
 * (csharp before rust), regardless of the key insertion order in the content map.
 */
export function availableLanguages(exercise: CodeLabExercise): readonly CodeLanguage[] {
  return LANGUAGE_ORDER.filter(
    (lang) => Object.prototype.hasOwnProperty.call(exercise.content, lang) && exercise.content[lang] !== undefined,
  );
}
