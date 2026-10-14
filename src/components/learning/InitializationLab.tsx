import type { JSX } from 'react';
import type {
  Activation,
  InitializationScheme,
  LabMode,
} from './initialization/initializationLogic';
import type { Locale } from './initialization/initializationProjection';

interface InitializationLabProps {
  locale: Locale;
  defaultMode?: LabMode;
  defaultActivation?: Activation;
  defaultScheme?: InitializationScheme;
  defaultBatchNormalized?: boolean;
}

export default function InitializationLab(_props: InitializationLabProps): JSX.Element {
  throw new Error('not implemented');
}
