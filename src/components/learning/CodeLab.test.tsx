import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CodeLab from './CodeLab';
import type { CodeLabProps } from './CodeLab';
import type {
  FillInExercise,
  BeforeAfterExercise,
  AnnotatedExercise,
  QuizExercise,
} from './code-lab/code-lab-types';
import type { FillInCopy } from './code-lab/FillInTheBlank';
import type { BeforeAfterCopy } from './code-lab/BeforeAfter';
import type { AnnotatedCopy } from './code-lab/AnnotatedWalkthrough';
import type { QuizCopy } from './code-lab/CodeQuiz';

// ---------------------------------------------------------------------------
// Fixtures - copy strings
// ---------------------------------------------------------------------------

const fillInCopy: FillInCopy = {
  instructions: 'Complétez les blancs dans le code.',
  checkLabel: 'Vérifier',
  revealLabel: 'Révéler',
  hideLabel: 'Masquer',
  resetLabel: 'Réinitialiser',
  statusIncomplete: 'Des réponses sont incorrectes.',
  statusComplete: 'Toutes les réponses sont correctes !',
};

const beforeAfterCopy: BeforeAfterCopy = {
  beforeLabel: 'Avant',
  afterLabel: 'Après',
  diffLabel: 'Diff',
};

const annotatedCopy: AnnotatedCopy = {
  previousLabel: 'Précédent',
  nextLabel: 'Suivant',
  stepLabel: 'Étape',
  ofLabel: 'sur',
  annotations: {
    'step-1': 'Déclaration de la variable principale.',
    'step-2': 'Appel de la méthode de calcul.',
  },
};

