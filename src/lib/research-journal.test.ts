import { describe, expect, it } from 'vitest';

import {
  journalPath,
  journalEntryPath,
  journalEntriesFor,
  journalCount,
  latestJournalEntry,
  recentJournalEntries,
  type JournalEntry,
} from './research-journal';

describe('journalPath', () => {
  it('builds the FR journal index path (no locale prefix)', () => {
    expect(journalPath('neurone-vivant-et-persistant', 'fr')).toBe(
      '/research/neurone-vivant-et-persistant/journal',
    );
  });
  it('prefixes the EN journal index path with /en', () => {
    expect(journalPath('neurone-vivant-et-persistant', 'en')).toBe(
      '/en/research/neurone-vivant-et-persistant/journal',
    );
  });
});

describe('journalEntryPath', () => {
  it('builds the FR entry path', () => {
    expect(journalEntryPath('neurone-vivant-et-persistant', 'pourquoi-un-seul-neurone', 'fr')).toBe(
      '/research/neurone-vivant-et-persistant/journal/pourquoi-un-seul-neurone',
    );
  });
  it('builds the EN entry path', () => {
    expect(journalEntryPath('neurone-vivant-et-persistant', 'pourquoi-un-seul-neurone', 'en')).toBe(
      '/en/research/neurone-vivant-et-persistant/journal/pourquoi-un-seul-neurone',
    );
  });
});

function makeEntry(slug: string, research: string, isoDate: string, published = true): JournalEntry {
  return {
    id: slug,
    collection: 'research-journal',
    data: { slug, research, date: new Date(isoDate), title: { fr: slug, en: slug }, published },
  } as unknown as JournalEntry;
}

describe('journalEntriesFor', () => {
  const all = [
    makeEntry('a', 'neurone', '2026-06-10'),
    makeEntry('b', 'neurone', '2026-06-12'),
    makeEntry('c', 'autre', '2026-06-11'),
    makeEntry('d', 'neurone', '2026-06-11', false),
  ];

  it('keeps only published entries of the given research', () => {
    const slugs = journalEntriesFor('neurone', all).map((e) => e.data.slug);
    expect(slugs).toEqual(['b', 'a']);
  });
  it('sorts most recent first', () => {
    const dates = journalEntriesFor('neurone', all).map((e) => e.data.date.getTime());
    expect(dates[0]).toBeGreaterThan(dates[1]);
  });
});

describe('journalCount', () => {
  it('counts published entries of a research', () => {
    const all = [makeEntry('a', 'neurone', '2026-06-10'), makeEntry('b', 'autre', '2026-06-10')];
    expect(journalCount('neurone', all)).toBe(1);
  });
});

describe('latestJournalEntry', () => {
  const all = [
    makeEntry('a', 'neurone', '2026-06-10'),
    makeEntry('b', 'neurone', '2026-06-12'),
    makeEntry('c', 'autre', '2026-06-11'),
    makeEntry('d', 'neurone', '2026-06-13', false),
  ];

  it('returns the most recent published entry for that research slug', () => {
    expect(latestJournalEntry('neurone', all)?.data.slug).toBe('b');
  });

  it('returns undefined when the slug has no entry', () => {
    expect(latestJournalEntry('inconnu', all)).toBeUndefined();
  });

  it('ignores unpublished entries even if more recent', () => {
    expect(latestJournalEntry('neurone', all)?.data.slug).not.toBe('d');
  });

  it('ignores entries of other research slugs', () => {
    expect(latestJournalEntry('autre', all)?.data.slug).toBe('c');
  });
});

describe('recentJournalEntries', () => {
  const all = [
    makeEntry('a', 'neurone', '2026-06-10'),
    makeEntry('b', 'neurone', '2026-06-12'),
    makeEntry('c', 'autre', '2026-06-11'),
    makeEntry('d', 'neurone', '2026-06-13', false),
    makeEntry('e', 'non-publie', '2026-06-14'),
  ];
  const publishedResearchSlugs = new Set(['neurone', 'autre']);

  it('sorts across all research slugs by date, newest first', () => {
    const slugs = recentJournalEntries(all, publishedResearchSlugs, 10).map((entry) => entry.data.slug);
    expect(slugs).toEqual(['b', 'c', 'a']);
  });

  it('respects the limit', () => {
    const slugs = recentJournalEntries(all, publishedResearchSlugs, 2).map((entry) => entry.data.slug);
    expect(slugs).toEqual(['b', 'c']);
  });

  it('excludes unpublished entries', () => {
    const slugs = recentJournalEntries(all, publishedResearchSlugs, 10).map((entry) => entry.data.slug);
    expect(slugs).not.toContain('d');
  });

  it('excludes entries whose research is not in publishedResearchSlugs', () => {
    const slugs = recentJournalEntries(all, publishedResearchSlugs, 10).map((entry) => entry.data.slug);
    expect(slugs).not.toContain('e');
  });

  it('returns an empty array when limit is 0', () => {
    expect(recentJournalEntries(all, publishedResearchSlugs, 0)).toEqual([]);
  });
});
