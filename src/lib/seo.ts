import type {
  BreadcrumbList,
  Course,
  Graph,
  LearningResource,
  Person,
  ProfilePage,
  ScholarlyArticle,
  Thing,
  WebSite,
} from 'schema-dts';
import type { Locale } from './i18n';
import { SITE } from './links';

export const SITE_URL = 'https://pierrick.fonquerne.com';
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const IN_LANGUAGE: Record<Locale, string> = {
  fr: 'fr-FR',
  en: 'en-US',
};

const JOB_TITLE: Record<Locale, string> = {
  fr: 'Développeur full-stack',
  en: 'Full-Stack Developer',
};

const PERSON_DESCRIPTION: Record<Locale, string> = {
  fr: 'Développeur full-stack — .NET, Rust, TypeScript. Cours interactifs et recherche en informatique.',
  en: 'Full-stack developer — .NET, Rust, TypeScript. Interactive courses and computer science research.',
};

const KNOWS_ABOUT: readonly string[] = [
  '.NET',
  'C#',
  'Rust',
  'TypeScript',
  'Software architecture',
  'Neural networks',
];

/**
 * Resolves a site-relative path against the canonical origin, tolerating
 * a missing leading slash.
 */
function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

/**
 * Formats a duration in minutes as an ISO 8601 duration string,
 * normalizing to hours and minutes.
 */
function isoDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `PT${minutes}M`;
  }
  return minutes === 0 ? `PT${hours}H` : `PT${hours}H${minutes}M`;
}

/**
 * Builds the Person node shared by every page of the site.
 * Stable @id lets search engines merge references across pages.
 */
export function buildPersonNode(locale: Locale): Person {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: SITE.name,
    url: `${SITE_URL}/`,
    jobTitle: JOB_TITLE[locale],
    description: PERSON_DESCRIPTION[locale],
    sameAs: [SITE.linkedin, SITE.github, SITE.crates],
    knowsAbout: [...KNOWS_ABOUT],
  };
}

/**
 * Builds the WebSite node shared by every page of the site.
 */
export function buildWebSiteNode(locale: Locale): WebSite {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE.name,
    url: `${SITE_URL}/`,
    inLanguage: IN_LANGUAGE[locale],
    publisher: { '@id': PERSON_ID },
  };
}

/**
 * Assembles the page graph: base identity nodes plus page-specific nodes.
 */
export function buildGraph(locale: Locale, extra: readonly Thing[] = []): Graph {
  return {
    '@context': 'https://schema.org',
    '@graph': [buildWebSiteNode(locale), buildPersonNode(locale), ...extra],
  };
}

/**
 * Serializes a graph for a JSON-LD script tag. The lower-than sign is
 * escaped so user-provided text can never close the script element.
 */
export function serializeGraph(graph: Graph): string {
  return JSON.stringify(graph).replace(/</g, '\\u003c');
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/**
 * Builds a BreadcrumbList from ordered site-relative paths.
 */
export function buildBreadcrumb(items: readonly BreadcrumbItem[]): BreadcrumbList {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export interface CourseNodeInput {
  locale: Locale;
  path: string;
  title: string;
  summary: string;
  moduleCount: number;
}

/**
 * Builds a Course node carrying the fields Google requires for the
 * course-info rich result: provider, offers and a course instance.
 */
export function buildCourseNode(input: CourseNodeInput): Course {
  return {
    '@type': 'Course',
    '@id': `${absoluteUrl(input.path)}#course`,
    name: input.title,
    description: input.summary,
    url: absoluteUrl(input.path),
    inLanguage: IN_LANGUAGE[input.locale],
    author: { '@id': PERSON_ID },
    provider: {
      '@type': 'Organization',
      name: SITE.name,
      url: `${SITE_URL}/`,
    },
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'EUR',
      category: 'Free',
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
      courseWorkload: isoDuration(input.moduleCount * 30),
    },
  };
}

export interface LearningResourceInput {
  locale: Locale;
  path: string;
  title: string;
  coursePath: string;
}

/**
 * Builds a LearningResource node for a course module, linked to its
 * parent course through the stable course @id.
 */
export function buildLearningResourceNode(input: LearningResourceInput): LearningResource {
  return {
    '@type': 'LearningResource',
    '@id': `${absoluteUrl(input.path)}#resource`,
    name: input.title,
    url: absoluteUrl(input.path),
    inLanguage: IN_LANGUAGE[input.locale],
    author: { '@id': PERSON_ID },
    isPartOf: { '@id': `${absoluteUrl(input.coursePath)}#course` },
  };
}

export interface ArticleNodeInput {
  locale: Locale;
  path: string;
  title: string;
  summary: string;
  publishedAt: Date;
}

/**
 * Builds a ScholarlyArticle node for a research page.
 */
export function buildArticleNode(input: ArticleNodeInput): ScholarlyArticle {
  return {
    '@type': 'ScholarlyArticle',
    '@id': `${absoluteUrl(input.path)}#article`,
    headline: input.title,
    description: input.summary,
    url: absoluteUrl(input.path),
    inLanguage: IN_LANGUAGE[input.locale],
    author: { '@id': PERSON_ID },
    datePublished: input.publishedAt.toISOString().slice(0, 10),
  };
}

/**
 * Builds the ProfilePage node for an about page.
 */
export function buildProfilePageNode(locale: Locale, path: string): ProfilePage {
  return {
    '@type': 'ProfilePage',
    '@id': absoluteUrl(path),
    url: absoluteUrl(path),
    inLanguage: IN_LANGUAGE[locale],
    mainEntity: { '@id': PERSON_ID },
  };
}
