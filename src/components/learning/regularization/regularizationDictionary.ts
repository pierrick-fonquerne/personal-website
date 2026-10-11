import type { FitDiagnosis } from './regularizationLogic';
import type { Locale } from './regularizationProjection';

export interface Dictionary {
  readonly title: string;
  readonly modeGroup: string;
  readonly penaltyMode: string;
  readonly earlyStoppingMode: string;
  readonly degree: string;
  readonly penalty: string;
  readonly epoch: string;
  readonly trainingError: string;
  readonly validationError: string;
  readonly bestPenalty: string;
  readonly bestEpoch: string;
  readonly diagnosis: string;
  readonly step: string;
  readonly run: string;
  readonly pause: string;
  readonly reset: string;
  readonly fitDiagram: string;
  readonly penaltyDiagram: string;
  readonly earlyStoppingDiagram: string;
  readonly diagnoses: Record<FitDiagnosis, string>;
}

export const DICTIONARY_BY_LOCALE: Record<Locale, Dictionary> = {
  fr: {
    title: 'Laboratoire de régularisation',
    modeGroup: 'Technique de régularisation',
    penaltyMode: 'Pénalité L2',
    earlyStoppingMode: 'Arrêt précoce',
    degree: 'Degré du polynôme',
    penalty: 'Pénalité λ',
    epoch: 'Époque',
    trainingError: 'Erreur d’entraînement',
    validationError: 'Erreur de validation',
    bestPenalty: 'Meilleur λ',
    bestEpoch: 'Meilleure époque',
    diagnosis: 'Diagnostic',
    step: 'Pas',
    run: 'Lancer',
    pause: 'Pause',
    reset: 'Recommencer',
    fitDiagram:
      'Dix points d’entraînement, la courbe cible sinus en pointillés et la courbe ajustée par le polynôme',
    penaltyDiagram:
      'Erreurs d’entraînement et de validation en fonction de la pénalité λ, avec le λ courant et le meilleur λ',
    earlyStoppingDiagram:
      'Erreurs d’entraînement et de validation à chaque point de contrôle de la descente, avec la meilleure époque',
    diagnoses: {
      underfitting: 'sous-apprentissage',
      balanced: 'bon équilibre',
      overfitting: 'sur-apprentissage',
    },
  },
  en: {
    title: 'Regularization lab',
    modeGroup: 'Regularization technique',
    penaltyMode: 'L2 penalty',
    earlyStoppingMode: 'Early stopping',
    degree: 'Polynomial degree',
    penalty: 'Penalty λ',
    epoch: 'Epoch',
    trainingError: 'Training error',
    validationError: 'Validation error',
    bestPenalty: 'Best λ',
    bestEpoch: 'Best epoch',
    diagnosis: 'Diagnosis',
    step: 'Step',
    run: 'Run',
    pause: 'Pause',
    reset: 'Restart',
    fitDiagram:
      'Ten training points, the sine target curve dashed and the curve fitted by the polynomial',
    penaltyDiagram:
      'Training and validation errors as a function of the penalty λ, with the current λ and the best λ',
    earlyStoppingDiagram:
      'Training and validation errors at each checkpoint of the descent, with the best epoch',
    diagnoses: {
      underfitting: 'underfitting',
      balanced: 'good balance',
      overfitting: 'overfitting',
    },
  },
};
