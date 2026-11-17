import { describe, expect, it } from 'vitest';

import { researchPaperSchema, resolvePaperNote, type ResearchPaper } from './research-paper';

const basePaper = {
  title: 'A title',
  authors: 'Doe et al. (2026)',
  href: 'https://arxiv.org/abs/2600.00001',
};

describe('researchPaperSchema', () => {
  it('accepts a source without a note', () => {
    expect(researchPaperSchema.safeParse(basePaper).success).toBe(true);
  });

  it('accepts a source with a complete bilingual note', () => {
    const result = researchPaperSchema.safeParse({
      ...basePaper,
      note: { fr: 'Une note.', en: 'A note.' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a note missing the English text', () => {
    const result = researchPaperSchema.safeParse({ ...basePaper, note: { fr: 'Une note.' } });
    expect(result.success).toBe(false);
  });

  it('rejects a note missing the French text', () => {
    const result = researchPaperSchema.safeParse({ ...basePaper, note: { en: 'A note.' } });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid href', () => {
    expect(researchPaperSchema.safeParse({ ...basePaper, href: 'not a url' }).success).toBe(false);
  });
});

describe('resolvePaperNote', () => {
  const withNote: ResearchPaper = { ...basePaper, note: { fr: 'Une note.', en: 'A note.' } };

  it('returns the French note for the fr locale', () => {
    expect(resolvePaperNote(withNote, 'fr')).toBe('Une note.');
  });

  it('returns the English note for the en locale', () => {
    expect(resolvePaperNote(withNote, 'en')).toBe('A note.');
  });

  it('returns undefined when the source has no note', () => {
    expect(resolvePaperNote(basePaper, 'fr')).toBeUndefined();
  });
});
