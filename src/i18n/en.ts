export interface Translations {
  nav: {
    index: string;
    work: string;
    writing: string;
    research: string;
    about: string;
  };
  status: string;
  aboutAvatarAria: string;
  toggleThemeAria: string;
  languageSwitchAria: string;
  hero: {
    eyebrow: string;
    placeholder: string;
  };
  footer: {
    colophonTitle: string;
    colophonBody: string;
    siteTitle: string;
    elsewhereTitle: string;
    contactTitle: string;
    rssLabel: string;
  };
  socials: {
    github: string;
    linkedin: string;
    email: string;
  };
}

const en: Translations = {
  nav: {
    index: 'index',
    work: 'work',
    writing: 'writing',
    research: 'research',
    about: 'about',
  },
  status: 'Currently learning Rust & Deep learning',
  aboutAvatarAria: 'About Pierrick',
  toggleThemeAria: 'Toggle theme',
  languageSwitchAria: 'Switch language',
  hero: {
    eyebrow: 'PORTFOLIO · v2026.05',
    placeholder: 'Layout scaffold ready — hero, marquee and about section land in étape 3.',
  },
  footer: {
    colophonTitle: '// Colophon',
    colophonBody:
      'This site is hand-built. No trackers, no analytics, no popups. Just code. Astro · Tailwind · MDX.',
    siteTitle: '// Site',
    elsewhereTitle: '// Elsewhere',
    contactTitle: '// Contact',
    rssLabel: 'RSS feed',
  },
  socials: {
    github: 'GitHub',
    linkedin: 'LinkedIn',
    email: 'Email',
  },
};

export default en;
