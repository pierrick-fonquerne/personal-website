import { describe, expect, it } from 'vitest';
import { availableLanguages, type CodeLabExercise } from './code-lab-types';

describe('availableLanguages', () => {
  it('returns only csharp when a fill-in exercise has only csharp content', () => {
    const exercise: CodeLabExercise = {
      id: 'ex-fill-csharp',
      mode: 'fill-in-the-blank',
      content: {
        csharp: {
          template: 'Console.{{blank1}}("Hello");',
          blanks: [{ id: 'blank1', expected: 'WriteLine' }],
        },
      },
    };
    expect(availableLanguages(exercise)).toEqual(['csharp']);
  });

  it('returns only rust when a before-after exercise has only rust content', () => {
    const exercise: CodeLabExercise = {
      id: 'ex-ba-rust',
      mode: 'before-after',
      content: {
        rust: {
          before: 'fn main() { let x = 1; }',
          after: 'fn main() { let x: u32 = 1; }',
        },
      },
    };
    expect(availableLanguages(exercise)).toEqual(['rust']);
  });

  it('returns csharp before rust (canonical order) when a quiz exercise has both languages given in rust-first order', () => {
    const exercise: CodeLabExercise = {
      id: 'ex-quiz-both',
      mode: 'code-quiz',
      content: {
        rust: {
          code: 'fn add(a: i32, b: i32) -> i32 { a + b }',
          questions: [
            {
              id: 'q1',
              options: [
                { id: 'a', isCorrect: true },
                { id: 'b', isCorrect: false },
              ],
            },
          ],
        },
        csharp: {
          code: 'static int Add(int a, int b) => a + b;',
          questions: [
            {
              id: 'q1',
              options: [
                { id: 'a', isCorrect: true },
                { id: 'b', isCorrect: false },
              ],
            },
          ],
        },
      },
    };
    expect(availableLanguages(exercise)).toEqual(['csharp', 'rust']);
  });

  it('returns csharp before rust for an annotated exercise with both languages', () => {
    const exercise: CodeLabExercise = {
      id: 'ex-annotated-both',
      mode: 'annotated-walkthrough',
      content: {
        csharp: {
          code: 'class Program { static void Main() { } }',
          steps: [{ id: 's1', lineRange: '1' }],
        },
        rust: {
          code: 'fn main() {}',
          steps: [{ id: 's1', lineRange: '1' }],
        },
      },
    };
    expect(availableLanguages(exercise)).toEqual(['csharp', 'rust']);
  });
});
