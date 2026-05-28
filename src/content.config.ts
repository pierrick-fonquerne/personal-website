import { defineCollection } from 'astro:content';
import { z } from 'astro:schema';
import { glob } from 'astro/loaders';

const courseSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  cover: z.string().optional(),
  tags: z.array(z.string()).default([]),
  theme: z.enum([
    'architecture',
    'math',
    'ai',
    'systems',
    'data',
    'security',
    'network',
    'quant',
    'tooling',
  ]),
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

export const collections = {
  'courses-fr': coursesFr,
  'courses-en': coursesEn,
  'course-modules-fr': courseModulesFr,
  'course-modules-en': courseModulesEn,
  glossary,
  projects,
};
