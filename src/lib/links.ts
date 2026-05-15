export interface NavLink {
  href: string;
  label: string;
}

export interface SocialLink {
  href: string;
  label: string;
  icon: 'github' | 'linkedin' | 'mail' | 'rss';
}

export const SITE = {
  name: 'Pierrick Fonquerne',
  shortName: 'PF',
  location: 'Paris · France',
  email: 'pierrick.fonquerne@gmail.com',
  status: 'Currently shipping',
  github: 'https://github.com/pierrick-fonquerne',
  linkedin: 'https://www.linkedin.com/in/pierrickfonquerne/',
} as const;

export const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'index' },
  { href: '/work', label: 'work' },
  { href: '/writing', label: 'writing' },
  { href: '/research', label: 'research' },
  { href: '/about', label: 'about' },
];

export const SOCIAL_LINKS: SocialLink[] = [
  { href: SITE.github, label: 'GitHub', icon: 'github' },
  { href: SITE.linkedin, label: 'LinkedIn', icon: 'linkedin' },
  { href: `mailto:${SITE.email}`, label: 'Email', icon: 'mail' },
];
