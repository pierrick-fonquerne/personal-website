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
  meta: {
    description: string;
  };
  nav: {
    home: string;
    projects: string;
    courses: string;
    research: string;
    about: string;
  };
  toolbar: {
    print: string;
  };
  projects: {
    title: string;
    lead: string;
    soon: string;
    count: (n: number) => string;
    emptyCategory: string;
    backToList: string;
    categories: {
      entrepreneurship: string;
      opensource: string;
      games: string;
      poc: string;
      web: string;
    };
    statuses: {
      active: string;
      maintained: string;
      archived: string;
      dormant: string;
    };
    links: {
      site: string;
      repo: string;
      crates: string;
      docs: string;
      demo: string;
    };
    stackLabel: string;
    statusLabel: string;
    periodLabel: string;
  };
  research: {
    title: string;
    soon: string;
  };
  courses: {
    eyebrow: string;
    indexTitle: string;
    indexLead: string;
    emptyState: string;
    cardCta: string;
    modulesUnit: string;
    minutesUnit: string;
    comingSoon: string;
    glossaryLink: string;
    personalNoteEyebrow: string;
  };
  themes: Record<
    | 'architecture'
    | 'math'
    | 'ai'
    | 'systems'
    | 'data'
    | 'security'
    | 'network'
    | 'quant'
    | 'tooling',
    string
  >;
  subthemes: Record<string, string>;
  module: {
    prev: string;
    next: string;
    backToCourse: string;
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
      languages: string;
      values: {
        role: string;
        focus: string;
        based: string;
        status: string;
        languages: string;
      };
    };
  };
  career: {
    title: string;
    count: string;
    nowLabel: string;
    items: CareerItem[];
  };
  education: {
    title: string;
    count: string;
    items: CareerItem[];
  };
  beyondWork: {
    title: string;
    count: string;
    nowLabel: string;
    volunteering: CareerItem[];
    interestsLabel: string;
    interests: string[];
  };
  a11y: {
    skipToContent: string;
  };
  stack: {
    title: string;
    count: string;
    groups: StackGroup[];
  };
  about: {
    title: string;
    greeting: string;
    lead: string;
    photoYear: string;
    contactLabel: string;
    stats: {
      xpLabel: string;
      xpValue: string;
      ageLabel: string;
      ageUnit: string;
      basedLabel: string;
      basedValue: string;
    };
  };
  footer: {
    siteTitle: string;
    elsewhereTitle: string;
    contactTitle: string;
  };
  socials: {
    github: string;
    linkedin: string;
    crates: string;
    email: string;
  };
}

