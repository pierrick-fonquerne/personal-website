import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnnotatedWalkthrough from './AnnotatedWalkthrough';
import type { AnnotatedContent } from './code-lab-types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const CODE_FIXTURE = `using System;
class Program {
  static void Main() {
    Console.WriteLine("Hello");
  }
}`;

const CONTENT: AnnotatedContent = {
  code: CODE_FIXTURE,
  steps: [
    { id: 's1', lineRange: '1-2' },
    { id: 's2', lineRange: '4' },
    { id: 's3', lineRange: '5-6' },
  ],
};

const COPY = {
  previousLabel: 'Précédent',
  nextLabel: 'Suivant',
  stepLabel: 'Étape',
  ofLabel: 'sur',
  annotations: {
    s1: 'Première partie : déclaration',
    s2: 'Quatrième ligne : affichage console',
    s3: 'Accolades fermantes',
  },
};

// ---------------------------------------------------------------------------
// Annotation affichée à la première étape
// ---------------------------------------------------------------------------

describe('AnnotatedWalkthrough - annotation initiale', () => {
  it("affiche l'annotation de la première étape au rendu initial", () => {
    render(<AnnotatedWalkthrough content={CONTENT} language="csharp" copy={COPY} />);

    expect(screen.getByText('Première partie : déclaration')).toBeDefined();
  });

  it('ne montre pas les annotations des étapes suivantes au départ', () => {
    render(<AnnotatedWalkthrough content={CONTENT} language="csharp" copy={COPY} />);

    expect(screen.queryByText('Quatrième ligne : affichage console')).toBeNull();
    expect(screen.queryByText('Accolades fermantes')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Surlignage des lignes à la première étape
// ---------------------------------------------------------------------------

describe('AnnotatedWalkthrough - surlignage initial', () => {
  it('surligne les lignes de la première étape (lineRange 1-2)', () => {
    const { container } = render(
      <AnnotatedWalkthrough content={CONTENT} language="csharp" copy={COPY} />,
    );

    const lines = container.querySelectorAll('[data-line]');
    expect(lines[0]?.getAttribute('data-highlighted')).toBe('true');
    expect(lines[1]?.getAttribute('data-highlighted')).toBe('true');
    expect(lines[2]?.getAttribute('data-highlighted')).not.toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Navigation : clic Suivant
// ---------------------------------------------------------------------------

describe('AnnotatedWalkthrough - navigation Suivant', () => {
  it("passe à l'étape 2 après un clic sur Suivant : annotation mise à jour", () => {
    render(<AnnotatedWalkthrough content={CONTENT} language="csharp" copy={COPY} />);

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(screen.getByText('Quatrième ligne : affichage console')).toBeDefined();
    expect(screen.queryByText('Première partie : déclaration')).toBeNull();
  });

  it("passe à l'étape 2 après un clic sur Suivant : surlignage de la ligne 4", () => {
    const { container } = render(
      <AnnotatedWalkthrough content={CONTENT} language="csharp" copy={COPY} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));

    const lines = container.querySelectorAll('[data-line]');
    expect(lines[3]?.getAttribute('data-highlighted')).toBe('true');
    expect(lines[0]?.getAttribute('data-highlighted')).not.toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Navigation : boutons disabled aux bornes
// ---------------------------------------------------------------------------

describe('AnnotatedWalkthrough - disabled aux bornes', () => {
  it('le bouton Précédent est disabled à la première étape', () => {
    render(<AnnotatedWalkthrough content={CONTENT} language="csharp" copy={COPY} />);

    const prev = screen.getByRole('button', { name: 'Précédent' });
    expect(prev.hasAttribute('disabled')).toBe(true);
  });

  it('le bouton Suivant est disabled à la dernière étape', () => {
    render(<AnnotatedWalkthrough content={CONTENT} language="csharp" copy={COPY} />);

    // Naviguer jusqu'à la dernière étape (3 étapes, donc 2 clics)
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));

    const next = screen.getByRole('button', { name: 'Suivant' });
    expect(next.hasAttribute('disabled')).toBe(true);
  });

  it('le bouton Précédent redevient actif après un clic sur Suivant', () => {
    render(<AnnotatedWalkthrough content={CONTENT} language="csharp" copy={COPY} />);

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));

    const prev = screen.getByRole('button', { name: 'Précédent' });
    expect(prev.hasAttribute('disabled')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Compteur d'étape
// ---------------------------------------------------------------------------

describe('AnnotatedWalkthrough - compteur', () => {
  it('affiche "Étape 1 sur 3" au départ', () => {
    render(<AnnotatedWalkthrough content={CONTENT} language="csharp" copy={COPY} />);

    expect(screen.getByText(/1\s+sur\s+3/)).toBeDefined();
  });

  it('affiche "Étape 2 sur 3" après un clic Suivant', () => {
    render(<AnnotatedWalkthrough content={CONTENT} language="csharp" copy={COPY} />);

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(screen.getByText(/2\s+sur\s+3/)).toBeDefined();
  });

  it('affiche "/ 3" quand ofLabel est absent (valeur par défaut)', () => {
    const copyWithoutOfLabel = { ...COPY, stepLabel: undefined, ofLabel: undefined };
    render(<AnnotatedWalkthrough content={CONTENT} language="csharp" copy={copyWithoutOfLabel} />);

    expect(screen.getByText(/1\s*\/\s*3/)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Navigation retour : bouton Précédent
// ---------------------------------------------------------------------------

describe('AnnotatedWalkthrough - navigation Précédent', () => {
  it('revient à la première étape après Suivant puis Précédent', () => {
    render(<AnnotatedWalkthrough content={CONTENT} language="csharp" copy={COPY} />);

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Précédent' }));

    expect(screen.getByText('Première partie : déclaration')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Annotations provenant de copy.annotations keyed par id
// ---------------------------------------------------------------------------

describe('AnnotatedWalkthrough - résolution annotation par id', () => {
  it("affiche l'annotation de l'étape 3 (keyed s3) en fin de navigation", () => {
    render(<AnnotatedWalkthrough content={CONTENT} language="csharp" copy={COPY} />);

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(screen.getByText('Accolades fermantes')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Cas défensif : steps vide
// ---------------------------------------------------------------------------

describe('AnnotatedWalkthrough - steps vide', () => {
  it('affiche le code sans navigation si steps est vide', () => {
    const emptyContent: AnnotatedContent = { code: CODE_FIXTURE, steps: [] };
    render(
      <AnnotatedWalkthrough
        content={emptyContent}
        language="csharp"
        copy={COPY}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Suivant' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Précédent' })).toBeNull();
  });

  it('affiche bien le code source quand steps est vide', () => {
    const emptyContent: AnnotatedContent = { code: 'let x = 1;', steps: [] };
    render(
      <AnnotatedWalkthrough
        content={emptyContent}
        language="csharp"
        copy={COPY}
      />,
    );

    expect(screen.getByText('let x = 1;')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Accessibilité : aria-live sur le panneau d'annotation
// ---------------------------------------------------------------------------

describe('AnnotatedWalkthrough - accessibilité aria-live', () => {
  it('le panneau d\'annotation a aria-live="polite"', () => {
    const { container } = render(
      <AnnotatedWalkthrough content={CONTENT} language="csharp" copy={COPY} />,
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Accessibilité : boutons type="button"
// ---------------------------------------------------------------------------

describe('AnnotatedWalkthrough - accessibilité boutons', () => {
  it('tous les boutons de navigation ont type="button"', () => {
    render(<AnnotatedWalkthrough content={CONTENT} language="csharp" copy={COPY} />);

    screen.getAllByRole('button').forEach((btn) => {
      expect(btn.getAttribute('type')).toBe('button');
    });
  });
});
