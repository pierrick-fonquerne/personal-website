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
      item: `${SITE_URL}${item.path}`,
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
    '@id': `${SITE_URL}${input.path}#course`,
    name: input.title,
    description: input.summary,
    url: `${SITE_URL}${input.path}`,
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
      courseWorkload: `PT${input.moduleCount * 30}M`,
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
    '@id': `${SITE_URL}${input.path}#resource`,
    name: input.title,
    url: `${SITE_URL}${input.path}`,
    inLanguage: IN_LANGUAGE[input.locale],
    author: { '@id': PERSON_ID },
    isPartOf: { '@id': `${SITE_URL}${input.coursePath}#course` },
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
    '@id': `${SITE_URL}${input.path}#article`,
    headline: input.title,
    description: input.summary,
    url: `${SITE_URL}${input.path}`,
    inLanguage: IN_LANGUAGE[input.locale],
    author: { '@id': PERSON_ID },
    datePublished: input.publishedAt.toISOString().slice(0, 10),
  };
}

/**
 * Builds the ProfilePage node for the about pages.
 */
export function buildProfilePageNode(locale: Locale): ProfilePage {
  return {
    '@type': 'ProfilePage',
    inLanguage: IN_LANGUAGE[locale],
    mainEntity: { '@id': PERSON_ID },
  };
}
