# Track « Astrophysique » — design

Date : 2026-06-05
Statut : validé

## Objectif

Ajouter un parcours académique d'astrophysique au site, sous forme de track
(`src/content/tracks/track-astrophysics.yaml`), sur le modèle de `track-ai`.
Le track sert de vision d'ensemble : il référence des cours qui seront écrits
progressivement.

## Décisions

1. **Forme** : track académique (stages `lycee → prepa → licence → master`),
   pas un cours unique ni un program de recherche.
2. **Périmètre** : astro pur. Le socle de physique généraliste (mécanique,
   thermodynamique, électromagnétisme, quantique) est un prérequis mentionné
   dans `audience`, pas une liste de cours du track. Exception : la relativité
   générale fait partie du track (jamais dans le socle bac+2/+3, prérequis
   immédiat de la cosmologie et des objets compacts).
3. **Branches retenues** : planétologie/exoplanètes, hautes énergies et
   multi-messagers, astrophysique numérique, observation/instrumentation —
   en plus du cœur (mécanique céleste, stellaire, galaxies, RG, cosmologie,
   objets compacts).
4. **Hors périmètre** : les ponts vers l'informatique (mécanique orbitale pour
   le jeu vidéo, logiciel de vol spatial) seront des cours indépendants
   `theme: systems`, créés plus tard, éventuellement regroupés dans un futur
   track dédié. L'astrophysique numérique reste dans le track (physique
   computationnelle).
5. **Taxonomie** : track `theme: physics` ; cours `subtheme: astronomy`
   (lycée, observation) ou `astrophysics` (le reste) ; `general-relativity`
   en `subtheme: relativity`. Aucune modification de `taxonomy.ts` requise.
6. **Publication** : `published: false` tant que les premiers cours
   n'existent pas. Tous les cours en `required` par défaut.
7. **Sémantique des stages** : niveaux de progression (terminale, bac+1/+2,
   L3, M1/M2), pas des institutions — prépa et licence ne sont pas
   redondantes.

## Curriculum (13 cours)

| Stage | Cours | Contenu |
|---|---|---|
| lycee | `positional-astronomy` | Sphère céleste, coordonnées, mouvements apparents, saisons, éclipses |
| lycee | `solar-system-tour` | Planètes, échelles de distances, lois de Kepler empiriques |
| prepa | `celestial-mechanics` | Problème à deux corps, orbites, Hohmann, points de Lagrange |
| prepa | `observational-astronomy` | Télescopes, magnitudes, photométrie, spectroscopie, interférométrie |
| licence | `radiative-transfer` | Corps noir, raies spectrales, opacités |
| licence | `stellar-physics` | Équilibre hydrostatique, fusion, diagramme HR, évolution, nucléosynthèse |
| licence | `planetology-exoplanets` | Formation planétaire, transits, vitesses radiales, habitabilité |
| licence | `galaxies-interstellar-medium` | Voie lactée, classification de Hubble, courbes de rotation, matière noire |
| master | `general-relativity` | Espace-temps courbe, équations d'Einstein, Schwarzschild, FLRW |
| master | `compact-objects` | Naines blanches, étoiles à neutrons, trous noirs, accrétion |
| master | `cosmology` | Expansion, CMB, nucléosynthèse primordiale, inflation, ΛCDM |
| master | `high-energy-multimessenger` | Supernovæ, sursauts gamma, AGN, ondes gravitationnelles, neutrinos |
| master | `computational-astrophysics` | N-corps, hydrodynamique SPH, pipelines de données |

Choix pédagogiques : `radiative-transfer` précède `stellar-physics` (la
lumière est la source de presque toute l'information en astrophysique) ;
`general-relativity` ouvre le stage master.

## Prochaines étapes

1. Créer `track-astrophysics.yaml` (cette PR).
2. Écrire le premier cours (`positional-astronomy` recommandé) avec ses
   modules MDX FR/EN.
3. Publier le track quand 2-3 cours existent.
