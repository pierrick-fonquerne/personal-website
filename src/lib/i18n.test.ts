import { describe, it, expect, vi } from 'vitest';

vi.mock('astro:content', () => {
  const courseModulesFr = [
    {
      id: 'vector-search-retrieval/01-pourquoi-chercher-par-le-sens',
      data: { course: 'vector-search-retrieval', order: 1 },
    },
    {
      id: 'vector-search-retrieval/03-hnsw-graphe-de-proximite',
      data: { course: 'vector-search-retrieval', order: 3 },
    },
  ];
  const courseModulesEn = [
    {
      id: 'vector-search-retrieval/01-why-search-by-meaning',
      data: { course: 'vector-search-retrieval', order: 1 },
    },
    {
      id: 'vector-search-retrieval/03-hnsw-proximity-graph',
      data: { course: 'vector-search-retrieval', order: 3 },
    },
  ];
  const collections: Record<string, unknown[]> = {
    'course-modules-fr': courseModulesFr,
    'course-modules-en': courseModulesEn,
  };
  return {
    getCollection: vi.fn(async (name: string) => collections[name] ?? []),
  };
});

import { localizedPath, switchLocalePath, resolveTranslatedPath, resolveAlternatePaths } from './i18n';

describe('localizedPath', () => {
  it('laisse la racine par defaut (fr) sans prefixe', () => {
    expect(localizedPath('/about', 'fr')).toBe('/about');
  });

  it('prefixe les autres locales', () => {
    expect(localizedPath('/about', 'en')).toBe('/en/about');
  });
});

describe('switchLocalePath (pages statiques, pas de slug traduit)', () => {
  it('bascule une page statique fr vers en', () => {
    expect(switchLocalePath('/about', 'fr', 'en')).toBe('/en/about');
  });

  it('ne connait pas les slugs de chapitre traduits (comportement legue)', () => {
    // Le slug FR n'existe pas en EN : switchLocalePath copie betement le chemin.
    expect(
      switchLocalePath(
        '/interactive-courses/vector-search-retrieval/03-hnsw-graphe-de-proximite',
        'fr',
        'en',
      ),
    ).toBe('/en/interactive-courses/vector-search-retrieval/03-hnsw-graphe-de-proximite');
  });
});

describe('resolveTranslatedPath', () => {
  it('renvoie le chemin inchange quand la locale cible est la locale courante', async () => {
    const path = '/interactive-courses/vector-search-retrieval/03-hnsw-graphe-de-proximite';
    expect(await resolveTranslatedPath(path, 'fr', 'fr')).toBe(path);
  });

  it('resout le vrai slug EN d’un chapitre de cours depuis le FR', async () => {
    const result = await resolveTranslatedPath(
      '/interactive-courses/vector-search-retrieval/03-hnsw-graphe-de-proximite',
      'fr',
      'en',
    );
    expect(result).toBe('/en/interactive-courses/vector-search-retrieval/03-hnsw-proximity-graph');
  });

  it('resout le vrai slug FR d’un chapitre de cours depuis le EN', async () => {
    const result = await resolveTranslatedPath(
      '/en/interactive-courses/vector-search-retrieval/03-hnsw-proximity-graph',
      'en',
      'fr',
    );
    expect(result).toBe('/interactive-courses/vector-search-retrieval/03-hnsw-graphe-de-proximite');
  });

  it('retombe sur le comportement generique pour une page hors chapitre de cours', async () => {
    expect(await resolveTranslatedPath('/about', 'fr', 'en')).toBe('/en/about');
  });

  it('retombe sur le comportement generique quand le module source est introuvable', async () => {
    const result = await resolveTranslatedPath(
      '/interactive-courses/cours-inconnu/aucun-module',
      'fr',
      'en',
    );
    expect(result).toBe('/en/interactive-courses/cours-inconnu/aucun-module');
  });
});

describe('resolveAlternatePaths', () => {
  it('construit la carte complete des chemins alternes, y compris le chemin courant', async () => {
    const result = await resolveAlternatePaths(
      '/interactive-courses/vector-search-retrieval/03-hnsw-graphe-de-proximite',
      'fr',
    );
    expect(result).toEqual({
      fr: '/interactive-courses/vector-search-retrieval/03-hnsw-graphe-de-proximite',
      en: '/en/interactive-courses/vector-search-retrieval/03-hnsw-proximity-graph',
    });
  });

  it('construit la carte depuis la locale EN', async () => {
    const result = await resolveAlternatePaths(
      '/en/interactive-courses/vector-search-retrieval/03-hnsw-proximity-graph',
      'en',
    );
    expect(result).toEqual({
      fr: '/interactive-courses/vector-search-retrieval/03-hnsw-graphe-de-proximite',
      en: '/en/interactive-courses/vector-search-retrieval/03-hnsw-proximity-graph',
    });
  });

  it('retombe sur switchLocalePath pour une page statique', async () => {
    const result = await resolveAlternatePaths('/about', 'fr');
    expect(result).toEqual({
      fr: '/about',
      en: '/en/about',
    });
  });
});
