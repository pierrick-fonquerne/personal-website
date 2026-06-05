# SEO Rich Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Émettre un graphe JSON-LD schema.org sur toutes les pages, remplacer le redirect JS de langue par une bannière de suggestion, et compléter les fondations SEO (robots.txt, sitemap i18n, meta sociales).

**Architecture:** Un module `src/lib/seo.ts` centralise l'identité (Person/WebSite avec `@id` stables) et expose des builders typés `schema-dts`. Un composant `StructuredData.astro` injecté dans `BaseLayout` sérialise le graphe ; chaque page passe ses nœuds spécifiques via une prop `schema`. La bannière de langue remplace le script de redirect supprimé de `BaseLayout`.

**Tech Stack:** Astro 6 (SSG), TypeScript strict, schema-dts (devDependency, types only), Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-06-05-seo-google-design.md`
**Branche:** `feature/seo-rich-results` (déjà créée, spec committé)

**Vérification (pas de framework de test dans ce repo) :** chaque tâche est validée par `npx astro check` (types), `npm run lint`, `npm run build` et inspection du HTML généré dans `dist/`. C'est la même batterie que la CI.

**Conformité repo :** aucun commentaire inline superflu, commits conventionnels en anglais (`feat(seo): …`), aucune mention d'outil IA ni de nom de plateforme concurrente dans le code ou les commits (les URLs de profils viennent de `SITE` dans `src/lib/links.ts`, jamais en littéral).

---

### Task 1: Module d'identité `src/lib/seo.ts` + dépendance schema-dts

**Files:**
- Modify: `package.json` (devDependency)
- Create: `src/lib/seo.ts`

- [ ] **Step 1: Installer schema-dts**

Run: `npm install --save-dev schema-dts`
Expected: ajout dans `devDependencies`, lockfile mis à jour.

- [ ] **Step 2: Créer `src/lib/seo.ts`**

```ts
import type {
  BreadcrumbList,
  Course,
  Graph,
  LearningResource,
  Person,
  ProfilePage,
  ScholarlyArticle,
  Thing,
  WebSite,
} from 'schema-dts';
import type { Locale } from './i18n';
import { SITE } from './links';

export const SITE_URL = 'https://pierrick.fonquerne.com';
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const IN_LANGUAGE: Record<Locale, string> = {
  fr: 'fr-FR',
  en: 'en-US',
};

const JOB_TITLE: Record<Locale, string> = {
  fr: 'Développeur full-stack',
  en: 'Full-Stack Developer',
};

const PERSON_DESCRIPTION: Record<Locale, string> = {
  fr: 'Développeur full-stack — .NET, Rust, TypeScript. Cours interactifs et recherche en informatique.',
  en: 'Full-stack developer — .NET, Rust, TypeScript. Interactive courses and computer science research.',
};

const KNOWS_ABOUT: readonly string[] = [
  '.NET',
  'C#',
  'Rust',
  'TypeScript',
  'Software architecture',
  'Neural networks',
];

/**
 * Builds the Person node shared by every page of the site.
 * Stable @id lets search engines merge references across pages.
 */
export function buildPersonNode(locale: Locale): Person {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: SITE.name,
    url: `${SITE_URL}/`,
    jobTitle: JOB_TITLE[locale],
    description: PERSON_DESCRIPTION[locale],
    sameAs: [SITE.linkedin, SITE.github, SITE.crates],
    knowsAbout: [...KNOWS_ABOUT],
  };
}

/**
 * Builds the WebSite node shared by every page of the site.
 */
export function buildWebSiteNode(locale: Locale): WebSite {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE.name,
    url: `${SITE_URL}/`,
    inLanguage: IN_LANGUAGE[locale],
    publisher: { '@id': PERSON_ID },
  };
}

/**
 * Assembles the page graph: base identity nodes plus page-specific nodes.
 */
export function buildGraph(locale: Locale, extra: readonly Thing[] = []): Graph {
  return {
    '@context': 'https://schema.org',
    '@graph': [buildWebSiteNode(locale), buildPersonNode(locale), ...extra],
  };
}

/**
 * Serializes a graph for a JSON-LD script tag. The lower-than sign is
 * escaped so user-provided text can never close the script element.
 */
