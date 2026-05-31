import { defineCollection } from 'astro:content';
import { z } from 'astro:schema';
import { glob } from 'astro/loaders';

import { ACADEMIC_STAGES, THEMES } from './lib/taxonomy';

const courseSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  cover: z.string().optional(),
  tags: z.array(z.string()).default([]),
  theme: z.enum(THEMES),
  subtheme: z.string(),
  level: z.enum(['intro', 'intermediate', 'advanced']),
  estimatedMinutes: z.number().int().positive(),
  modules: z.array(z.string()),
  personalNote: z.string().optional(),
  published: z.boolean().default(false),
  publishedAt: z.coerce.date().optional(),
});

const moduleSchema = z.object({
  course: z.string(),
  order: z.number().int().nonnegative(),
  title: z.string(),
  subtitle: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  published: z.boolean().default(true),
});

const coursesFr = defineCollection({
  loader: glob({ base: './src/content/courses-fr', pattern: '**/*.{yaml,yml}' }),
  schema: courseSchema,
});

const coursesEn = defineCollection({
  loader: glob({ base: './src/content/courses-en', pattern: '**/*.{yaml,yml}' }),
  schema: courseSchema,
});

const courseModulesFr = defineCollection({
  loader: glob({ base: './src/content/course-modules-fr', pattern: '**/*.mdx' }),
  schema: moduleSchema,
});

const courseModulesEn = defineCollection({
  loader: glob({ base: './src/content/course-modules-en', pattern: '**/*.mdx' }),
  schema: moduleSchema,
});

const glossaryLocaleSchema = z.object({
  term: z.string(),
  definition: z.string(),
  source: z.string().optional(),
});

const glossarySchema = z.object({
  slug: z.string(),
  fr: glossaryLocaleSchema,
  en: glossaryLocaleSchema,
  seeAlso: z.array(z.string()).default([]),
});

const glossary = defineCollection({
  loader: glob({ base: './src/content/glossary', pattern: '**/*.{yaml,yml}' }),
  schema: glossarySchema,
});

const projectLocaleSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  summary: z.string(),
});

const projectLinkSchema = z.object({
  label: z.string(),
  href: z.string().url(),
  type: z.enum(['site', 'repo', 'crates', 'docs', 'demo']),
});

const projectSchema = z.object({
  slug: z.string(),
  category: z.enum(['entrepreneurship', 'opensource', 'games', 'poc', 'web']),
  status: z.enum(['active', 'maintained', 'archived', 'dormant']),
  period: z.string(),
  featured: z.boolean().default(false),
  cover: z.string().optional(),
  stack: z.array(z.string()).default([]),
  links: z.array(projectLinkSchema).default([]),
  fr: projectLocaleSchema,
  en: projectLocaleSchema,
  published: z.boolean().default(true),
  publishedAt: z.coerce.date().optional(),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{yaml,yml}' }),
  schema: projectSchema,
});

const researchLocaleSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  summary: z.string(),
});

const researchPaperSchema = z.object({
  title: z.string(),
  authors: z.string(),
  href: z.string().url(),
});

const researchSchema = z.object({
  slug: z.string(),
  type: z.enum(['exploration', 'paper', 'concept']),
  theme: z.enum(THEMES),
  subtheme: z.string().optional(),
  status: z.enum(['draft', 'wip', 'published', 'archived']),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  papers: z.array(researchPaperSchema).default([]),
  external: z.string().url().optional(),
  fr: researchLocaleSchema,
  en: researchLocaleSchema,
  published: z.boolean().default(true),
});

const researchBodySchema = z.object({
  slug: z.string(),
});

const research = defineCollection({
  loader: glob({ base: './src/content/research', pattern: '**/*.{yaml,yml}' }),
  schema: researchSchema,
});

const researchFr = defineCollection({
  loader: glob({ base: './src/content/research-fr', pattern: '**/*.mdx' }),
  schema: researchBodySchema,
});

const researchEn = defineCollection({
  loader: glob({ base: './src/content/research-en', pattern: '**/*.mdx' }),
  schema: researchBodySchema,
});

const trackStageSchema = z.object({
  stage: z.enum(ACADEMIC_STAGES),
  courses: z.array(
    z.object({
      course: z.string(),
      required: z.boolean().default(true),
    }),
  ),
});

const trackLocaleSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  summary: z.string(),
  audience: z.string(),
});

const trackSchema = z.object({
  slug: z.string(),
  theme: z.enum(THEMES),
  stages: z.array(trackStageSchema),
  fr: trackLocaleSchema,
  en: trackLocaleSchema,
  published: z.boolean().default(false),
  publishedAt: z.coerce.date().optional(),
});

const tracks = defineCollection({
  loader: glob({ base: './src/content/tracks', pattern: '**/*.{yaml,yml}' }),
  schema: trackSchema,
});

export const collections = {
  'courses-fr': coursesFr,
  'courses-en': coursesEn,
  'course-modules-fr': courseModulesFr,
  'course-modules-en': courseModulesEn,
  glossary,
  projects,
  research,
  'research-fr': researchFr,
  'research-en': researchEn,
  tracks,
};
