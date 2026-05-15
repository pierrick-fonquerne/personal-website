export interface Translations {
  nav: {
    home: string;
    projects: string;
    blog: string;
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
    siteTitle: string;
    elsewhereTitle: string;
    contactTitle: string;
  };
  socials: {
    github: string;
    linkedin: string;
    email: string;
  };
}

const en: Translations = {
  nav: {
    home: 'Home',
    projects: 'Projects',
    blog: 'Blog',
    research: 'Research',
    about: 'About',
  },
  status: 'Currently learning Rust & Deep learning',
  aboutAvatarAria: 'About Pierrick',
  toggleThemeAria: 'Toggle theme',
  languageSwitchAria: 'Switch language',
  hero: {
    eyebrow: 'PORTFOLIO',
    placeholder: 'Layout scaffold ready — hero, marquee and about section land in étape 3.',
  },
  footer: {
    siteTitle: '// Site',
    elsewhereTitle: '// Elsewhere',
    contactTitle: '// Contact',
  },
  socials: {
    github: 'GitHub',
    linkedin: 'LinkedIn',
    email: 'Email',
  },
};

export default en;
