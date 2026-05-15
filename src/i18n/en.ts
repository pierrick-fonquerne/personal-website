export interface CareerItem {
  period: string;
  role: string;
  place: string;
  summary: string;
}

export interface StackGroup {
  category: string;
  techs: string;
}

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
    iAmLabel: string;
    roles: string[];
    tagline: string;
    meta: {
      role: string;
      focus: string;
      based: string;
      status: string;
      values: {
        role: string;
        focus: string;
        based: string;
        status: string;
      };
    };
  };
  career: {
    title: string;
    count: string;
    items: CareerItem[];
  };
  stack: {
    title: string;
    count: string;
    groups: StackGroup[];
  };
  about: {
    title: string;
    caption: string;
    photoYear: string;
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
    iAmLabel: '// I am',
    roles: ['a developer', 'a tinkerer', 'a learner', 'a builder', 'curious'],
    tagline:
      'Passionate full-stack developer with 12+ years of experience. I build, learn and explore the craft of software.',
    meta: {
      role: 'Role',
      focus: 'Focus',
      based: 'Based',
      status: 'Status',
      values: {
        role: 'Full-stack developer',
        focus: '.NET · Angular · Rust',
        based: 'Limoux · Aude · France',
        status: 'Curious & shipping',
      },
    },
  },
  career: {
    title: '// Journey',
    count: '07 / roles',
    items: [
      {
        period: '2021 — NOW',
        role: 'Full-stack developer',
        place: 'Coperlab / Groupe AGEO Assurances · Bordeaux',
        summary:
          'Built an Angular + .NET 10 platform for AGEO and Howden life-insurance contracts. Led the migration to Clean Architecture, CQRS, DDD and Event Sourcing with Marten. Integration tests with Testcontainers and Docker.',
      },
      {
        period: '2020 — 2021',
        role: 'Software consultant',
        place: 'Davidson Consulting · Toulouse',
        summary:
          'Built mobile solutions in .NET, Java and Kotlin for in-store Scan Achat at Infomil (Leclerc). Native, performant interfaces for handheld terminals.',
      },
      {
        period: '2020',
        role: 'Freelance developer',
        place: 'Limoux',
        summary: 'Custom e-commerce sites and Prestashop installs for small local businesses.',
      },
      {
        period: '2014 — 2019',
        role: 'Lead web developer',
        place: 'Saceo SAS · Toulouse',
        summary:
          'Owned Opisto.fr and Opisto.pro end-to-end. Designed a public REST API, led a small dev team and ran the technical relationship with clients.',
      },
      {
        period: '2013 — 2014',
        role: 'Web developer (apprentice)',
        place: 'Saceo SAS · Toulouse',
        summary:
          'Two days a week on Opisto.fr during my third year of studies. Performance work that helped 5× the site’s revenue. Side projects in WPF.',
      },
      {
        period: '2013 — 2014',
        role: 'Freelance developer',
        place: 'Autoentrepreneur',
        summary: 'Custom websites and CMS installs for individual clients.',
      },
      {
        period: '2012',
        role: 'Web developer intern',
        place: 'Saceo SAS',
        summary: 'First internship — built two e-commerce sites for automotive parts.',
      },
    ],
  },
  stack: {
    title: '// Stack',
    count: '09 / topics',
    groups: [
      { category: 'Architecture', techs: 'CQRS · Event Sourcing' },
      { category: 'Frontend', techs: 'Angular · React' },
      { category: 'Languages', techs: 'C# .NET · TypeScript · Rust' },
      { category: 'Design', techs: 'Domain-Driven Design' },
      { category: 'Databases', techs: 'SQL Server · Postgres (Marten) · MongoDB' },
      { category: 'Tests', techs: 'xUnit · Testcontainers' },
      { category: 'Cloud', techs: 'Azure' },
      { category: 'CI / CD', techs: 'GitHub · Azure Pipelines' },
      { category: 'Containers', techs: 'Docker · K3s' },
    ],
  },
  about: {
    title: '// About',
    caption: 'Pierrick Fonquerne · Limoux, FR',
    photoYear: '2025',
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
