import type { MathSubtheme } from './taxonomy';

/**
 * Lightweight display metadata for a math course, keyed by course slug.
 *
 * This is the single source of truth for course titles shown in tracks before
 * the full course content exists. The published / upcoming status is not stored
 * here: it is derived at render time by checking whether a published course
 * entry exists for the slug.
 */
export interface CourseCatalogEntry {
  subtheme: MathSubtheme;
  fr: string;
  en: string;
}

export const COURSE_CATALOG: Record<string, CourseCatalogEntry> = {
  'logic-sets-proofs': {
    subtheme: 'foundations',
    fr: 'Logique, ensembles et démonstration',
    en: 'Logic, sets and proofs',
  },
  'combinatorics-counting': {
    subtheme: 'foundations',
    fr: 'Combinatoire et dénombrement',
    en: 'Combinatorics and counting',
  },

  'vectors-analytic-geometry': {
    subtheme: 'linear-algebra',
    fr: 'Calcul vectoriel et géométrie analytique',
    en: 'Vectors and analytic geometry',
  },
  'linear-systems-matrices': {
    subtheme: 'linear-algebra',
    fr: 'Systèmes linéaires et matrices',
    en: 'Linear systems and matrices',
  },
  'vector-spaces-linear-maps': {
    subtheme: 'linear-algebra',
    fr: 'Espaces vectoriels et applications linéaires',
    en: 'Vector spaces and linear maps',
  },
  'eigen-reduction': {
    subtheme: 'linear-algebra',
    fr: 'Réduction des endomorphismes',
    en: 'Eigenvalues and diagonalization',
  },
  'euclidean-spaces-svd': {
    subtheme: 'linear-algebra',
    fr: 'Espaces euclidiens et SVD',
    en: 'Euclidean spaces and SVD',
  },

  'integer-arithmetic': {
    subtheme: 'abstract-algebra',
    fr: 'Arithmétique dans Z',
    en: 'Integer arithmetic',
  },
  polynomials: {
    subtheme: 'abstract-algebra',
    fr: 'Polynômes et fractions rationnelles',
    en: 'Polynomials and rational fractions',
  },
  'group-theory': { subtheme: 'abstract-algebra', fr: 'Groupes', en: 'Group theory' },
  'rings-fields': { subtheme: 'abstract-algebra', fr: 'Anneaux et corps', en: 'Rings and fields' },

  'number-theory-crypto': {
    subtheme: 'number-theory',
    fr: 'Théorie des nombres et cryptographie',
    en: 'Number theory and cryptography',
  },

  'sequences-limits': {
    subtheme: 'real-analysis',
    fr: 'Suites numériques et limites',
    en: 'Sequences and limits',
  },
  'continuity-differentiation': {
    subtheme: 'real-analysis',
    fr: 'Continuité et dérivabilité',
    en: 'Continuity and differentiation',
  },
  'numerical-series': {
    subtheme: 'real-analysis',
    fr: 'Séries numériques',
    en: 'Numerical series',
  },
  'riemann-integration': {
    subtheme: 'real-analysis',
    fr: 'Intégration de Riemann',
    en: 'Riemann integration',
  },
  'function-sequences-series': {
    subtheme: 'real-analysis',
    fr: 'Suites et séries de fonctions',
    en: 'Sequences and series of functions',
  },

  'multivariable-calculus': {
    subtheme: 'differential-calculus',
    fr: 'Fonctions de plusieurs variables',
    en: 'Multivariable calculus',
  },

  'complex-analysis': {
    subtheme: 'complex-analysis',
    fr: 'Fonctions holomorphes',
    en: 'Complex analysis',
  },

  'ordinary-differential-equations': {
    subtheme: 'differential-equations',
    fr: 'Équations différentielles ordinaires',
    en: 'Ordinary differential equations',
  },
  'partial-differential-equations': {
    subtheme: 'differential-equations',
    fr: 'Équations aux dérivées partielles',
    en: 'Partial differential equations',
  },

  'measure-lebesgue': {
    subtheme: 'measure-theory',
    fr: 'Mesure et intégrale de Lebesgue',
    en: 'Measure and Lebesgue integration',
  },

  'hilbert-banach-spaces': {
    subtheme: 'functional-analysis',
    fr: 'Espaces de Hilbert et Banach',
    en: 'Hilbert and Banach spaces',
  },

  'euclidean-affine-geometry': {
    subtheme: 'geometry',
    fr: 'Géométrie euclidienne et affine',
    en: 'Euclidean and affine geometry',
  },
  'projective-geometry': {
    subtheme: 'geometry',
    fr: 'Géométrie projective',
    en: 'Projective geometry',
  },

  'metric-spaces-topology': {
    subtheme: 'topology',
    fr: 'Espaces métriques et topologie',
    en: 'Metric spaces and topology',
  },

  'curves-surfaces-manifolds': {
    subtheme: 'differential-geometry',
    fr: 'Courbes, surfaces et variétés',
    en: 'Curves, surfaces and manifolds',
  },

  'discrete-probability': {
    subtheme: 'probabilities',
    fr: 'Probabilités discrètes',
    en: 'Discrete probability',
  },
  'random-variables-continuous': {
    subtheme: 'probabilities',
    fr: 'Variables aléatoires et lois continues',
    en: 'Random variables and continuous laws',
  },
  'limit-theorems': { subtheme: 'probabilities', fr: 'Théorèmes limites', en: 'Limit theorems' },
  'markov-chains': { subtheme: 'probabilities', fr: 'Chaînes de Markov', en: 'Markov chains' },

  'inferential-statistics': {
    subtheme: 'statistics',
    fr: 'Statistique inférentielle',
    en: 'Inferential statistics',
  },
  'bayesian-statistics': {
    subtheme: 'statistics',
    fr: 'Statistique bayésienne',
    en: 'Bayesian statistics',
  },

  'convex-optimization': {
    subtheme: 'optimization',
    fr: 'Optimisation convexe',
    en: 'Convex optimization',
  },
  'stochastic-optimization': {
    subtheme: 'optimization',
    fr: 'Optimisation stochastique',
    en: 'Stochastic optimization',
  },

  'information-theory': {
    subtheme: 'information-theory',
    fr: "Théorie de l'information",
    en: 'Information theory',
  },

  'numerical-analysis': {
    subtheme: 'numerical-methods',
    fr: 'Analyse numérique',
    en: 'Numerical analysis',
  },

  'graph-theory': { subtheme: 'graph-theory', fr: 'Théorie des graphes', en: 'Graph theory' },
};
