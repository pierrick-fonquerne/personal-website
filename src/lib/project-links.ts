import type { Translations } from '../i18n/en';

/** Kinds of external link a project can expose. */
export type ProjectLinkType = 'site' | 'repo' | 'crates' | 'docs' | 'demo';

/** Minimal shape of a project link as stored in the projects collection. */
export interface ProjectLinkLike {
  type: ProjectLinkType;
  label?: string;
}

/**
 * Resolves the label displayed for a project link.
 *
 * An explicit label wins when it carries information the type cannot convey,
 * such as three distinct repositories on a single project or a domain name.
 * Otherwise the localized label of the link type is used, so English pages
 * stop rendering French labels.
 */
export function resolveProjectLinkLabel(
  link: ProjectLinkLike,
  translations: Translations,
): string {
  const explicitLabel = link.label?.trim();

  return explicitLabel ? explicitLabel : translations.projects.links[link.type];
}
