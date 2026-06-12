import { describe, expect, it } from 'vitest';

import { journalPath, journalEntryPath } from './research-journal';

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
