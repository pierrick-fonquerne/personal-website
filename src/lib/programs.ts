import type { CollectionEntry } from 'astro:content';

import { localizedPath, type Locale } from './i18n';

export interface ResolvedProgram {
  entry: CollectionEntry<'programs'>;
  toc: CollectionEntry<'research'>[];
  concepts: CollectionEntry<'research'>[];
  projects: CollectionEntry<'projects'>[];
  counts: { pages: number; concepts: number; projects: number };
}

function indexBySlug<T extends { data: { slug: string } }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.data.slug, item);
  }
  return map;
}

/**
 * Resolves a program entry into its referenced research notes and projects.
 *
 * The sommaire (toc) keeps the editorial order declared on the program. Concepts
 * combine the transverse notes referenced by the program with program-specific
 * notes (research entries whose subtheme matches the program slug) that are not
 * already surfaced in the sommaire. Callers should pass already-published
 * collections so unpublished content is never surfaced.
 */
export function resolveProgram(
  program: CollectionEntry<'programs'>,
  research: CollectionEntry<'research'>[],
  projects: CollectionEntry<'projects'>[],
): ResolvedProgram {
  const researchBySlug = indexBySlug(research);
  const projectsBySlug = indexBySlug(projects);

  const toc = program.data.toc
    .map((slug) => researchBySlug.get(slug))
    .filter((entry): entry is CollectionEntry<'research'> => Boolean(entry));

  const tocSlugs = new Set(toc.map((entry) => entry.data.slug));

  const transverse = program.data.concepts
    .map((slug) => researchBySlug.get(slug))
    .filter((entry): entry is CollectionEntry<'research'> => Boolean(entry));

  const specific = research.filter(
    (entry) => entry.data.subtheme === program.data.slug && !tocSlugs.has(entry.data.slug),
  );

  const conceptsBySlug = new Map<string, CollectionEntry<'research'>>();
  for (const entry of [...transverse, ...specific]) {
    if (!tocSlugs.has(entry.data.slug)) {
      conceptsBySlug.set(entry.data.slug, entry);
    }
  }
  const concepts = [...conceptsBySlug.values()];

  const programProjects = program.data.projects
    .map((slug) => projectsBySlug.get(slug))
    .filter((entry): entry is CollectionEntry<'projects'> => Boolean(entry));

  return {
    entry: program,
    toc,
    concepts,
    projects: programProjects,
    counts: {
      pages: toc.length,
      concepts: concepts.length,
      projects: programProjects.length,
    },
  };
}

/**
 * Builds the locale-aware path to a program dossier page. The French route uses
 * the /research/programme segment, other locales use /research/program.
 */
export function programPath(slug: string, locale: Locale): string {
  const segment = locale === 'fr' ? 'programme' : 'program';
  return localizedPath(`/research/${segment}/${slug}`, locale);
}
