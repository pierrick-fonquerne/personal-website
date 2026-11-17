import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '..');

/**
 * @typedef {Object} AudioSource
 * @property {'fr' | 'en'} locale
 * @property {string} dir
 * @property {string} [namespace]
 */

/**
 * Directories scanned by the audio pipeline, paired with the locale they
 * belong to. Course modules derive their course from the subfolder they
 * live in, while research and research-journal sources are flat and use
 * a fixed namespace instead.
 *
 * @type {AudioSource[]}
 */
export const AUDIO_SOURCES = [
  { locale: 'fr', dir: resolve(ROOT, 'src', 'content', 'course-modules-fr') },
  { locale: 'en', dir: resolve(ROOT, 'src', 'content', 'course-modules-en') },
  { locale: 'fr', dir: resolve(ROOT, 'src', 'content', 'research-fr'), namespace: 'research' },
  { locale: 'en', dir: resolve(ROOT, 'src', 'content', 'research-en'), namespace: 'research' },
  {
    locale: 'fr',
    dir: resolve(ROOT, 'src', 'content', 'research-journal-fr'),
    namespace: 'research-journal',
  },
  {
    locale: 'en',
    dir: resolve(ROOT, 'src', 'content', 'research-journal-en'),
    namespace: 'research-journal',
  },
];

/**
 * Derives the course and module identifiers from an MDX file path relative
 * to its source directory. When a namespace is given, it is used as the
 * course; otherwise the course is derived from the subfolder structure
 * (e.g. course modules nested under a course slug directory).
 *
 * @param {string} filePath
 * @param {string} sourceDirectory
 * @param {string} [namespace]
 * @returns {{ course: string, module: string }}
 */
export function parseRelativePath(filePath, sourceDirectory, namespace) {
  const relative = filePath.slice(sourceDirectory.length + 1).replace(/\\/g, '/');
  const parts = relative.split('/');
  const moduleName = (parts.pop() ?? '').replace(/\.mdx$/, '');
  const course = namespace ?? parts.join('/');
  return { course, module: moduleName };
}