const quizCopy: QuizCopy = {
  submitLabel: 'Soumettre',
  correctFeedback: 'Correct !',
  incorrectFeedback: 'Incorrect.',
  questions: {
    'q-1': {
      prompt: 'Quel est le type de retour ?',
      options: {
        'opt-a': 'void',
        'opt-b': 'int',
        'opt-c': 'string',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Fixtures - fill-in exercises
// ---------------------------------------------------------------------------

const fillInExerciseCsharpOnly: FillInExercise = {
  id: 'ex-fill-csharp',
  mode: 'fill-in-the-blank',
  content: {
    csharp: {
      template: 'int x = {{blank-1}};',
      blanks: [{ id: 'blank-1', expected: '42' }],
    },
  },
};

const fillInExerciseBilingual: FillInExercise = {
  id: 'ex-fill-bilingual',
  mode: 'fill-in-the-blank',
  content: {
    csharp: {
      template: 'int x = {{blank-cs}};',
      blanks: [{ id: 'blank-cs', expected: '42' }],
    },
    rust: {
      template: 'let x = {{blank-rs}};',
      blanks: [{ id: 'blank-rs', expected: '42' }],
    },
  },
};

// ---------------------------------------------------------------------------
// Fixtures - before-after exercises
// ---------------------------------------------------------------------------

const beforeAfterExercise: BeforeAfterExercise = {
  id: 'ex-before-after',
  mode: 'before-after',
  content: {
    csharp: {
      before: 'int x = null;',
      after: 'int? x = null;',
    },
  },
};

// ---------------------------------------------------------------------------
// Fixtures - annotated walkthrough exercises
// ---------------------------------------------------------------------------

const annotatedExercise: AnnotatedExercise = {
  id: 'ex-annotated',
  mode: 'annotated-walkthrough',
  content: {
    csharp: {
      code: 'int result = Compute();',
      steps: [
        { id: 'step-1', lineRange: '1' },
        { id: 'step-2', lineRange: '1' },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Fixtures - code quiz exercises
// ---------------------------------------------------------------------------

const quizExercise: QuizExercise = {
  id: 'ex-quiz',
  mode: 'code-quiz',
  content: {
    csharp: {
      code: 'string Greet() => "Bonjour";',
      questions: [
        {
          id: 'q-1',
          options: [
            { id: 'opt-a', isCorrect: false },
            { id: 'opt-b', isCorrect: true },
            { id: 'opt-c', isCorrect: false },
          ],
        },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CodeLab', () => {
  describe('exercice mono-langage (C#) en mode fill-in', () => {
    it('ne rend pas d\'onglets de langage', () => {
      const props: CodeLabProps = {
        exercise: fillInExerciseCsharpOnly,
        copy: { fillIn: fillInCopy },
      };
      render(<CodeLab {...props} />);
      const tabs = screen.queryAllByRole('tab');
      expect(tabs).toHaveLength(0);
    });

    it('rend le mode fill-in (un input présent)', () => {
      const props: CodeLabProps = {
        exercise: fillInExerciseCsharpOnly,
        copy: { fillIn: fillInCopy },
      };
      render(<CodeLab {...props} />);
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('exercice bi-langage (C# + Rust)', () => {
    it('rend deux onglets', () => {
      const props: CodeLabProps = {
        exercise: fillInExerciseBilingual,
        copy: { fillIn: fillInCopy },
      };
      render(<CodeLab {...props} />);
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(2);
    });

    it('l\'onglet C# est sélectionné par défaut', () => {
      const props: CodeLabProps = {
        exercise: fillInExerciseBilingual,
        copy: { fillIn: fillInCopy },
      };
      render(<CodeLab {...props} />);
      const csharpTab = screen.getByRole('tab', { name: 'C#' });
      expect(csharpTab).toHaveAttribute('aria-selected', 'true');
    });

    it('affiche le contenu C# au départ', () => {
      const props: CodeLabProps = {
        exercise: fillInExerciseBilingual,
        copy: { fillIn: fillInCopy },
      };
      render(<CodeLab {...props} />);
      // Le template C# contient "int x"
      expect(screen.getByText(/int x/)).toBeTruthy();
    });

    it('affiche le contenu Rust après un clic sur l\'onglet Rust', () => {
      const props: CodeLabProps = {
        exercise: fillInExerciseBilingual,
        copy: { fillIn: fillInCopy },
      };
      render(<CodeLab {...props} />);
      const rustTab = screen.getByRole('tab', { name: 'Rust' });
      fireEvent.click(rustTab);
      // Le template Rust contient "let x"
      expect(screen.getByText(/let x/)).toBeTruthy();
    });
  });

  describe('aiguillage par mode', () => {
    it('before-after : rend la vue diff (data-diff-type présent)', () => {
      const props: CodeLabProps = {
        exercise: beforeAfterExercise,
        copy: { beforeAfter: beforeAfterCopy },
      };
      render(<CodeLab {...props} />);
      const diffLines = document.querySelectorAll('[data-diff-type]');
      expect(diffLines.length).toBeGreaterThan(0);
    });

    it('code-quiz : rend des options (radio ou checkbox)', () => {
      const props: CodeLabProps = {
        exercise: quizExercise,
        copy: { quiz: quizCopy },
      };
      render(<CodeLab {...props} />);
      const options = screen.getAllByRole('radio');
      expect(options.length).toBeGreaterThanOrEqual(1);
    });

    it('annotated-walkthrough : rend le bouton Suivant', () => {
      const props: CodeLabProps = {
        exercise: annotatedExercise,
        copy: { annotated: annotatedCopy },
      };
      render(<CodeLab {...props} />);
      const nextButton = screen.getByRole('button', { name: 'Suivant' });
      expect(nextButton).toBeTruthy();
    });
  });

  describe('titre optionnel', () => {
    it('affiche le titre quand copy.title est fourni', () => {
      const props: CodeLabProps = {
        exercise: fillInExerciseCsharpOnly,
        copy: { title: 'Exercice : types de base', fillIn: fillInCopy },
      };
      render(<CodeLab {...props} />);
      expect(screen.getByText('Exercice : types de base')).toBeTruthy();
    });

    it('ne rend pas de titre quand copy.title est absent', () => {
      const props: CodeLabProps = {
        exercise: fillInExerciseCsharpOnly,
        copy: { fillIn: fillInCopy },
      };
      render(<CodeLab {...props} />);
      expect(screen.queryByText('Exercice : types de base')).toBeNull();
    });
  });

  describe('réinitialisation de l\'état au changement de langage (key=activeLanguage)', () => {
    it('en mode fill-in bi-langue, taper dans un champ, changer de langage, revenir : le champ est vide', () => {
      const props: CodeLabProps = {
        exercise: fillInExerciseBilingual,
        copy: { fillIn: fillInCopy },
      };
      render(<CodeLab {...props} />);

      // Taper dans le premier champ C#
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'test-value' } });
      expect((inputs[0] as HTMLInputElement).value).toBe('test-value');

      // Basculer sur Rust
      const rustTab = screen.getByRole('tab', { name: 'Rust' });
      fireEvent.click(rustTab);

      // Revenir sur C#
      const csharpTab = screen.getByRole('tab', { name: 'C#' });
      fireEvent.click(csharpTab);

      // Le champ doit être réinitialisé
      const freshInputs = screen.getAllByRole('textbox');
      expect((freshInputs[0] as HTMLInputElement).value).toBe('');
    });
  });
});
