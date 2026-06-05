# Track Mathematics Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fusionner les quatre tracks de mathématiques mono-stage en un seul track multi-stages `track-mathematics`, publier le track astrophysique, et livrer le tout dans la PR #71.

**Architecture:** Contenu géré par les collections Astro (`src/content/tracks/*.yaml`, validées par schéma Zod au build). L'ordre d'affichage est une constante `TRACK_ORDER` dans `src/lib/tracks.ts`. Aucun test unitaire : le gate de chaque tâche est `npm run build` plus des vérifications grep explicites.

**Tech Stack:** Astro 5 (content collections), TypeScript strict, YAML.

**Référence:** spec validée `docs/superpowers/specs/2026-06-05-track-mathematics-merge-design.md`.

**Contraintes:**
- Travailler sur la branche `feature/track-astrophysics` (PR #71 ouverte). Ne PAS créer de nouvelle branche, ne PAS merger vers main.
- Ne jamais committer `public/audio/manifest.json` ni `src/content/courses-fr/logic-sets-proofs.yaml` (modifications locales non liées).
- Commandes à sortie volumineuse (`npm run build`) : exécuter via context-mode (`ctx_execute`) si disponible.
- Répertoire projet : `C:\Users\pierr\Documents\Developpements\Perso\personal-website`.

---

### Task 1: Créer le track fusionné et supprimer les quatre tracks mono-stage

**Files:**
- Create: `src/content/tracks/track-mathematics.yaml`
- Delete: `src/content/tracks/track-lycee.yaml`
- Delete: `src/content/tracks/track-prepa.yaml`
- Delete: `src/content/tracks/track-licence.yaml`
- Delete: `src/content/tracks/track-master.yaml`

- [ ] **Step 1: Créer `src/content/tracks/track-mathematics.yaml`** avec exactement ce contenu :

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

- [ ] **Step 2: Vérifier que les 38 cours du nouveau fichier couvrent exactement les anciens**

Run (PowerShell, depuis la racine du projet) :

```powershell
$old = Get-Content src/content/tracks/track-lycee.yaml, src/content/tracks/track-prepa.yaml, src/content/tracks/track-licence.yaml, src/content/tracks/track-master.yaml | Select-String '- course: (\S+)' | ForEach-Object { $_.Matches[0].Groups[1].Value }
$new = Get-Content src/content/tracks/track-mathematics.yaml | Select-String '- course: (\S+)' | ForEach-Object { $_.Matches[0].Groups[1].Value }
"old=$($old.Count) new=$($new.Count)"
Compare-Object $old $new
```

Expected: `old=38 new=38` et `Compare-Object` ne renvoie **rien** (aucune différence).

- [ ] **Step 3: Supprimer les quatre anciens fichiers**

```powershell
git rm src/content/tracks/track-lycee.yaml src/content/tracks/track-prepa.yaml src/content/tracks/track-licence.yaml src/content/tracks/track-master.yaml
```

Expected: `rm 'src/content/tracks/track-lycee.yaml'` (et les 3 autres lignes).

- [ ] **Step 4: Build de vérification**

Run: `npm run build` (via ctx_execute si disponible).
Expected: build sans erreur. Le nombre de pages diminue par rapport aux 76 actuelles (4 pages de track FR/EN en moins, 1 en plus, soit ~73 selon les routes générées) — l'important : zéro erreur de schéma de contenu.

- [ ] **Step 5: Commit**

```powershell
git add src/content/tracks/track-mathematics.yaml
git commit -m "feat(tracks): merge mathematics tracks into a single multi-stage track"
```

Expected: commit créé avec 5 fichiers changés (1 création + 4 suppressions, les `git rm` étant déjà stagés).

---

### Task 2: Mettre à jour TRACK_ORDER et le commentaire JSDoc

**Files:**
- Modify: `src/lib/tracks.ts:24` (constante) et `src/lib/tracks.ts:34-37` (JSDoc de `listTracks`)

- [ ] **Step 1: Remplacer la constante `TRACK_ORDER`**

Avant :

```typescript
const TRACK_ORDER = ['track-lycee', 'track-prepa', 'track-licence', 'track-master', 'track-ai'];
```

Après :

```typescript
const TRACK_ORDER = ['track-mathematics', 'track-ai', 'track-astrophysics'];
```

- [ ] **Step 2: Reformuler le JSDoc de `listTracks`**

Avant :

```typescript
/**
 * Returns the visible tracks, ordered from high school to AI. In production,
 * tracks marked published: false are hidden; in dev they are always shown.
 */
```

Après :

```typescript
/**
 * Returns the visible tracks, ordered by discipline. In production, tracks
 * marked published: false are hidden; in dev they are always shown.
 */
```

- [ ] **Step 3: Vérifier qu'aucune référence résiduelle aux anciens slugs ne subsiste**

Run:

```powershell
git grep -n -E "track-(lycee|prepa|licence|master)" -- src
```

Expected: aucune sortie (exit code 1 de git grep = aucun match, c'est le résultat attendu).

- [ ] **Step 4: Build de vérification**

Run: `npm run build` (via ctx_execute si disponible).
Expected: build sans erreur.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/tracks.ts
git commit -m "refactor(tracks): update track order for merged mathematics track"
```

Expected: commit créé, 1 fichier changé.

---

### Task 3: Committer la publication du track astrophysique et pousser

**Files:**
- Modify: `src/content/tracks/track-astrophysics.yaml:3` (déjà modifié dans le working tree : `published: false` → `published: true`)

- [ ] **Step 1: Vérifier que la modification locale est bien celle attendue**

Run:

```powershell
git diff src/content/tracks/track-astrophysics.yaml
```

Expected: un seul hunk, `-published: false` / `+published: true`.

- [ ] **Step 2: Commit**

```powershell
git add src/content/tracks/track-astrophysics.yaml
git commit -m "feat(tracks): publish astrophysics track"
```

Expected: commit créé, 1 fichier changé. `public/audio/manifest.json` et `src/content/courses-fr/logic-sets-proofs.yaml` restent non commités.

- [ ] **Step 3: Vérifier l'état final du working tree**

Run:

```powershell
git status -sb
```

Expected: seules lignes restantes : ` M public/audio/manifest.json` et ` M src/content/courses-fr/logic-sets-proofs.yaml`.

- [ ] **Step 4: Push vers la PR #71**

```powershell
git push
```

Expected: push accepté sur `origin/feature/track-astrophysics`, la PR #71 est mise à jour.
