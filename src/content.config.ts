import { defineCollection } from 'astro:content';
import { z } from 'astro:schema';
import { glob } from 'astro/loaders';

const courseSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  cover: z.string().optional(),
  tags: z.array(z.string()).default([]),
  level: z.enum(['intro', 'intermediate', 'advanced']),
  estimatedMinutes: z.number().int().positive(),
  modules: z.array(z.string()),
  published: z.boolean().default(false),
  publishedAt: z.coerce.date().optional(),
});

const moduleSchema = z.object({
  course: z.string(),
  order: z.number().int().positive(),
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

export const collections = {
  'courses-fr': coursesFr,
  'courses-en': coursesEn,
  'course-modules-fr': courseModulesFr,
  'course-modules-en': courseModulesEn,
};
