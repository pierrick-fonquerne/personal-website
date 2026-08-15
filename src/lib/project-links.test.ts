import { describe, expect, it } from 'vitest';

import { useTranslations } from './i18n';
import { resolveProjectLinkLabel } from './project-links';

const fr = useTranslations('fr');
const en = useTranslations('en');

describe('resolveProjectLinkLabel', () => {
  describe('when the link carries no explicit label', () => {
    it('falls back to the French label of the type', () => {
      expect(resolveProjectLinkLabel({ type: 'repo' }, fr)).toBe('Code source');
    });

    it('falls back to the English label of the type', () => {
      expect(resolveProjectLinkLabel({ type: 'repo' }, en)).toBe('Repository');
    });

    it('keeps a registry name identical across locales', () => {
      expect(resolveProjectLinkLabel({ type: 'crates' }, fr)).toBe('crates.io');
      expect(resolveProjectLinkLabel({ type: 'crates' }, en)).toBe('crates.io');
    });

    it('covers every link type in both locales', () => {
      const types: ProjectLinkTypeUnderTest[] = ['site', 'repo', 'crates', 'docs', 'demo'];
      for (const type of types) {
        expect(resolveProjectLinkLabel({ type }, fr)).toBe(fr.projects.links[type]);
        expect(resolveProjectLinkLabel({ type }, en)).toBe(en.projects.links[type]);
      }
    });
  });

  describe('when the link carries an explicit label', () => {
    it('prefers it over the type, because it says what the type cannot', () => {
      expect(resolveProjectLinkLabel({ type: 'site', label: 'LinkedIn' }, en)).toBe('LinkedIn');
    });

    it('keeps it identical across locales', () => {
      const link = { type: 'repo', label: 'API (.NET 10)' } as const;
      expect(resolveProjectLinkLabel(link, fr)).toBe('API (.NET 10)');
      expect(resolveProjectLinkLabel(link, en)).toBe('API (.NET 10)');
    });

    it('distinguishes several links sharing one type', () => {
      const frontend = { type: 'repo', label: 'Frontend (React)' } as const;
      const shared = { type: 'repo', label: 'Shared (docs / infra)' } as const;
      expect(resolveProjectLinkLabel(frontend, en)).not.toBe(resolveProjectLinkLabel(shared, en));
    });
  });

  describe('when the explicit label is empty', () => {
    it('treats an empty string as absent', () => {
      expect(resolveProjectLinkLabel({ type: 'repo', label: '' }, en)).toBe('Repository');
    });

    it('treats a blank string as absent', () => {
      expect(resolveProjectLinkLabel({ type: 'repo', label: '   ' }, en)).toBe('Repository');
    });

    it('trims a label that carries surrounding whitespace', () => {
      expect(resolveProjectLinkLabel({ type: 'site', label: '  LinkedIn  ' }, en)).toBe('LinkedIn');
    });
  });
});

type ProjectLinkTypeUnderTest = 'site' | 'repo' | 'crates' | 'docs' | 'demo';
