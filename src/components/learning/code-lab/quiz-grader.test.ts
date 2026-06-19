import { describe, expect, it } from 'vitest';
import { gradeQuestion, gradeQuiz, type QuizQuestion } from './quiz-grader';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const singleCorrectQuestion: QuizQuestion = {
  id: 'q1',
  options: [
    { id: 'a', isCorrect: true },
    { id: 'b', isCorrect: false },
    { id: 'c', isCorrect: false },
  ],
};

const multiCorrectQuestion: QuizQuestion = {
  id: 'q2',
  options: [
    { id: 'x', isCorrect: true },
    { id: 'y', isCorrect: true },
    { id: 'z', isCorrect: false },
  ],
};

// ---------------------------------------------------------------------------
// gradeQuestion
// ---------------------------------------------------------------------------

describe('gradeQuestion', () => {
  it('returns unanswered for an empty selection', () => {
    expect(gradeQuestion([], singleCorrectQuestion)).toBe('unanswered');
  });

  it('returns correct for the sole correct option (single-choice)', () => {
    expect(gradeQuestion(['a'], singleCorrectQuestion)).toBe('correct');
  });

  it('returns incorrect for a wrong option (single-choice)', () => {
    expect(gradeQuestion(['b'], singleCorrectQuestion)).toBe('incorrect');
  });

  it('returns correct when all correct options are selected and no wrong ones (multi-choice)', () => {
    expect(gradeQuestion(['x', 'y'], multiCorrectQuestion)).toBe('correct');
  });

  it('returns incorrect when a correct option is missing (multi-choice)', () => {
    expect(gradeQuestion(['x'], multiCorrectQuestion)).toBe('incorrect');
  });

  it('returns incorrect when correct options plus a wrong one are selected (multi-choice)', () => {
    expect(gradeQuestion(['x', 'y', 'z'], multiCorrectQuestion)).toBe('incorrect');
  });

  it('order of selected ids does not matter - still correct', () => {
    expect(gradeQuestion(['y', 'x'], multiCorrectQuestion)).toBe('correct');
  });

  it('deduplicates selected ids - still correct', () => {
    expect(gradeQuestion(['a', 'a'], singleCorrectQuestion)).toBe('correct');
  });

  it('ignores unknown ids that are not in question options', () => {
    // 'unknown' is not in the options - ignored; 'a' is the sole correct option
    expect(gradeQuestion(['a', 'unknown'], singleCorrectQuestion)).toBe('correct');
  });

  it('selection composed only of unknown ids becomes empty after filtering -> unanswered', () => {
    expect(gradeQuestion(['unknown1', 'unknown2'], singleCorrectQuestion)).toBe('unanswered');
  });
});

// ---------------------------------------------------------------------------
// gradeQuiz
// ---------------------------------------------------------------------------

describe('gradeQuiz', () => {
  it('returns correct count, total, and isComplete for a mix of statuses', () => {
    const questions: readonly QuizQuestion[] = [
      singleCorrectQuestion,
      multiCorrectQuestion,
      { id: 'q3', options: [{ id: 'p', isCorrect: true }] },
    ];
    const answers: Record<string, readonly string[]> = {
      q1: ['a'],       // correct
      q2: ['x'],       // incorrect (missing y)
      // q3 not provided -> unanswered
    };
    const summary = gradeQuiz(answers, questions);

    expect(summary.results).toHaveLength(3);
    expect(summary.results[0]).toEqual({ questionId: 'q1', status: 'correct' });
    expect(summary.results[1]).toEqual({ questionId: 'q2', status: 'incorrect' });
    expect(summary.results[2]).toEqual({ questionId: 'q3', status: 'unanswered' });
    expect(summary.correctCount).toBe(1);
    expect(summary.total).toBe(3);
    expect(summary.isComplete).toBe(false);
  });

  it('returns isComplete true when all questions are correct', () => {
    const questions: readonly QuizQuestion[] = [
      singleCorrectQuestion,
      multiCorrectQuestion,
    ];
    const answers: Record<string, readonly string[]> = {
      q1: ['a'],
      q2: ['x', 'y'],
    };
    const summary = gradeQuiz(answers, questions);

    expect(summary.correctCount).toBe(2);
    expect(summary.total).toBe(2);
    expect(summary.isComplete).toBe(true);
  });

  it('returns isComplete false for an empty questions array', () => {
    const summary = gradeQuiz({}, []);

    expect(summary.results).toHaveLength(0);
    expect(summary.correctCount).toBe(0);
    expect(summary.total).toBe(0);
    expect(summary.isComplete).toBe(false);
  });

  it('uses empty array when question id is missing from answers (unanswered)', () => {
    const questions: readonly QuizQuestion[] = [singleCorrectQuestion];
    const summary = gradeQuiz({}, questions);

    expect(summary.results[0]).toEqual({ questionId: 'q1', status: 'unanswered' });
    expect(summary.correctCount).toBe(0);
    expect(summary.isComplete).toBe(false);
  });
});