export function serializeGraph(graph: Graph): string {
  return JSON.stringify(graph).replace(/</g, '\\u003c');
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/**
 * Builds a BreadcrumbList from ordered site-relative paths.
 */
export function buildBreadcrumb(items: readonly BreadcrumbItem[]): BreadcrumbList {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export interface CourseNodeInput {
  locale: Locale;
  path: string;
  title: string;
  summary: string;
  moduleCount: number;
}

/**
 * Builds a Course node carrying the fields Google requires for the
 * course-info rich result: provider, offers and a course instance.
 */
export function buildCourseNode(input: CourseNodeInput): Course {
  return {
    '@type': 'Course',
    '@id': `${SITE_URL}${input.path}#course`,
    name: input.title,
    description: input.summary,
    url: `${SITE_URL}${input.path}`,
    inLanguage: IN_LANGUAGE[input.locale],
    author: { '@id': PERSON_ID },
    provider: {
      '@type': 'Organization',
      name: SITE.name,
      url: `${SITE_URL}/`,
    },
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'EUR',
      category: 'Free',
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
      courseWorkload: `PT${input.moduleCount * 30}M`,
    },
  };
}

export interface LearningResourceInput {
  locale: Locale;
  path: string;
  title: string;
  coursePath: string;
}

/**
 * Builds a LearningResource node for a course module, linked to its
 * parent course through the stable course @id.
 */
export function buildLearningResourceNode(input: LearningResourceInput): LearningResource {
  return {
    '@type': 'LearningResource',
    '@id': `${SITE_URL}${input.path}#resource`,
    name: input.title,
    url: `${SITE_URL}${input.path}`,
    inLanguage: IN_LANGUAGE[input.locale],
    author: { '@id': PERSON_ID },
    isPartOf: { '@id': `${SITE_URL}${input.coursePath}#course` },
  };
}

export interface ArticleNodeInput {
  locale: Locale;
  path: string;
  title: string;
  summary: string;
  publishedAt: Date;
}

/**
 * Builds a ScholarlyArticle node for a research page.
 */
export function buildArticleNode(input: ArticleNodeInput): ScholarlyArticle {
  return {
    '@type': 'ScholarlyArticle',
    '@id': `${SITE_URL}${input.path}#article`,
    headline: input.title,
    description: input.summary,
    url: `${SITE_URL}${input.path}`,
    inLanguage: IN_LANGUAGE[input.locale],
    author: { '@id': PERSON_ID },
    datePublished: input.publishedAt.toISOString().slice(0, 10),
  };
}

/**
 * Builds the ProfilePage node for the about pages.
 */
export function buildProfilePageNode(locale: Locale): ProfilePage {
  return {
    '@type': 'ProfilePage',
    inLanguage: IN_LANGUAGE[locale],
    mainEntity: { '@id': PERSON_ID },
  };
}
```

- [ ] **Step 3: Vérifier les types**

Run: `npx astro check`
Expected: 0 errors (warnings préexistants tolérés).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/seo.ts
git commit -m "feat(seo): add structured data identity and node builders"
```

---

### Task 2: Composant `StructuredData.astro` + intégration `BaseLayout`

**Files:**
- Create: `src/components/seo/StructuredData.astro`
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Créer `src/components/seo/StructuredData.astro`**

```astro
---
import type { Thing } from 'schema-dts';
import type { Locale } from '../../lib/i18n';
import { buildGraph, serializeGraph } from '../../lib/seo';

interface Props {
  locale: Locale;
  extra?: Thing[];
}

const { locale, extra = [] } = Astro.props;
const json = serializeGraph(buildGraph(locale, extra));
---

<script type="application/ld+json" set:html={json} is:inline />
```

- [ ] **Step 2: Brancher dans `BaseLayout.astro`**

Ajouter l'import après celui de `ScrollProgress` :

```ts
import StructuredData from '../components/seo/StructuredData.astro';
import type { Thing } from 'schema-dts';
```

Étendre l'interface Props (après `locale?: Locale;`) :

```ts
  schema?: Thing[];
```

Étendre la déstructuration (après `locale = getLocaleFromUrl(Astro.url),`) :

```ts
  schema = [],
```

Dans le `<head>`, juste après la balise `<link rel="canonical" …/>` :

```astro
    <StructuredData locale={locale} extra={schema} />
```

- [ ] **Step 3: Build et inspection du HTML généré**

Run: `npm run build`
Puis: `grep -c "application/ld+json" dist/index.html`
Expected: `1` — et `grep -o "#person" dist/index.html | head -1` retourne `#person`.

- [ ] **Step 4: Commit**

```bash
git add src/components/seo/StructuredData.astro src/layouts/BaseLayout.astro
git commit -m "feat(seo): emit json-ld graph from base layout"
```

---

### Task 3: ProfilePage sur les pages À propos (fr + en)

**Files:**
- Modify: `src/pages/about/index.astro`
- Modify: `src/pages/en/about/index.astro`

- [ ] **Step 1: Page FR — `src/pages/about/index.astro`**

Ajouter l'import (après celui de `useTranslations`) :

```ts
import { buildProfilePageNode } from '../../lib/seo';
```

Ajouter dans le frontmatter (après `const t = useTranslations(locale);`) :

```ts
const schema = [buildProfilePageNode(locale)];
```

Passer la prop au layout :

```astro
<BaseLayout
  title={`${t.about.indexTitle} · Pierrick Fonquerne`}
  description="Parcours, compétences et engagements de Pierrick Fonquerne, développeur full-stack basé à Limoux."
  current="/about"
  locale={locale}
  schema={schema}
>
```

- [ ] **Step 2: Page EN — `src/pages/en/about/index.astro`**

Même modification avec le chemin d'import EN :

```ts
import { buildProfilePageNode } from '../../../lib/seo';
```

```ts
const schema = [buildProfilePageNode(locale)];
```

```astro
<BaseLayout
  title={`${t.about.indexTitle} · Pierrick Fonquerne`}
  description="Background, skills and commitments of Pierrick Fonquerne, full-stack developer based in Limoux."
  current="/about"
  locale={locale}
  schema={schema}
>
```

- [ ] **Step 3: Vérifier**

Run: `npx astro check && npm run build`
Puis: `grep -c "ProfilePage" dist/about/index.html`
Expected: `1`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/about/index.astro src/pages/en/about/index.astro
git commit -m "feat(seo): mark about pages as profile pages"
```

---

### Task 4: Course + BreadcrumbList sur les fiches cours (fr + en)

**Files:**
- Modify: `src/pages/interactive-courses/[course]/index.astro`
- Modify: `src/pages/en/interactive-courses/[course]/index.astro`

- [ ] **Step 1: Page FR — `src/pages/interactive-courses/[course]/index.astro`**

Ajouter l'import (après celui de `i18n`) :

```ts
import { buildBreadcrumb, buildCourseNode } from '../../../lib/seo';
```

Ajouter dans le frontmatter, après `const modules = await listModulesOf(locale, courseSlug!);` :

```ts
const coursePath = localizedPath(`/interactive-courses/${courseSlug}`, locale);
const schema = [
  buildCourseNode({
    locale,
    path: coursePath,
    title: course.data.title,
    summary: course.data.summary,
    moduleCount: modules.length,
  }),
  buildBreadcrumb([
    { name: t.nav.home, path: localizedPath('/', locale) },
    { name: t.nav.courses, path: localizedPath('/interactive-courses', locale) },
    { name: course.data.title, path: coursePath },
  ]),
];
```

Passer la prop au layout :

```astro
<BaseLayout
  title={`${course.data.title} · ${t.courses.indexTitle}`}
  description={course.data.summary}
  current="/interactive-courses"
  locale={locale}
  schema={schema}
>
```

- [ ] **Step 2: Page EN — `src/pages/en/interactive-courses/[course]/index.astro`**

Mêmes ajouts avec le chemin d'import EN :

```ts
import { buildBreadcrumb, buildCourseNode } from '../../../../lib/seo';
```

Le bloc `coursePath`/`schema` et la prop `schema={schema}` sont identiques au Step 1 (la variable `locale` vaut `'en'` dans ce fichier, le reste du code est inchangé).

- [ ] **Step 3: Vérifier**

Run: `npx astro check && npm run build`
Puis (un slug de cours existant, par exemple via `ls dist/interactive-courses/`) :
`grep -c "\"@type\":\"Course\"" dist/interactive-courses/<slug>/index.html`
Expected: `1` (et `BreadcrumbList` présent dans le même fichier).

- [ ] **Step 4: Commit**

```bash
git add "src/pages/interactive-courses/[course]/index.astro" "src/pages/en/interactive-courses/[course]/index.astro"
git commit -m "feat(seo): add course and breadcrumb structured data"
```

---

### Task 5: LearningResource + BreadcrumbList sur les modules (fr + en)

**Files:**
- Modify: `src/pages/interactive-courses/[course]/[module].astro`
- Modify: `src/pages/en/interactive-courses/[course]/[module].astro`

- [ ] **Step 1: Page FR — `src/pages/interactive-courses/[course]/[module].astro`**

Ajouter l'import (après celui de `i18n`) :

```ts
import { buildBreadcrumb, buildLearningResourceNode } from '../../../lib/seo';
```

Ajouter dans le frontmatter, après `const sidebarModules = …;` :

```ts
const coursePath = localizedPath(`/interactive-courses/${courseSlug}`, locale);
const modulePath = localizedPath(`/interactive-courses/${courseSlug}/${moduleSlug}`, locale);
const schema = [
  buildLearningResourceNode({
    locale,
    path: modulePath,
    title: current.data.title,
    coursePath,
  }),
  buildBreadcrumb([
    { name: t.nav.home, path: localizedPath('/', locale) },
    { name: t.nav.courses, path: localizedPath('/interactive-courses', locale) },
    { name: course.data.title, path: coursePath },
    { name: current.data.title, path: modulePath },
  ]),
];
```

Ajouter `schema={schema}` aux props du `<BaseLayout …>` existant (même pattern que Task 4).

- [ ] **Step 2: Page EN — `src/pages/en/interactive-courses/[course]/[module].astro`**

Mêmes ajouts avec le chemin d'import EN :

```ts
import { buildBreadcrumb, buildLearningResourceNode } from '../../../../lib/seo';
```

Le bloc `coursePath`/`modulePath`/`schema` et la prop `schema={schema}` sont identiques au Step 1.

- [ ] **Step 3: Vérifier**

Run: `npx astro check && npm run build`
Puis: `grep -c "LearningResource" dist/interactive-courses/<slug>/<module>/index.html`
Expected: `1`.

- [ ] **Step 4: Commit**

```bash
git add "src/pages/interactive-courses/[course]/[module].astro" "src/pages/en/interactive-courses/[course]/[module].astro"
git commit -m "feat(seo): add module breadcrumbs and learning resources"
```

---

### Task 6: ScholarlyArticle sur les pages recherche (fr + en)

**Files:**
- Modify: `src/pages/research/[slug].astro`
- Modify: `src/pages/en/research/[slug].astro`

- [ ] **Step 1: Page FR — `src/pages/research/[slug].astro`**

Ajouter l'import (après celui de `i18n`) :

```ts
import { buildArticleNode, buildBreadcrumb } from '../../lib/seo';
```

Ajouter dans le frontmatter, après `const content = entry.data.fr;` :

```ts
const articlePath = localizedPath(`/research/${entry.data.slug}`, locale);
const schema = [
  buildArticleNode({
    locale,
    path: articlePath,
    title: content.title,
    summary: content.summary,
    publishedAt: entry.data.publishedAt,
  }),
  buildBreadcrumb([
    { name: t.nav.home, path: localizedPath('/', locale) },
    { name: t.nav.research, path: localizedPath('/research', locale) },
    { name: content.title, path: articlePath },
  ]),
];
```

Ajouter `schema={schema}` aux props du `<BaseLayout …>` existant.

- [ ] **Step 2: Page EN — `src/pages/en/research/[slug].astro`**

Mêmes ajouts : import depuis `../../../lib/seo`, bloc `articlePath`/`schema` identique (cette page définit `const content = entry.data.en;`, le bloc s'insère après cette ligne), prop `schema={schema}`.

- [ ] **Step 3: Vérifier**

Run: `npx astro check && npm run build`
Puis: `grep -rc "ScholarlyArticle" dist/research/ | grep -v ":0" | head -3`
Expected: au moins un fichier avec `1`.

- [ ] **Step 4: Commit**

```bash
git add "src/pages/research/[slug].astro" "src/pages/en/research/[slug].astro"
git commit -m "feat(seo): add scholarly article structured data to research pages"
```

---

### Task 6b: BreadcrumbList sur les fiches tracks (fr + en)

**Files:**
- Modify: `src/pages/tracks/[track]/index.astro`
- Modify: `src/pages/en/tracks/[track]/index.astro`

- [ ] **Step 1: Page FR — `src/pages/tracks/[track]/index.astro`**

Ajouter l'import (après celui de `i18n`) :

```ts
import { buildBreadcrumb } from '../../../lib/seo';
```

Ajouter dans le frontmatter, après `const courseCount = courseCountOf(track);` :

```ts
const trackPath = localizedPath(`/tracks/${track.data.slug}`, locale);
const schema = [
  buildBreadcrumb([
    { name: t.nav.home, path: localizedPath('/', locale) },
    { name: t.tracks.indexTitle, path: localizedPath('/tracks', locale) },
    { name: content.title, path: trackPath },
  ]),
];
```

Ajouter `schema={schema}` aux props du `<BaseLayout …>` existant :

```astro
<BaseLayout
  title={`${content.title} · Pierrick Fonquerne`}
  description={content.tagline}
  current="/tracks"
  locale={locale}
  schema={schema}
>
```

- [ ] **Step 2: Page EN — `src/pages/en/tracks/[track]/index.astro`**

Mêmes ajouts : import depuis `../../../../lib/seo`, bloc `trackPath`/`schema` identique (cette page définit `const content = track.data.en;` et `locale` vaut `'en'`), prop `schema={schema}`.

- [ ] **Step 3: Vérifier**

Run: `npx astro check && npm run build`
Puis: `grep -c "BreadcrumbList" dist/tracks/<slug>/index.html` (un slug existant via `ls dist/tracks/`)
Expected: `1`.

- [ ] **Step 4: Commit**

```bash
git add "src/pages/tracks/[track]/index.astro" "src/pages/en/tracks/[track]/index.astro"
git commit -m "feat(seo): add breadcrumb structured data to track pages"
```

---

### Task 7: Bannière de suggestion de langue (remplace le redirect JS)

**Files:**
- Modify: `src/i18n/en.ts` (nouvelles clés — en premier, ce fichier définit le type `Translations`)
- Modify: `src/i18n/fr.ts`
- Create: `src/components/layout/LanguageSuggestBanner.astro`
- Modify: `src/layouts/BaseLayout.astro` (suppression du redirect, ajout bannière)
- Modify: `src/components/layout/LanguageSwitch.astro` (commentaire obsolète)

- [ ] **Step 1: Clés i18n**

Dans `src/i18n/en.ts`, ajouter après le bloc `meta: { … },` :

```ts
  langBanner: {
    message: 'This page is also available in English.',
    action: 'View in English',
    dismiss: 'Dismiss',
  },
```

Dans `src/i18n/fr.ts`, ajouter après le bloc `meta: { … },` :

```ts
  langBanner: {
    message: 'Cette page existe aussi en français.',
    action: 'Voir en français',
    dismiss: 'Fermer',
  },
```

Note : la bannière s'adresse au visiteur dont la langue ne correspond PAS à la page — le composant lit donc le dictionnaire de la locale CIBLE (un anglophone sur une page FR voit le texte anglais).

- [ ] **Step 2: Créer `src/components/layout/LanguageSuggestBanner.astro`**

```astro
---
import { resolveTranslatedPath, useTranslations, type Locale } from '../../lib/i18n';

interface Props {
  locale: Locale;
}

const { locale } = Astro.props;
const targetLocale: Locale = locale === 'fr' ? 'en' : 'fr';
const tb = useTranslations(targetLocale).langBanner;
const targetHref = await resolveTranslatedPath(Astro.url.pathname, locale, targetLocale);
---

<div
  id="lang-banner"
  hidden
  class="fixed top-16 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-md border border-[var(--color-line-strong)] bg-[var(--color-bg-elevated)] px-4 py-3 text-sm text-[var(--color-fg)] shadow-lg"
>
  <p class="flex-1">{tb.message}</p>
  <a
    href={targetHref}
    data-lang-banner-switch
    class="font-medium whitespace-nowrap text-[var(--color-accent)] hover:underline"
  >
    {tb.action}
  </a>
  <button
    type="button"
    data-lang-banner-dismiss
    aria-label={tb.dismiss}
    class="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
  >
    ✕
  </button>
</div>

<script is:inline define:vars={{ pageLocale: locale, targetLocale }}>
  (() => {
    try {
      if (localStorage.getItem('lang')) return;
      const browserLocale = (navigator.language || 'fr').toLowerCase().startsWith('fr')
        ? 'fr'
        : 'en';
      if (browserLocale === pageLocale) {
        localStorage.setItem('lang', pageLocale);
        return;
      }
      const banner = document.getElementById('lang-banner');
      if (!banner) return;
      banner.hidden = false;
      banner.querySelector('[data-lang-banner-switch]')?.addEventListener('click', () => {
        try {
          localStorage.setItem('lang', targetLocale);
        } catch {
          /* localStorage unavailable */
        }
      });
      banner.querySelector('[data-lang-banner-dismiss]')?.addEventListener('click', () => {
        try {
          localStorage.setItem('lang', pageLocale);
        } catch {
          /* localStorage unavailable */
        }
        banner.hidden = true;
      });
    } catch {
      /* navigator or localStorage unavailable */
    }
  })();
</script>
```

Comportement assumé : la bannière n'apparaît qu'à la première visite (aucune clé `lang` stockée). Position `fixed` en haut → zéro layout shift (le ConsentBanner occupe le bas). Après une navigation interne via ClientRouter, la bannière du nouveau document reste cachée — acceptable, le visiteur a montré qu'il s'accommode de la langue.

- [ ] **Step 3: Supprimer le redirect et brancher la bannière dans `BaseLayout.astro`**

Supprimer intégralement le bloc commentaire « First-visit language detection … » et le `<script is:inline>` qui le suit (lignes 97-121 actuelles, de `{/* First-visit language detection…` à `})();</script>`).

Ajouter l'import :

```ts
import LanguageSuggestBanner from '../components/layout/LanguageSuggestBanner.astro';
```

Dans le `<body>`, après `<ConsentBanner … />` :

```astro
    <LanguageSuggestBanner locale={locale} />
```

- [ ] **Step 4: Mettre à jour le commentaire obsolète de `LanguageSwitch.astro`**

Remplacer :

```ts
  // Persist the user's manual language choice so the first-visit auto-detect
  // in BaseLayout becomes a no-op on future loads.
```

par :

```ts
  // Persist the user's manual language choice so the language suggestion
  // banner stays hidden on future loads.
```

- [ ] **Step 5: Vérifier**

Run: `npm run lint && npx astro check && npm run build`
Puis: `grep -c "lang-banner" dist/index.html`
Expected: lint et check sans erreur ; au moins `1` occurrence.
Vérification manuelle rapide : `npm run dev`, ouvrir la home en navigation privée avec un navigateur configuré en anglais → bannière visible, pas de redirection.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/en.ts src/i18n/fr.ts src/components/layout/LanguageSuggestBanner.astro src/layouts/BaseLayout.astro src/components/layout/LanguageSwitch.astro
git commit -m "feat(i18n): replace language auto-redirect with suggestion banner"
```

---

### Task 8: robots.txt + sitemap i18n + meta sociales complémentaires

**Files:**
- Create: `public/robots.txt`
- Modify: `astro.config.mjs`
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Créer `public/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://pierrick.fonquerne.com/sitemap-index.xml
```

- [ ] **Step 2: Sitemap i18n dans `astro.config.mjs`**

Remplacer `sitemap(),` par :

```js
    sitemap({
      i18n: {
        defaultLocale: 'fr',
        locales: {
          fr: 'fr-FR',
          en: 'en-US',
        },
      },
    }),
```

- [ ] **Step 3: Vérifier les dimensions réelles de l'image OG**

Run: `node -e "import('sharp').then((s) => s.default('public/og-default.png').metadata().then((m) => console.log(m.width, m.height)))"`
Expected: deux nombres (vraisemblablement `1200 630`). Utiliser les valeurs réelles au Step 4.

- [ ] **Step 4: Compléter les meta dans `BaseLayout.astro`**

Après `<meta property="og:locale" …/>`, ajouter (remplacer 1200/630 par les valeurs du Step 3) :

```astro
    <meta property="og:site_name" content="Pierrick Fonquerne" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content={title} />
```

Après `<meta name="twitter:description" …/>`, ajouter :

```astro
    <meta name="twitter:image" content={new URL(ogImage, Astro.site).toString()} />
```

- [ ] **Step 5: Vérifier**

Run: `npm run build`
Puis: `grep -c "og:site_name" dist/index.html` → `1`, et vérifier que `dist/sitemap-index.xml` existe et que `grep -c "hreflang" dist/sitemap-0.xml` retourne un nombre > 0.

- [ ] **Step 6: Commit**

```bash
git add public/robots.txt astro.config.mjs src/layouts/BaseLayout.astro
git commit -m "feat(seo): add robots directives, sitemap i18n and richer social meta"
```

---

### Task 9: Photo de profil du nœud Person (checkpoint humain)

**Files:**
- Create: `public/pierrick-fonquerne.jpg` (fourni par Pierrick)
- Modify: `src/lib/seo.ts`

- [ ] **Step 1: Demander la photo à Pierrick**

Portrait carré, minimum 500×500 px, JPEG ou WebP, déposé en `public/pierrick-fonquerne.jpg`.
**Si aucune photo n'est disponible à ce stade : marquer cette tâche non applicable et passer à la Task 10 — le graphe reste valide sans `image`.**

- [ ] **Step 2: Référencer l'image dans `buildPersonNode`**

Dans `src/lib/seo.ts`, ajouter à l'objet retourné par `buildPersonNode`, après `url:` :

```ts
    image: `${SITE_URL}/pierrick-fonquerne.jpg`,
```

- [ ] **Step 3: Vérifier**

Run: `npx astro check && npm run build`
Puis: `grep -c "pierrick-fonquerne.jpg" dist/index.html` → au moins `1`.

- [ ] **Step 4: Commit**

```bash
git add public/pierrick-fonquerne.jpg src/lib/seo.ts
git commit -m "feat(seo): add profile photo to person entity"
```

---

### Task 10: Vérification finale et préparation PR

**Files:** aucun nouveau fichier.

- [ ] **Step 1: Batterie CI complète**

Run: `npm run lint && npm run format:check && npx astro check && npm run build`
Expected: tout passe sans erreur.

- [ ] **Step 2: Inspection d'ensemble du JSON-LD généré**

Run: `grep -rl "application/ld+json" dist/ | wc -l`
Expected: égal au nombre total de pages HTML (toutes les pages émettent le socle).

- [ ] **Step 3: Validation externe (manuelle, post-déploiement de la preview ou copier-coller du HTML)**

- Extraire le bloc `<script type="application/ld+json">` de `dist/index.html`, `dist/about/index.html` et d'une fiche cours.
- Coller dans https://validator.schema.org → 0 erreur.
- Coller dans le Rich Results Test de Google → éléments détectés : Breadcrumbs, Course info, Profile page.

- [ ] **Step 4: Ouvrir la PR**

```bash
git push
gh pr create --title "SEO: structured data, language banner and search foundations" --body "Implements docs/superpowers/specs/2026-06-05-seo-google-design.md: JSON-LD @graph (Person, WebSite, Course, LearningResource, ScholarlyArticle, ProfilePage, breadcrumbs), language suggestion banner replacing the JS auto-redirect, robots.txt, i18n sitemap annotations and richer social meta."
```

Merge vers `main` uniquement après GO explicite de Pierrick.

**Post-merge (manuel, non bloquant) :** dans Search Console, demander la réindexation de `/` et `/en/`, puis suivre le rapport Améliorations sous 1-2 semaines.
