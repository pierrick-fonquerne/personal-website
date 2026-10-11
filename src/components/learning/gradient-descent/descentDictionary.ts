import type { DescentRegime, RavineBehavior } from './descentLogic';
import type { Locale } from './descentProjection';

export interface Dictionary {
  readonly title: string;
  readonly modeGroup: string;
  readonly parabolaMode: string;
  readonly ravineMode: string;
  readonly learningRate: string;
  readonly step: string;
  readonly run: string;
  readonly pause: string;
  readonly reset: string;
  readonly iteration: string;
  readonly weight: string;
  readonly loss: string;
  readonly regime: string;
  readonly behavior: string;
  readonly position: string;
  readonly parabolaDiagram: string;
  readonly ravineDiagram: string;
  readonly ravineHint: string;
  readonly iterationLimitReached: string;
  readonly divergenceReached: string;
  readonly regimes: Record<DescentRegime, string>;
  readonly ravineBehaviors: Record<RavineBehavior, string>;
}

export const DICTIONARY_BY_LOCALE: Record<Locale, Dictionary> = {
  fr: {
    title: 'Laboratoire de descente de gradient',
    modeGroup: 'Mode de la surface de coût',
    parabolaMode: 'Parabole',
    ravineMode: 'Ravine',
    learningRate: 'Taux d’apprentissage η',
    step: 'Pas',
    run: 'Lancer',
    pause: 'Pause',
    reset: 'Réinitialiser',
    iteration: 'Itération',
    weight: 'Poids w',
    loss: 'Coût',
    regime: 'Régime',
    behavior: 'Comportement',
    position: 'Position (x, y)',
    parabolaDiagram: 'Courbe du coût L = w² et trajectoire de la descente',
    ravineDiagram: 'Lignes de niveau d’une ravine et trajectoire en zigzag de la descente',
    ravineHint:
      'La ravine est raide en y et plate en x : le même η fait zigzaguer sur l’axe raide et avancer lentement sur l’axe plat.',
    iterationLimitReached: 'Limite de 30 itérations atteinte : la descente s’arrête.',
    divergenceReached: 'La descente diverge : elle s’arrête.',
    regimes: {
      monotone: 'converge sans osciller',
      'one-step': 'converge en un seul pas',
      oscillating: 'oscille mais converge',
      cycling: 'rebondit sans fin',
      diverging: 'diverge',
    },
    ravineBehaviors: {
      smooth: 'descend sans zigzag',
      zigzag: 'zigzag',
      cycling: 'rebondit sans fin',
      diverging: 'diverge',
    },
  },
  en: {
    title: 'Gradient descent lab',
    modeGroup: 'Cost surface mode',
    parabolaMode: 'Parabola',
    ravineMode: 'Ravine',
    learningRate: 'Learning rate η',
    step: 'Step',
    run: 'Run',
    pause: 'Pause',
    reset: 'Reset',
    iteration: 'Iteration',
    weight: 'Weight w',
    loss: 'Loss',
    regime: 'Regime',
    behavior: 'Behavior',
    position: 'Position (x, y)',
    parabolaDiagram: 'Loss curve L = w² and the path of the descent',
    ravineDiagram: 'Contour lines of a ravine and the zigzag path of the descent',
    ravineHint:
      'The ravine is steep in y and flat in x: the same η makes the path zigzag across the steep axis and crawl along the flat one.',
    iterationLimitReached: 'Limit of 30 iterations reached: the descent stops.',
    divergenceReached: 'The descent diverges: it stops.',
    regimes: {
      monotone: 'converges smoothly',
      'one-step': 'converges in a single step',
      oscillating: 'oscillates but converges',
      cycling: 'bounces forever',
      diverging: 'diverges',
    },
    ravineBehaviors: {
      smooth: 'descends without zigzag',
      zigzag: 'zigzag',
      cycling: 'bounces forever',
      diverging: 'diverges',
    },
  },
};
