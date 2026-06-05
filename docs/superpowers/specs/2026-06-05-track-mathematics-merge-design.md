# Fusion des tracks mathématiques — Design

Date : 2026-06-05
Statut : validé
PR cible : #71 (`feature/track-astrophysics`)

## Objectif

Fusionner les quatre tracks de mathématiques mono-stage (`track-lycee`,
`track-prepa`, `track-licence`, `track-master`) en un seul track
multi-stages `track-mathematics`, sur le modèle de `track-astrophysics`.
Le track `track-ai` est exclu de la fusion. Le track `track-astrophysics`
passe en `published: true` (modification locale existante, à committer).

## Contexte

Les tracks mono-stage représentaient des niveaux institutionnels (lycée,
prépa, licence, master). Le design du track astrophysique a établi le
modèle cible : un track représente une **discipline**, les stages
structurent la progression par niveau. La fusion aligne les mathématiques
sur ce modèle.

## Décisions

1. **Slug** : `track-mathematics` (cohérent avec `track-astrophysics`,
   nom de discipline complet). Titre FR « Mathématiques », EN
   « Mathematics ».
2. **Publication** : `published: true`. Les cours non encore écrits
   s'affichent en « upcoming » via `resolveStages`.
3. **Ordre d'affichage** : Maths → IA → Astro, soit
   `TRACK_ORDER = ['track-mathematics', 'track-ai', 'track-astrophysics']`.
   `track-astrophysics`, absent de la constante jusqu'ici, y est ajouté
   explicitement.
4. **Suppression** des quatre fichiers mono-stage : la fusion est un
   remplacement, conserver les anciens fichiers créerait des doublons en
   dev.
5. **Curriculum inchangé** : les 38 cours sont repris tels quels, dans
   l'ordre existant, regroupés par stage (lycee 7, prepa 10, licence 13,
   master 8). Aucun ajout, retrait ni réordonnancement.
6. **Aucune redirection nécessaire** : les quatre tracks étaient
   `published: false`, donc jamais exposés en production.

## Contenu du nouveau track

`src/content/tracks/track-mathematics.yaml` :

```yaml
slug: track-mathematics
theme: math
published: true

fr:
  title: Mathématiques
  tagline: Le parcours complet, du calcul du lycée à l'analyse du master.
  summary: >-
    Un parcours mathématique intégral en quatre paliers : le socle du lycée
    (algèbre, fonctions, probabilités), la rigueur de la prépa (algèbre
    linéaire, analyse réelle), l'abstraction de la licence (groupes, topologie,
    analyse complexe, Lebesgue) et la spécialisation du master (analyse
    fonctionnelle, EDP, optimisation, théorie de l'information).
  audience: >-
    Toute personne qui apprend ou reprend les mathématiques : du débutant qui
    consolide le lycée au chercheur ou à l'ingénieur visant les outils avancés,
    notamment pour l'intelligence artificielle.

en:
  title: Mathematics
  tagline: The complete journey, from high school calculus to graduate analysis.
  summary: >-
    A complete mathematics track in four stages: the high school foundation
    (algebra, functions, probability), the rigor of preparatory classes (linear
    algebra, real analysis), the abstraction of undergraduate studies (groups,
    topology, complex analysis, Lebesgue) and graduate specialization
    (functional analysis, PDEs, optimization, information theory).
  audience: >-
    Anyone learning or relearning mathematics: from beginners consolidating
    high school level to researchers and engineers seeking advanced tools,
    notably for artificial intelligence.

stages:
  - stage: lycee
    courses:
      - course: logic-sets-proofs
      - course: combinatorics-counting
      - course: vectors-analytic-geometry
      - course: sequences-limits
      - course: continuity-differentiation
      - course: discrete-probability
      - course: euclidean-affine-geometry
  - stage: prepa
    courses:
      - course: integer-arithmetic
      - course: polynomials
      - course: linear-systems-matrices
      - course: vector-spaces-linear-maps
      - course: eigen-reduction
      - course: numerical-series
      - course: riemann-integration
      - course: ordinary-differential-equations
      - course: metric-spaces-topology
      - course: random-variables-continuous
  - stage: licence
    courses:
      - course: group-theory
      - course: rings-fields
      - course: number-theory-crypto
      - course: euclidean-spaces-svd
      - course: function-sequences-series
      - course: multivariable-calculus
      - course: complex-analysis
      - course: measure-lebesgue
      - course: projective-geometry
      - course: limit-theorems
      - course: inferential-statistics
      - course: numerical-analysis
      - course: graph-theory
  - stage: master
    courses:
      - course: partial-differential-equations
      - course: hilbert-banach-spaces
      - course: curves-surfaces-manifolds
      - course: markov-chains
      - course: bayesian-statistics
      - course: convex-optimization
      - course: stochastic-optimization
      - course: information-theory
```

## Modifications de code

`src/lib/tracks.ts` :

- `TRACK_ORDER` devient
  `['track-mathematics', 'track-ai', 'track-astrophysics']`.
- Le commentaire JSDoc de `listTracks` (« ordered from high school to AI »)
  est reformulé pour refléter l'ordre par discipline.

## Fichiers supprimés

- `src/content/tracks/track-lycee.yaml`
- `src/content/tracks/track-prepa.yaml`
- `src/content/tracks/track-licence.yaml`
- `src/content/tracks/track-master.yaml`

## Livraison

Commit sur la branche `feature/track-astrophysics` (PR #71), incluant
également le passage de `track-astrophysics.yaml` en `published: true`.
Les fichiers non liés du working tree (`public/audio/manifest.json`,
`src/content/courses-fr/logic-sets-proofs.yaml`) restent non commités.
Build complet de validation avant commit.

## Validation

- `npm run build` sans erreur, les pages de tracks générées reflètent
  trois tracks dans l'ordre Maths → IA → Astro.
- La page `/tracks/track-mathematics` affiche 38 cours répartis sur
  quatre stages, statuts « published »/« upcoming » corrects.
- Aucune référence résiduelle aux quatre anciens slugs dans `src/`.
