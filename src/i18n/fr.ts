import type { Translations } from './en';

const fr: Translations = {
  nav: {
    home: 'Accueil',
    projects: 'Projets',
    blog: 'Blog',
    research: 'Recherche',
    about: 'À propos',
  },
  status: 'J’apprends Rust & le deep learning',
  aboutAvatarAria: 'À propos de Pierrick',
  toggleThemeAria: 'Changer de thème',
  languageSwitchAria: 'Changer de langue',
  hero: {
    eyebrow: 'PORTFOLIO',
    iAmLabel: '// Je suis',
    roles: ['développeur', 'bidouilleur', 'apprenant', 'bâtisseur', 'curieux'],
    tagline:
      'Développeur full-stack passionné, plus de 12 ans d’expérience. Je construis, j’apprends et j’explore l’artisanat du logiciel.',
    meta: {
      role: 'Rôle',
      focus: 'Spécialité',
      based: 'Localisation',
      status: 'Statut',
      values: {
        role: 'Développeur full-stack',
        focus: '.NET · Angular · Rust',
        based: 'Limoux · Aude · France',
        status: 'En poste',
      },
    },
  },
  career: {
    title: '// Parcours',
    count: '07 / postes',
    nowLabel: 'AUJ.',
    items: [
      {
        period: '2021 — AUJ.',
        role: 'Développeur full-stack',
        place: 'Coperlab / Groupe AGEO Assurances · Bordeaux',
        summary:
          'Plateforme Angular + .NET 10 pour les contrats de prévoyance d’AGEO puis Howden. Refonte autour de Clean Architecture, CQRS, DDD et Event Sourcing avec Marten. Tests d’intégration conteneurisés (Testcontainers, Docker).',
      },
      {
        period: '2020 — 2021',
        role: 'Consultant logiciel',
        place: 'Davidson Consulting · Toulouse',
        summary:
          'Solutions mobiles en .NET, Java et Kotlin pour Scan Achat chez Infomil (Leclerc). Interfaces natives et performantes pour terminaux portables.',
      },
      {
        period: '2020',
        role: 'Développeur indépendant',
        place: 'Limoux',
        summary:
          'Sites e-commerce sur mesure et installations Prestashop pour des entreprises locales.',
      },
      {
        period: '2014 — 2019',
        role: 'Responsable développement web',
        place: 'Saceo SAS · Toulouse',
        summary:
          'Responsable d’Opisto.fr et Opisto.pro de bout en bout. Conception d’une API REST publique, encadrement d’une petite équipe de devs, relation technique avec les clients.',
      },
      {
        period: '2013 — 2014',
        role: 'Développeur web (alternance)',
        place: 'Saceo SAS · Toulouse',
        summary:
          'Deux jours par semaine sur Opisto.fr en troisième année. Travail de performance qui a contribué à multiplier le CA par 5. Projets transverses en WPF.',
      },
      {
        period: '2013 — 2014',
        role: 'Développeur indépendant',
        place: 'Autoentrepreneur',
        summary: 'Sites internet sur mesure et installations CMS pour clients particuliers.',
      },
      {
        period: '2012',
        role: 'Stagiaire développeur web',
        place: 'Saceo SAS',
        summary: 'Premier stage — deux sites e-commerce de pièces automobiles.',
      },
    ],
  },
  stack: {
    title: '// Stack',
    count: '09 / domaines',
    groups: [
      { category: 'Architecture', techs: 'CQRS · Event Sourcing' },
      { category: 'Frontend', techs: 'Angular · React' },
      { category: 'Langages', techs: 'C# .NET · TypeScript · Rust' },
      { category: 'Conception', techs: 'Domain-Driven Design' },
      { category: 'Bases de données', techs: 'SQL Server · Postgres (Marten) · MongoDB' },
      { category: 'Tests', techs: 'xUnit · Testcontainers' },
      { category: 'Cloud', techs: 'Azure' },
      { category: 'CI / CD', techs: 'GitHub · Azure Pipelines' },
      { category: 'Conteneurs', techs: 'Docker · K3s' },
    ],
  },
  about: {
    title: '// À propos',
    caption: 'Pierrick Fonquerne · Limoux, FR',
    photoYear: '2025',
  },
  footer: {
    siteTitle: '// Site',
    elsewhereTitle: '// Ailleurs',
    contactTitle: '// Contact',
  },
  socials: {
    github: 'GitHub',
    linkedin: 'LinkedIn',
    email: 'Email',
  },
  a11y: {
    skipToContent: 'Aller au contenu',
  },
};

export default fr;
