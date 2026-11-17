import { describe, expect, it } from 'vitest';

import { AUDIO_SOURCES, parseRelativePath } from '../../scripts/audio-sources.mjs';

describe('AUDIO_SOURCES', () => {
  it('includes a French research journal source under the research-journal namespace', () => {
    const source = AUDIO_SOURCES.find(
      (candidate) => candidate.locale === 'fr' && candidate.namespace === 'research-journal',
    );
    expect(source).toBeDefined();
    expect(source?.dir.replace(/\\/g, '/')).toMatch(/\/src\/content\/research-journal-fr$/);
  });

  it('includes an English research journal source under the research-journal namespace', () => {
    const source = AUDIO_SOURCES.find(
      (candidate) => candidate.locale === 'en' && candidate.namespace === 'research-journal',
    );
    expect(source).toBeDefined();
    expect(source?.dir.replace(/\\/g, '/')).toMatch(/\/src\/content\/research-journal-en$/);
  });

  it('keeps the research namespace for both research sources', () => {
    const sources = AUDIO_SOURCES.filter((candidate) => candidate.namespace === 'research');
    expect(sources.map((candidate) => candidate.locale).sort()).toEqual(['en', 'fr']);
  });

  it('leaves course modules without a namespace so the course is derived from the subfolder', () => {
    const sources = AUDIO_SOURCES.filter((candidate) => candidate.dir.includes('course-modules'));
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((candidate) => candidate.namespace === undefined)).toBe(true);
  });
});

describe('parseRelativePath', () => {
  it('uses the namespace as the course for a journal file with a posix path', () => {
    const journalDir = '/repo/src/content/research-journal-fr';
    const result = parseRelativePath(
      `${journalDir}/la-memoire-comme-paysage.mdx`,
      journalDir,
      'research-journal',
    );
    expect(result).toEqual({ course: 'research-journal', module: 'la-memoire-comme-paysage' });
  });

  it('uses the namespace as the course for a journal file with a Windows path', () => {
    const journalDir = 'C:\\repo\\src\\content\\research-journal-fr';
    const result = parseRelativePath(
      `${journalDir}\\la-memoire-comme-paysage.mdx`,
      journalDir,
      'research-journal',
    );
    expect(result).toEqual({ course: 'research-journal', module: 'la-memoire-comme-paysage' });
  });

  it('derives the course from the subfolder when no namespace is given', () => {
    const courseDir = '/repo/src/content/course-modules-fr';
    const result = parseRelativePath(`${courseDir}/positional-astronomy/01-intro.mdx`, courseDir);
    expect(result).toEqual({ course: 'positional-astronomy', module: '01-intro' });
  });

  it('uses the research namespace for a research file', () => {
    const researchDir = '/repo/src/content/research-fr';
    const result = parseRelativePath(
      `${researchDir}/neurone-vivant-et-persistant.mdx`,
      researchDir,
      'research',
    );
    expect(result).toEqual({ course: 'research', module: 'neurone-vivant-et-persistant' });
  });
});
