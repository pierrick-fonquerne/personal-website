import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import CodeQuiz, { type QuizCopy } from './CodeQuiz';
import type { QuizContent } from './code-lab-types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Code snippet court en C# (un extrait minimaliste servant de support aux questions).
 */
const CONTENT: QuizContent = {
  code: 'var x = 42;',
  questions: [
    {
      id: 'q1',
      options: [
        { id: 'a', isCorrect: true },
        { id: 'b', isCorrect: false },
      ],
    },
    {
      id: 'q2',
      options: [
        { id: 'x', isCorrect: true },
        { id: 'y', isCorrect: true },
        { id: 'z', isCorrect: false },
      ],
    },
  ],
};

const COPY: QuizCopy = {
  submitLabel: 'Valider',
  correctFeedback: 'Réponse correcte.',
  incorrectFeedback: 'Réponse incorrecte.',
  unansweredFeedback: 'Sélectionnez une réponse.',
  questions: {
    q1: {
      prompt: 'Que vaut x ?',
      options: {
        a: 'Option A',
        b: 'Option B',
      },
    },
    q2: {
      prompt: 'Quelles options sont vraies ?',
      options: {
        x: 'Option X',
        y: 'Option Y',
        z: 'Option Z',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Rendu de base
// ---------------------------------------------------------------------------

describe('CodeQuiz - rendu de base', () => {
  it('rend l\'extrait de code via CodeBlock', () => {
    render(<CodeQuiz content={CONTENT} language="csharp" copy={COPY} />);
    expect(screen.getByText(/var x = 42/)).toBeDefined();
  });

  it('rend le prompt de chaque question', () => {
    render(<CodeQuiz content={CONTENT} language="csharp" copy={COPY} />);
    expect(screen.getByText('Que vaut x ?')).toBeDefined();
    expect(screen.getByText('Quelles options sont vraies ?')).toBeDefined();
  });

  it('rend le libellé de chaque option', () => {
    render(<CodeQuiz content={CONTENT} language="csharp" copy={COPY} />);
    expect(screen.getByLabelText('Option A')).toBeDefined();
    expect(screen.getByLabelText('Option B')).toBeDefined();
    expect(screen.getByLabelText('Option X')).toBeDefined();
    expect(screen.getByLabelText('Option Y')).toBeDefined();
    expect(screen.getByLabelText('Option Z')).toBeDefined();
  });

  it('le bouton Valider est présent', () => {
    render(<CodeQuiz content={CONTENT} language="csharp" copy={COPY} />);
    expect(screen.getByRole('button', { name: 'Valider' })).toBeDefined();
  });

  it('aucun feedback affiché avant Valider', () => {
    render(<CodeQuiz content={CONTENT} language="csharp" copy={COPY} />);
    expect(screen.queryByText('Réponse correcte.')).toBeNull();
    expect(screen.queryByText('Réponse incorrecte.')).toBeNull();
    expect(screen.queryByText('Sélectionnez une réponse.')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Types d'input selon le nombre de bonnes réponses
// ---------------------------------------------------------------------------

describe('CodeQuiz - type radio ou checkbox selon la question', () => {
  it('question à une seule bonne réponse : options en type radio', () => {
    render(<CodeQuiz content={CONTENT} language="csharp" copy={COPY} />);
    const optionA = screen.getByLabelText('Option A') as HTMLInputElement;
    const optionB = screen.getByLabelText('Option B') as HTMLInputElement;
    expect(optionA.type).toBe('radio');
    expect(optionB.type).toBe('radio');
  });

  it('question à plusieurs bonnes réponses : options en type checkbox', () => {
    render(<CodeQuiz content={CONTENT} language="csharp" copy={COPY} />);
    const optionX = screen.getByLabelText('Option X') as HTMLInputElement;
    const optionY = screen.getByLabelText('Option Y') as HTMLInputElement;
    const optionZ = screen.getByLabelText('Option Z') as HTMLInputElement;
    expect(optionX.type).toBe('checkbox');
    expect(optionY.type).toBe('checkbox');
    expect(optionZ.type).toBe('checkbox');
  });

  it('force checkbox via allowMultiple même avec une seule bonne réponse', () => {
    const contentForced: QuizContent = {
      code: 'let n = 1;',
      questions: [
        {
          id: 'qf',
          allowMultiple: true,
          options: [
            { id: 'p', isCorrect: true },
            { id: 'q', isCorrect: false },
          ],
        },
      ],
    };
    const copyForced: QuizCopy = {
      submitLabel: 'Valider',
      correctFeedback: 'Réponse correcte.',
      incorrectFeedback: 'Réponse incorrecte.',
      questions: {
        qf: {
          prompt: 'Quelle option ?',
          options: { p: 'Option P', q: 'Option Q' },
        },
      },
    };
    render(<CodeQuiz content={contentForced} language="csharp" copy={copyForced} />);
    const optionP = screen.getByLabelText('Option P') as HTMLInputElement;
    expect(optionP.type).toBe('checkbox');
  });
});

// ---------------------------------------------------------------------------
// Correction (isCorrect) non exposée dans le DOM avant soumission
// ---------------------------------------------------------------------------

describe('CodeQuiz - isCorrect absent du DOM avant soumission', () => {
  it('aucun attribut data-is-correct visible avant Valider', () => {
    const { container } = render(<CodeQuiz content={CONTENT} language="csharp" copy={COPY} />);
    const elements = container.querySelectorAll('[data-is-correct]');
    expect(elements.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Feedback après soumission
// ---------------------------------------------------------------------------

describe('CodeQuiz - feedback après soumission', () => {
  it('bonne réponse single-choice -> correctFeedback pour cette question', () => {
    render(<CodeQuiz content={CONTENT} language="csharp" copy={COPY} />);
    fireEvent.click(screen.getByLabelText('Option A'));
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));

    const group = screen.getByRole('group', { name: 'Que vaut x ?' });
    expect(within(group).getByText('Réponse correcte.')).toBeDefined();
  });

  it('mauvaise réponse single-choice -> incorrectFeedback pour cette question', () => {
    render(<CodeQuiz content={CONTENT} language="csharp" copy={COPY} />);
    fireEvent.click(screen.getByLabelText('Option B'));
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));

    const group = screen.getByRole('group', { name: 'Que vaut x ?' });
    expect(within(group).getByText('Réponse incorrecte.')).toBeDefined();
  });

  it('bonne réponse multi-choice (toutes les correctes cochées) -> correctFeedback', () => {
    render(<CodeQuiz content={CONTENT} language="csharp" copy={COPY} />);
    fireEvent.click(screen.getByLabelText('Option X'));
    fireEvent.click(screen.getByLabelText('Option Y'));
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));

    const group = screen.getByRole('group', { name: 'Quelles options sont vraies ?' });
    expect(within(group).getByText('Réponse correcte.')).toBeDefined();
  });

  it('mauvaise réponse multi-choice (seulement une correcte cochée) -> incorrectFeedback', () => {
    render(<CodeQuiz content={CONTENT} language="csharp" copy={COPY} />);
    fireEvent.click(screen.getByLabelText('Option X'));
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));

    const group = screen.getByRole('group', { name: 'Quelles options sont vraies ?' });
    expect(within(group).getByText('Réponse incorrecte.')).toBeDefined();
  });

  it('aucune option sélectionnée + Valider -> unansweredFeedback (si fourni)', () => {
    render(<CodeQuiz content={CONTENT} language="csharp" copy={COPY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));

    const group = screen.getByRole('group', { name: 'Que vaut x ?' });
    expect(within(group).getByText('Sélectionnez une réponse.')).toBeDefined();
  });

  it('aucune option + pas de unansweredFeedback -> incorrectFeedback', () => {
    const copyWithoutUnanswered: QuizCopy = {
      submitLabel: 'Valider',
      correctFeedback: 'Réponse correcte.',
      incorrectFeedback: 'Réponse incorrecte.',
      questions: COPY.questions,
    };
    render(
      <CodeQuiz content={CONTENT} language="csharp" copy={copyWithoutUnanswered} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));

    const group = screen.getByRole('group', { name: 'Que vaut x ?' });
    expect(within(group).getByText('Réponse incorrecte.')).toBeDefined();
  });
});
