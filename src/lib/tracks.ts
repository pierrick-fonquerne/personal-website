import { getCollection, type CollectionEntry } from 'astro:content';
import { COURSE_CATALOG } from './course-catalog';
import { listCourses } from './courses';
import type { Locale } from './i18n';
import type { AcademicStage } from './taxonomy';

export type Track = CollectionEntry<'tracks'>;

export interface ResolvedCourse {
  slug: string;
  title: string;
  subtheme: string;
  required: boolean;
  status: 'published' | 'upcoming';
}

export interface ResolvedStage {
  stage: AcademicStage;
  courses: ResolvedCourse[];
}

const PROD = import.meta.env.PROD;

const TRACK_ORDER = ['track-mathematics', 'track-ai', 'track-astrophysics'];

const isTrackVisible = <T extends { data: { published?: boolean } }>(entry: T): boolean =>
  !PROD || entry.data.published !== false;

const orderOf = (slug: string): number => {
  const index = TRACK_ORDER.indexOf(slug);
  return index === -1 ? TRACK_ORDER.length : index;
};

/**
 * Returns the visible tracks, ordered by discipline. In production, tracks
 * marked published: false are hidden; in dev they are always shown.
 */
export async function listTracks(): Promise<Track[]> {
  const all = await getCollection('tracks');
  return all.filter(isTrackVisible).sort((a, b) => orderOf(a.data.slug) - orderOf(b.data.slug));
}

/**
 * Returns a single visible track by slug, or undefined.
 */
export async function getTrack(slug: string): Promise<Track | undefined> {
  const all = await getCollection('tracks');
  return all.find((entry) => entry.data.slug === slug && isTrackVisible(entry));
}

/**
 * Total number of courses referenced across every stage of a track.
 */
export function courseCountOf(track: Track): number {
  return track.data.stages.reduce((total, stage) => total + stage.courses.length, 0);
}

/**
 * Resolves a track's stages into displayable courses, looking titles up in the
 * catalog and deriving each course's status from the published courses set.
 */
export async function resolveStages(track: Track, locale: Locale): Promise<ResolvedStage[]> {
  const publishedSlugs = new Set((await listCourses(locale)).map((course) => course.data.slug));
  return track.data.stages.map((stage) => ({
    stage: stage.stage,
    courses: stage.courses.map((entry) => {
      const meta = COURSE_CATALOG[entry.course];
      const status: ResolvedCourse['status'] = publishedSlugs.has(entry.course)
        ? 'published'
        : 'upcoming';
      return {
        slug: entry.course,
        title: meta ? meta[locale] : entry.course,
        subtheme: meta ? meta.subtheme : entry.course,
        required: entry.required,
        status,
      };
    }),
  }));
}
