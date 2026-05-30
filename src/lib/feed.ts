import { getCollection } from 'astro:content';
import type { RSSFeedItem } from '@astrojs/rss';

import { listCourses } from './courses';
import { localizedPath, LOCALES, type Locale } from './i18n';

const LOCALE_LABEL: Record<Locale, string> = { fr: 'FR', en: 'EN' };

/**
 * Returns the RSS language tag matching a site locale.
 */
function localeTag(locale: Locale): string {
  return locale === 'fr' ? 'fr-FR' : 'en-US';
}

/**
 * Builds a locale-aware permalink (relative to the site root) for a feed entry.
 * The default locale uses a bare path, other locales are prefixed.
 */
function localizedLink(locale: Locale, kind: 'course' | 'research', slug: string): string {
  const base = kind === 'course' ? `/interactive-courses/${slug}` : `/research/${slug}`;
  return localizedPath(base, locale);
}

/**
 * Collects published courses for one locale as feed items.
 * Entries without a publication date are skipped to keep the feed chronologically sound.
 */
async function courseItemsFor(locale: Locale): Promise<RSSFeedItem[]> {
  const courses = await listCourses(locale);
  return courses
    .filter((course) => course.data.publishedAt instanceof Date)
    .map((course) => ({
      title: `[${LOCALE_LABEL[locale]}] ${course.data.title}`,
      description: course.data.summary,
      link: localizedLink(locale, 'course', course.data.slug),
      pubDate: course.data.publishedAt,
      categories: [localeTag(locale), 'course', course.data.theme],
    }));
}

/**
 * Collects published, internal research entries and expands each into one item per locale.
 */
async function researchItems(): Promise<RSSFeedItem[]> {
  const entries = (await getCollection('research')).filter(
    (entry) => entry.data.published && !entry.data.external,
  );

  return entries.flatMap((entry) =>
    LOCALES.map((locale) => {
      const content = entry.data[locale];
      return {
        title: `[${LOCALE_LABEL[locale]}] ${content.title}`,
        description: content.tagline,
        link: localizedLink(locale, 'research', entry.data.slug),
        pubDate: entry.data.publishedAt,
        categories: [localeTag(locale), 'research', entry.data.theme],
      } satisfies RSSFeedItem;
    }),
  );
}

/**
 * Merges every content source into a single feed, newest first.
 * Courses and research from both locales share one mixed feed, each item tagged with its language.
 */
export async function buildFeedItems(): Promise<RSSFeedItem[]> {
  const [coursesFr, coursesEn, research] = await Promise.all([
    courseItemsFor('fr'),
    courseItemsFor('en'),
    researchItems(),
  ]);

  return [...coursesFr, ...coursesEn, ...research].sort(
    (a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0),
  );
}
