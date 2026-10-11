import { z } from 'astro/zod';

export const researchPaperSchema = z.object({
  title: z.string(),
  authors: z.string(),
  href: z.string().url(),
  note: z.object({ fr: z.string(), en: z.string() }).optional(),
});

export type ResearchPaper = z.infer<typeof researchPaperSchema>;

export function resolvePaperNote(paper: ResearchPaper, locale: 'fr' | 'en'): string | undefined {
  return paper.note?.[locale];
}
