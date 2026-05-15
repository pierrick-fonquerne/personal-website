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
  return localizedPath(stripped, target);
}
