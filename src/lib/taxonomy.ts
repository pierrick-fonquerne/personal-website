export const THEMES = [
  'architecture',
  'math',
  'ai',
  'systems',
  'data',
  'security',
  'network',
  'quant',
  'tooling',
  'physics',
  'algorithms',
  'cs-theory',
  'electronics',
  'signal',
  'control',
  'mechanics',
] as const;

export type Theme = (typeof THEMES)[number];

export const DISCIPLINES = ['mathematics', 'physics', 'computer-science', 'engineering'] as const;

export type Discipline = (typeof DISCIPLINES)[number];

export const ACADEMIC_STAGES = ['lycee', 'prepa', 'licence', 'master'] as const;

export type AcademicStage = (typeof ACADEMIC_STAGES)[number];

export const SUBTHEMES_BY_THEME = {
  architecture: ['clean-architecture', 'ddd', 'mediator-sagas', 'event-sourcing-cqrs'],
  math: [
    'foundations',
    'linear-algebra',
    'abstract-algebra',
    'number-theory',
    'real-analysis',
    'differential-calculus',
    'complex-analysis',
    'differential-equations',
    'measure-theory',
    'functional-analysis',
    'geometry',
    'topology',
    'differential-geometry',
    'probabilities',
    'statistics',
    'optimization',
    'information-theory',
    'numerical-methods',
    'graph-theory',
  ],
  ai: ['neural-nets', 'autonomous-agents', 'llm-mcp'],
  systems: ['async-perf', 'embedded-rust', 'kernel-no-std'],
  data: ['storage-engines', 'event-stores', 'rebac', 'ledgers'],
  security: ['applied-crypto', 'auth', 'audit'],
  network: ['http-api', 'grpc', 'email-systems'],
  quant: ['indicators', 'strategies', 'backtesting'],
  tooling: ['cli-rust', 'iac', 'ci-self-hosted', 'polyglot-orchestration', 'mcp-servers'],
  physics: [
    'classical-mechanics',
    'electromagnetism',
    'thermodynamics',
    'optics-waves',
    'relativity',
    'quantum-physics',
    'statistical-physics',
    'astronomy',
    'astrophysics',
  ],
  algorithms: ['data-structures', 'complexity', 'graph-algorithms', 'dynamic-programming'],
  'cs-theory': ['computability', 'automata-languages', 'logic', 'type-theory'],
  electronics: ['analog-circuits', 'digital-electronics', 'microcontrollers', 'power-electronics'],
  signal: ['signals-systems', 'fourier-analysis', 'dsp'],
  control: ['control-theory', 'state-space', 'robotics'],
  mechanics: ['statics-dynamics', 'strength-materials', 'fluid-mechanics'],
} as const satisfies Record<Theme, readonly string[]>;

export type Subtheme = (typeof SUBTHEMES_BY_THEME)[Theme][number];

export type MathSubtheme = (typeof SUBTHEMES_BY_THEME)['math'][number];

export const DISCIPLINE_OF_THEME = {
  math: 'mathematics',
  physics: 'physics',
  architecture: 'computer-science',
  ai: 'computer-science',
  systems: 'computer-science',
  data: 'computer-science',
  security: 'computer-science',
  network: 'computer-science',
  quant: 'computer-science',
  tooling: 'computer-science',
  algorithms: 'computer-science',
  'cs-theory': 'computer-science',
  electronics: 'engineering',
  signal: 'engineering',
  control: 'engineering',
  mechanics: 'engineering',
} as const satisfies Record<Theme, Discipline>;

export function isKnownSubtheme(theme: Theme, subtheme: string): boolean {
  return (SUBTHEMES_BY_THEME[theme] as readonly string[]).includes(subtheme);
}
