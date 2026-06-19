/**
 * Shared types for the CodeLab component.
 * CodeLab provides interactive code exercises (fill-in-the-blank, before-after,
 * annotated walkthrough, code quiz) embedded in course chapters.
 * Additional types will be added by subsequent tasks.
 */

/** Programming language of a code exercise snippet. Orthogonal axis to the locale (fr/en). */
export type CodeLanguage = 'csharp' | 'rust';

/** Pedagogical mode of a CodeLab exercise. */
export type CodeLabMode =
  | 'fill-in-the-blank'
  | 'before-after'
  | 'annotated-walkthrough'
  | 'code-quiz';
