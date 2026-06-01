import en, { type Translations } from '../i18n/en';
import fr from '../i18n/fr';

export type Locale = 'en' | 'fr';

export const DEFAULT_LOCALE: Locale = 'fr';
export const LOCALES: readonly Locale[] = ['fr', 'en'] as const;

const dictionaries: Record<Locale, Translations> = { en, fr };

/**
 * Returns the translations dictionary for the given locale.
 */
export function useTranslations(locale: Locale): Translations {
  return dictionaries[locale];
}

/**
 * Detects the active locale from a request URL.
 * The default locale lives at /, other locales live at /<locale>/...
 */
export function getLocaleFromUrl(url: URL): Locale {
  const segments = url.pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first && LOCALES.includes(first as Locale)) {
    return first as Locale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Builds a locale-aware path. The default locale uses bare paths
 * (e.g. /work), other locales are prefixed (e.g. /fr/work).
 */
export function localizedPath(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) {
    return clean;
  }
  if (clean === '/') {
    return `/${locale}/`;
  }
  return `/${locale}${clean}`;
}

/**
 * Translates the locale-specific research program segment. The French route
 * uses /research/programme, the English route uses /research/program. The given
 * path is already locale-stripped; this rewrites the segment to the target form.
 */
function translateProgramSegment(path: string, target: Locale): string {
  if (target === DEFAULT_LOCALE) {
    return path.replace(/^\/research\/program(\/|$)/, '/research/programme$1');
  }
  return path.replace(/^\/research\/programme(\/|$)/, '/research/program$1');
}

/**
 * Returns the equivalent path in the other locale, preserving the page.
 * Used by the language switcher in the nav.
 */
export function switchLocalePath(currentPath: string, current: Locale, target: Locale): string {
  if (current === target) {
    return currentPath;
  }
  let stripped = currentPath;
  if (current !== DEFAULT_LOCALE) {
    stripped = stripped.replace(new RegExp(`^/${current}(/|$)`), '/');
  }
  return localizedPath(translateProgramSegment(stripped, target), target);
}

/**
 * Resolves the equivalent path in the target locale, with awareness of routes
 * whose slugs differ between languages (notably interactive course chapters).
 *
 * For a path like /interactive-courses/<course>/<module>, the function looks
 * up the module in the source collection, finds the matching module in the
 * target collection (same course, same order), and returns the localized
 * path with the correctly translated slug.
 *
 * Falls back to {@link switchLocalePath} when no special handling applies.
 */
export async function resolveTranslatedPath(
  currentPath: string,
  current: Locale,
  target: Locale,
): Promise<string> {
  if (current === target) return currentPath;

  let stripped = currentPath;
  if (current !== DEFAULT_LOCALE) {
    stripped = stripped.replace(new RegExp(`^/${current}(/|$)`), '/');
  }

  const moduleMatch = stripped.match(/^\/interactive-courses\/([^/]+)\/([^/]+)\/?$/);
  if (moduleMatch) {
    const [, courseSlug, moduleSlug] = moduleMatch;
    const { getCollection } = await import('astro:content');
    const sourceCollection = `course-modules-${current}` as const;
    const targetCollection = `course-modules-${target}` as const;
    const sourceEntries = await getCollection(sourceCollection);
    const sourceEntry = sourceEntries.find(
      (e) => e.data.course === courseSlug && e.id.endsWith(`/${moduleSlug}`),
    );
    if (sourceEntry) {
      const targetEntries = await getCollection(targetCollection);
      const targetEntry = targetEntries.find(
        (e) => e.data.course === courseSlug && e.data.order === sourceEntry.data.order,
      );
      if (targetEntry) {
        const idSegments = targetEntry.id.split('/');
        const targetModuleSlug = idSegments[idSegments.length - 1]!.replace(/\.mdx$/, '');
        return localizedPath(`/interactive-courses/${courseSlug}/${targetModuleSlug}`, target);
      }
    }
  }

  return localizedPath(translateProgramSegment(stripped, target), target);
}
