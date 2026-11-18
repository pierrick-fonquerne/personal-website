import type {
  Activation,
  InitializationScheme,
  LabMode,
  SymmetryStart,
} from './initializationLogic';
import type { Locale } from './initializationProjection';

export interface Dictionary {
  readonly title: string;
  readonly modeGroup: string;
  readonly modes: Record<LabMode, string>;
  readonly activationGroup: string;
  readonly activations: Record<Activation, string>;
  readonly schemeGroup: string;
  readonly schemes: Record<InitializationScheme, string>;
  readonly batchNorm: string;
  readonly startGroup: string;
  readonly starts: Record<SymmetryStart, string>;
  readonly step: string;
  readonly run: string;
  readonly pause: string;
  readonly reset: string;
  readonly stepCount: string;
  readonly loss: string;
  readonly twinDistance: string;
  readonly predictions: string;
  readonly layer: string;
  readonly standardDeviation: string;
  readonly gradientNorm: string;
  readonly symmetryDiagram: string;
  readonly deviationDiagram: string;
  readonly gradientDiagram: string;
  readonly axisLayer: string;
  readonly axisDeviation: string;
  readonly axisGradient: string;
  readonly legendNetwork: string;
  readonly legendTwinOne: string;
  readonly legendTwinTwo: string;
  readonly twinsStuck: string;
  readonly xorSolved: string;
  readonly exploding: string;
  readonly vanishing: string;
  readonly stable: string;
  readonly layerValueText: (layer: number, formattedValue: string) => string;
}

export const DICTIONARY_BY_LOCALE: Record<Locale, Dictionary> = {
  fr: {
    title: 'Laboratoire d’initialisation',
    modeGroup: 'Expérience',
    modes: { symmetry: 'Symétrie', depth: 'Profondeur' },
    activationGroup: 'Activation',
    activations: { tanh: 'tanh', relu: 'ReLU' },
    schemeGroup: 'Schéma d’initialisation',
    schemes: {
      'standard-normal': 'Normale standard',
      small: 'Petits poids (0,01)',
      xavier: 'Xavier',
      he: 'He',
    },
    batchNorm: 'Batch norm',
    startGroup: 'Départ des poids',
    starts: { twins: 'Jumeaux', random: 'Aléatoire' },
    step: 'Pas',
    run: 'Lancer',
    pause: 'Pause',
    reset: 'Recommencer',
    stepCount: 'Pas d’entraînement',
    loss: 'Note (entropie croisée)',
    twinDistance: 'Écart des jumeaux',
    predictions: 'Prédictions',
    layer: 'Couche',
    standardDeviation: 'Écart-type des activations',
    gradientNorm: 'Norme du gradient',
    symmetryDiagram:
      'Le carré unité avec les quatre points du XOR et les droites des deux neurones cachés',
    deviationDiagram:
      'Écart-type des activations à chacune des dix couches, en échelle logarithmique',
    gradientDiagram:
      'Norme du gradient des poids à chacune des dix couches, en échelle logarithmique',
    axisLayer: 'couche',
    axisDeviation: 'écart-type (log)',
    axisGradient: 'gradient (log)',
    legendNetwork: 'Droites des neurones cachés',
    legendTwinOne: 'neurone 1',
    legendTwinTwo: 'neurone 2',
    twinsStuck:
      'Les deux neurones cachés sont restés identiques : la symétrie n’a jamais été brisée et le XOR n’est pas résolu.',
    xorSolved:
      'Les deux neurones cachés se sont différenciés : le XOR est résolu, les quatre prédictions sont justes.',
    exploding:
      'Les activations explosent : l’écart-type grandit d’une couche à l’autre et le signal sature.',
    vanishing:
      'Les activations fondent : l’écart-type rétrécit d’une couche à l’autre et le signal s’éteint.',
    stable:
      'Les activations restent stables : l’écart-type garde le même ordre de grandeur sur les dix couches.',
    layerValueText: (layer, formattedValue) => `Couche ${layer} : ${formattedValue}`,
  },
  en: {
    title: 'Initialisation lab',
    modeGroup: 'Experiment',
    modes: { symmetry: 'Symmetry', depth: 'Depth' },
    activationGroup: 'Activation',
    activations: { tanh: 'tanh', relu: 'ReLU' },
    schemeGroup: 'Initialisation scheme',
    schemes: {
      'standard-normal': 'Standard normal',
      small: 'Small weights (0.01)',
      xavier: 'Xavier',
      he: 'He',
    },
    batchNorm: 'Batch norm',
    startGroup: 'Weight start',
    starts: { twins: 'Twins', random: 'Random' },
    step: 'Step',
    run: 'Run',
    pause: 'Pause',
    reset: 'Restart',
    stepCount: 'Training steps',
    loss: 'Score (cross-entropy)',
    twinDistance: 'Twin gap',
    predictions: 'Predictions',
    layer: 'Layer',
    standardDeviation: 'Activation standard deviation',
    gradientNorm: 'Gradient norm',
    symmetryDiagram:
      'The unit square with the four XOR points and the lines of the two hidden neurons',
    deviationDiagram:
      'Standard deviation of the activations at each of the ten layers, on a logarithmic scale',
    gradientDiagram:
      'Norm of the weight gradient at each of the ten layers, on a logarithmic scale',
    axisLayer: 'layer',
    axisDeviation: 'standard deviation (log)',
    axisGradient: 'gradient (log)',
    legendNetwork: 'Hidden neuron lines',
    legendTwinOne: 'neuron 1',
    legendTwinTwo: 'neuron 2',
    twinsStuck:
      'The two hidden neurons stayed identical: the symmetry was never broken and XOR is not solved.',
    xorSolved:
      'The two hidden neurons told themselves apart: XOR is solved, all four predictions are right.',
    exploding:
      'The activations explode: the standard deviation grows from layer to layer and the signal saturates.',
    vanishing:
      'The activations vanish: the standard deviation shrinks from layer to layer and the signal dies out.',
    stable:
      'The activations stay stable: the standard deviation keeps the same order of magnitude across all ten layers.',
    layerValueText: (layer, formattedValue) => `Layer ${layer}: ${formattedValue}`,
  },
};
