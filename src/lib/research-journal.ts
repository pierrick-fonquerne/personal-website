import type { Locale } from './i18n';
import { localizedPath } from './i18n';

export function journalPath(researchSlug: string, locale: Locale): string {
  return localizedPath(`/research/${researchSlug}/journal`, locale);
}

export function journalEntryPath(researchSlug: string, entrySlug: string, locale: Locale): string {
  return localizedPath(`/research/${researchSlug}/journal/${entrySlug}`, locale);
}
