import type { Translations } from '../i18n/en';

export type NavKey = keyof Translations['nav'];

export interface NavLink {
  key: NavKey;
  href: string;
}

export interface SocialLink {
  href: string;
  icon: 'github' | 'linkedin' | 'mail' | 'rss';
  /** Key into translations.socials for the accessible label. */
  labelKey: keyof Translations['socials'];
}

export const SITE = {
  name: 'Pierrick Fonquerne',
  shortName: 'PF',
  location: 'Paris · France',
  email: 'pierrick.fonquerne@gmail.com',
  github: 'https://github.com/pierrick-fonquerne',
  linkedin: 'https://www.linkedin.com/in/pierrickfonquerne/',
  githubHandle: 'github.com/pierrick-fonquerne',
  linkedinHandle: 'linkedin.com/in/pierrickfonquerne',
} as const;

export const NAV_LINKS: readonly NavLink[] = [
  { key: 'home', href: '/' },
  { key: 'projects', href: '/projects' },
  { key: 'blog', href: '/blog' },
  { key: 'research', href: '/research' },
  { key: 'about', href: '/about' },
];

export const SOCIAL_LINKS: readonly SocialLink[] = [
  { href: SITE.github, icon: 'github', labelKey: 'github' },
  { href: SITE.linkedin, icon: 'linkedin', labelKey: 'linkedin' },
  { href: `mailto:${SITE.email}`, icon: 'mail', labelKey: 'email' },
];
