import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from './i18n';

export type Course = CollectionEntry<'courses-fr'> | CollectionEntry<'courses-en'>;
export type CourseModule =
  | CollectionEntry<'course-modules-fr'>
  | CollectionEntry<'course-modules-en'>;

const PROD = import.meta.env.PROD;

const coursesCollectionFor = (lang: Locale) =>
  lang === 'fr' ? 'courses-fr' : 'courses-en';

const modulesCollectionFor = (lang: Locale) =>
  lang === 'fr' ? 'course-modules-fr' : 'course-modules-en';

const isPublished = <T extends { data: { published?: boolean } }>(entry: T) =>
  !PROD || entry.data.published !== false;

export async function listCourses(lang: Locale): Promise<Course[]> {
  const all = await getCollection(coursesCollectionFor(lang));
  return all.filter(isPublished).sort((a, b) => {
    const aDate = a.data.publishedAt?.getTime() ?? 0;
    const bDate = b.data.publishedAt?.getTime() ?? 0;
    return bDate - aDate;
  });
}

export async function getCourse(lang: Locale, slug: string): Promise<Course | undefined> {
  const all = await getCollection(coursesCollectionFor(lang));
  return all.find((c) => c.data.slug === slug && isPublished(c));
}

export async function listModulesOf(
  lang: Locale,
  courseSlug: string,
): Promise<CourseModule[]> {
  const all = await getCollection(modulesCollectionFor(lang));
  return all
    .filter((m) => m.data.course === courseSlug && isPublished(m))
    .sort((a, b) => a.data.order - b.data.order);
}

export async function getModule(
  lang: Locale,
  courseSlug: string,
  moduleSlug: string,
): Promise<CourseModule | undefined> {
  const all = await getCollection(modulesCollectionFor(lang));
  return all.find(
    (m) => m.data.course === courseSlug && m.id.endsWith(`/${moduleSlug}`) && isPublished(m),
  );
}

export function neighbors(modules: CourseModule[], currentId: string) {
  const idx = modules.findIndex((m) => m.id === currentId);
  return {
    prev: idx > 0 ? modules[idx - 1] : undefined,
    next: idx >= 0 && idx < modules.length - 1 ? modules[idx + 1] : undefined,
  };
}

export function moduleSlugOf(entry: CourseModule): string {
  const parts = entry.id.split('/');
  return parts[parts.length - 1]!;
}
