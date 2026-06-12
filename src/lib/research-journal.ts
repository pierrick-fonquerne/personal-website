import type { CollectionEntry } from 'astro:content';

import type { Locale } from './i18n';
import { localizedPath } from './i18n';

export type JournalEntry = CollectionEntry<'research-journal'>;

export function journalEntriesFor(researchSlug: string, all: JournalEntry[]): JournalEntry[] {
  return all
    .filter((e) => e.data.published && e.data.research === researchSlug)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function journalCount(researchSlug: string, all: JournalEntry[]): number {
  return journalEntriesFor(researchSlug, all).length;
}

export function journalPath(researchSlug: string, locale: Locale): string {
  return localizedPath(`/research/${researchSlug}/journal`, locale);
}

export function journalEntryPath(researchSlug: string, entrySlug: string, locale: Locale): string {
  return localizedPath(`/research/${researchSlug}/journal/${entrySlug}`, locale);
}
