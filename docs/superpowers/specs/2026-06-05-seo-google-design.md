# Design — Améliorer l'affichage du site dans Google

**Date** : 2026-06-05
**Statut** : validé (sections 1 à 4 approuvées le 2026-06-05)

## Contexte et problème

Recherche Google « pierrick fonquerne » : le portfolio apparaît en 3ᵉ position,
**en anglais** (« Passionate full-stack developer… ») avec la mention « Traduire
cette page », sans rich results, derrière Societe.com et LinkedIn.

**État des lieux du site** (`personal-website`, Astro) :

| Élément | État |
|---|---|
| canonical, hreflang fr/en, OG, Twitter Cards | ✅ en place (`BaseLayout.astro`) |
| Sitemap (`@astrojs/sitemap`), RSS | ✅ en place |
| Données structurées JSON-LD | ❌ absentes |
| `robots.txt` | ❌ absent de `public/` |
| Redirect JS de langue (`navigator.language`) | ⚠️ cause l'indexation EN de la home (Googlebot rend le JS en locale en-US) |

## Décisions de cadrage (validées)

- **Objectif** : audit complet — rich results, fix langue, fondations, ranking sur le nom.
- **Identité du schéma `Person`** : *Développeur full-stack* (cohérent avec LinkedIn et le portfolio — la cohérence inter-sources est un signal fort pour Google).
- **Fix langue** : bannière de suggestion, suppression du redirect automatique.
- **Approche retenue** : A — composant JSON-LD central avec `@graph`, typé `schema-dts`.

---

## Section 1 — Architecture (✅ validée)

Nouveau composant `src/components/seo/StructuredData.astro`, injecté une seule
fois dans le `<head>` de `BaseLayout.astro`.

```
Page (.astro) ──props──▶ BaseLayout ──▶ StructuredData ──▶ <script type="application/ld+json">
```

- `BaseLayout` gagne une prop optionnelle `schema?: Thing[]` (types `schema-dts`).
- `StructuredData` émet toujours le socle `WebSite` + `Person`, avec des `@id` stables :
  - `https://pierrick.fonquerne.com/#person`
  - `https://pierrick.fonquerne.com/#website`
- Les nœuds passés par les pages (`Course`, `Article`, `BreadcrumbList`…) sont
  fusionnés dans le même `@graph` et référencent le socle par `@id`.
- Constantes d'identité centralisées dans `src/lib/seo.ts` (nom, jobTitle,
  sameAs, photo) — un seul endroit à maintenir.
- `schema-dts` en `devDependency` : types purs, zéro impact bundle, JSON-LD
  sérialisé au build (SSG).

## Section 2 — Schémas par type de page

| Page | Nœuds JSON-LD |
|---|---|
| Toutes | `WebSite` (name, url, inLanguage, publisher → `#person`) + `Person` |
| Accueil | `Person` enrichi (description, image, sameAs) |
| À propos (`/about`) | `ProfilePage` avec `mainEntity` → `#person` (rich result « Profile page ») |
| Cours (`/interactive-courses/[course]`) | `Course` : name, description, inLanguage, `author` → `#person`, `provider` → `#person`, `offers` (price 0, gratuit), `hasCourseInstance` (courseMode online) — champs requis par Google pour le rich result « Course info » |
| Modules de cours | `BreadcrumbList` + `LearningResource` rattaché au cours (`isPartOf`) |
| Recherche (`/research/[slug]`) | `ScholarlyArticle` : headline, author → `#person`, inLanguage |
| Pages profondes (cours, modules, recherche, tracks) | `BreadcrumbList` : Accueil › Section › Page |

`Person` (socle) :

- `name`, `jobTitle` : « Développeur full-stack » / « Full-Stack Developer » selon la locale
- `url` : `https://pierrick.fonquerne.com`
- `image` : photo à fournir (ex. `public/pierrick-fonquerne.jpg`) — requise pour
  espérer une photo dans les résultats
- `sameAs` : reprise des deux liens sociaux déjà présents dans le footer
  (LinkedIn, profil de code public) — décision validée
- `knowsAbout` : liste courte (.NET, Rust, TypeScript, architecture logicielle,
  réseaux de neurones…) — aide Google à thématiser l'entité

Hors périmètre v1 (YAGNI) : `ItemList` sur les tracks, balisage du glossaire.
Ajoutables ensuite si les rich results Course fonctionnent.

## Section 3 — Fix langue : bannière de suggestion

1. **Supprimer** le script inline de redirect dans `BaseLayout.astro` (l. 97-120).
2. **Nouveau composant** `src/components/layout/LanguageSuggestBanner.astro` :
   - Affichée si `navigator.language` ne correspond pas à la locale de la page
     **et** qu'aucune préférence `localStorage('lang')` n'existe.
   - « This page is also available in English → View » (et symétrique FR).
   - Deux actions : basculer (écrit `lang` puis navigue via `switchLocalePath`)
     ou fermer (écrit `lang` = locale courante).
   - Position `fixed` en bas — **zéro layout shift** (CLS est un facteur de
     ranking Core Web Vitals).
3. Le switch manuel existant (`LanguageSwitch.astro`) continue d'écrire la même
   clé `localStorage` ; aucune autre modification.

Résultat : Googlebot indexe chaque URL dans sa vraie langue, hreflang fait le
reste. Aucun contenu différent servi aux bots (pas de cloaking).

## Section 4 — Fondations techniques et validation

- **`public/robots.txt`** : autorise tout, déclare
  `Sitemap: https://pierrick.fonquerne.com/sitemap-index.xml`.
- **Compléments meta** dans `BaseLayout` : `og:site_name`, `og:image:width/height/alt`, `twitter:image`.
- **Sitemap i18n** : activer l'option `i18n` de `@astrojs/sitemap` (annotations
  hreflang directement dans le sitemap).
- **Photo de profil** : à fournir par Pierrick (carré ≥ 500×500, JPEG/WebP).

**Validation / critères de succès** :

1. `npm run build` sans erreur (TS strict + schema-dts = vérification de types des schémas).
2. Pages clés (home, un cours, une page recherche) passent le **Rich Results Test**
   de Google et validator.schema.org sans erreur ni avertissement bloquant.
3. Après déploiement : demande de réindexation de la home dans Search Console ;
   vérifier sous 1-2 semaines que la home FR s'affiche en français pour une
   recherche FR.
4. Suivi Search Console (rapport « Améliorations ») : apparition des entrées
   Breadcrumbs / Course / Profile page.

**Limites honnêtes** : les sitelinks et le knowledge panel restent à la
discrétion de Google — la structure, les breadcrumbs et la cohérence de
l'entité maximisent les chances sans les garantir. Passer devant Societe.com
sur la requête nom est probable à moyen terme (entité mieux décrite), pas
immédiat.