const en: Translations = {
  meta: {
    description: 'Pierrick Fonquerne, passionate developer. Projects, writing and research.',
  },
  nav: {
    home: 'Home',
    projects: 'Projects',
    courses: 'Courses',
    research: 'Research',
    about: 'About',
  },
  toolbar: {
    print: 'Print chapter',
  },
  projects: {
    title: '// Projects',
    lead: 'A selection of things I build, maintain or experiment with. Personal, open source and entrepreneurial work.',
    soon: 'Section under construction.',
    count: (n) => `${String(n).padStart(2, '0')} / projects`,
    emptyCategory: 'Nothing to show here yet.',
    backToList: '← Back to projects',
    categories: {
      entrepreneurship: 'Entrepreneurship',
      opensource: 'Open source',
      games: 'Games',
      poc: 'Proofs of concept',
      web: 'Web',
    },
    statuses: {
      active: 'Active',
      maintained: 'Maintained',
      archived: 'Archived',
      dormant: 'Dormant',
    },
    links: {
      site: 'Site',
      repo: 'Repository',
      crates: 'crates.io',
      docs: 'Docs',
      demo: 'Demo',
    },
    stackLabel: 'Stack',
    statusLabel: 'Status',
    periodLabel: 'Period',
  },
  research: {
    title: '// Research',
    soon: 'Section under construction.',
  },
  courses: {
    eyebrow: 'INTERACTIVE COURSES',
    indexTitle: 'Interactive courses',
    indexLead:
      'A lifelong learner, I now lean on AI to draft courses on the broad range of topics I explore: a way to anchor each concept and pass it along.',
    emptyState: 'No course published yet. Come back soon.',
    cardCta: 'Open the course',
    modulesUnit: 'modules',
    minutesUnit: 'min',
    comingSoon: 'Coming soon',
    glossaryLink: 'Glossary →',
    personalNoteEyebrow: 'Personal note',
  },
  themes: {
    architecture: 'Architecture',
    math: 'Math',
    ai: 'AI',
    systems: 'Systems',
    data: 'Data',
    security: 'Security',
    network: 'Network',
    quant: 'Trading',
    tooling: 'Tooling',
  },
  subthemes: {
    'clean-architecture': 'Clean Architecture',
    ddd: 'Domain-Driven Design',
    'mediator-sagas': 'Mediator and sagas',
    'event-sourcing-cqrs': 'Event Sourcing and CQRS',
    'linear-algebra': 'Linear algebra',
    'differential-calculus': 'Differential calculus',
    probabilities: 'Probability and statistics',
    optimization: 'Optimization',
    'information-theory': 'Information theory',
    'neural-nets': 'Neural networks',
    'autonomous-agents': 'Autonomous agents',
    'llm-mcp': 'LLM and MCP',
    'async-perf': 'Async and performance',
    'embedded-rust': 'Embedded Rust',
    'kernel-no-std': 'Kernel and no_std',
    'storage-engines': 'Embedded storage engines',
    'event-stores': 'Event stores',
    rebac: 'ReBAC authorization',
    ledgers: 'Cryptographic ledgers',
    'applied-crypto': 'Applied cryptography',
    auth: 'Authentication',
    audit: 'Audit and traceability',
    'http-api': 'HTTP and API design',
    grpc: 'gRPC and contracts',
    'email-systems': 'Email systems',
    indicators: 'Technical indicators',
    strategies: 'Systematic strategies',
    backtesting: 'Backtesting',
    'cli-rust': 'Robust Rust CLIs',
    iac: 'Infrastructure as Code',
    'ci-self-hosted': 'Self-hosted CI',
    'polyglot-orchestration': 'Polyglot orchestration',
    'mcp-servers': 'MCP servers',
  },
  module: {
    prev: 'Previous',
    next: 'Next',
    backToCourse: 'Back to course',
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
      languages: 'Languages',
      values: {
        role: 'Full-stack developer',
        focus: '.NET · Angular · Rust',
        based: 'Limoux · Aude · France',
        status: 'Currently in a role',
        languages: 'FR (native) · EN B2',
      },
    },
  },
  career: {
    title: '// Journey',
    count: '07 / roles',
    nowLabel: 'NOW',
    items: [
      {
        period: '2021 - NOW',
        role: 'Full-stack developer',
        place: 'Coperlab / Groupe AGEO Assurances · Bordeaux',
        summary:
          'Built an Angular + .NET 10 platform for AGEO and Howden life-insurance contracts. Led the migration to Clean Architecture, CQRS, DDD and Event Sourcing with Marten. Integration tests with Testcontainers and Docker.',
      },
      {
        period: '2020 - 2021',
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
        period: '2014 - 2019',
        role: 'Lead web developer',
        place: 'Saceo SAS · Toulouse',
        summary:
          'Owned Opisto.fr and Opisto.pro end-to-end. Designed a public REST API, led a small dev team and ran the technical relationship with clients.',
      },
      {
        period: '2013 - 2014',
        role: 'Web developer (apprentice)',
        place: 'Saceo SAS · Toulouse',
        summary:
          'Two days a week on Opisto.fr during my third year of studies. Performance work that helped 5× the site’s revenue. Side projects in WPF.',
      },
      {
        period: '2013 - 2014',
        role: 'Freelance developer',
        place: 'Autoentrepreneur',
        summary: 'Custom websites and CMS installs for individual clients.',
      },
      {
        period: '2012',
        role: 'Web developer intern',
        place: 'Saceo SAS',
        summary: 'First internship: built two e-commerce sites for automotive parts.',
      },
    ],
  },
  education: {
    title: '// Education',
    count: '02 / schools',
    items: [
      {
        period: '2011 - 2014',
        role: 'Software engineering',
        place: 'Epitech · Toulouse',
        summary:
          'Three-year programming and software engineering curriculum focused on hands-on projects.',
      },
      {
        period: '2010 - 2011',
        role: 'AES, first year of bachelor',
        place: 'Université Toulouse Capitole · Toulouse',
        summary:
          'Economics & social sciences for one year before pivoting to software engineering.',
      },
    ],
  },
  beyondWork: {
    title: '// Beyond work',
    count: '02 / commitments',
    nowLabel: 'NOW',
    volunteering: [
      {
        period: '2019 - NOW',
        role: 'Volunteer firefighter',
        place: 'SDIS de l’Aude · Limoux',
        summary:
          'Caporal-chef. Fire team leader, vehicle driver, first responder for road rescue and emergency medical care.',
      },
      {
        period: '2019 - 2020',
        role: 'Volunteer first-aider',
        place: 'Protection Civile française',
        summary: 'On-site safety at public events.',
      },
    ],
    interestsLabel: '// Interests',
    interests: ['Trail running', 'Rugby', 'Climbing'],
  },
  stack: {
    title: '// Stack',
    count: '10 / topics',
    groups: [
      { category: 'Architecture', techs: 'CQRS · Event Sourcing' },
      { category: 'Design', techs: 'Domain-Driven Design' },
      { category: 'Principles', techs: 'Clean Architecture · SOLID' },
      { category: 'Languages', techs: 'C# .NET · TypeScript · Rust' },
      { category: 'Frontend', techs: 'Angular · React' },
      { category: 'Databases', techs: 'SQL Server · Postgres (Marten) · MongoDB' },
      { category: 'Tests', techs: 'xUnit · Testcontainers' },
      { category: 'Cloud', techs: 'Azure' },
      { category: 'CI / CD', techs: 'GitHub · Azure Pipelines' },
      { category: 'Containers', techs: 'Docker · K3s' },
    ],
  },
  about: {
    title: '// About',
    greeting: 'Hi, I’m Pierrick.',
    lead: 'Hooked on code since childhood, professional full-stack developer since 2014. Based in a small village in southern France.',
    photoYear: '2025',
    contactLabel: '// Find me elsewhere',
    stats: {
      xpLabel: 'XP',
      xpValue: '12+ years',
      ageLabel: 'Age',
      ageUnit: 'years',
      basedLabel: 'Based',
      basedValue: 'Limoux · Aude · FR',
    },
  },
  footer: {
    siteTitle: '// Site',
    elsewhereTitle: '// Elsewhere',
    contactTitle: '// Contact',
  },
  socials: {
    github: 'GitHub',
    linkedin: 'LinkedIn',
    crates: 'crates.io',
    email: 'Email',
  },
  a11y: {
    skipToContent: 'Skip to content',
  },
};

export default en;
