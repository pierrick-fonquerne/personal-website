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
] as const;

export type Theme = (typeof THEMES)[number];

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
} as const satisfies Record<Theme, readonly string[]>;

export type Subtheme = (typeof SUBTHEMES_BY_THEME)[Theme][number];

export function isKnownSubtheme(theme: Theme, subtheme: string): boolean {
  return (SUBTHEMES_BY_THEME[theme] as readonly string[]).includes(subtheme);
}
