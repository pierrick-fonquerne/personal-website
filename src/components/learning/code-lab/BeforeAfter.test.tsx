import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BeforeAfter from './BeforeAfter';
import type { BeforeAfterContent } from './code-lab-types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const BEFORE_CODE = `using System;

public class Greeter
{
    public string Greet(string name)
    {
        Console.WritLne("Hello, " + name);
        return null;
    }
}`;

const AFTER_CODE = `using System;

public class Greeter
{
    public string Greet(string name)
    {
        Console.WriteLine("Hello, " + name);
        return "Hello, " + name;
    }
}`;

const CONTENT: BeforeAfterContent = {
  before: BEFORE_CODE,
  after: AFTER_CODE,
};

const COPY = {
  beforeLabel: 'Avant',
  afterLabel: 'Après',
  diffLabel: 'Différences',
  addedAriaLabel: 'Ligne ajoutée',
  removedAriaLabel: 'Ligne supprimée',
};

// ---------------------------------------------------------------------------
// Default view (diff)
// ---------------------------------------------------------------------------

describe('BeforeAfter - vue par defaut', () => {
  it('affiche la vue diff par defaut : des elements data-diff-type sont rendus', () => {
    render(<BeforeAfter content={CONTENT} language="csharp" copy={COPY} />);
    const diffLines = document.querySelectorAll('[data-diff-type]');
    expect(diffLines.length).toBeGreaterThan(0);
  });

  it('le bouton Différences est actif par defaut (aria-pressed="true")', () => {
    render(<BeforeAfter content={CONTENT} language="csharp" copy={COPY} />);
    const diffButton = screen.getByRole('button', { name: 'Différences' });
    expect(diffButton.getAttribute('aria-pressed')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Diff view correctness
// ---------------------------------------------------------------------------

describe('BeforeAfter - vue diff : precision', () => {
  it('rend exactement une ligne removed et une ligne added pour un changement de ligne unique', () => {
    const content: BeforeAfterContent = { before: 'a\nb\nc', after: 'a\nB\nc' };
    render(
      <BeforeAfter
        content={content}
        language="csharp"
        copy={{ beforeLabel: 'Avant', afterLabel: 'Après' }}
      />,
    );

    const removedLines = document.querySelectorAll('[data-diff-type="removed"]');
    const addedLines = document.querySelectorAll('[data-diff-type="added"]');
    const unchangedLines = document.querySelectorAll('[data-diff-type="unchanged"]');

    expect(removedLines).toHaveLength(1);
    expect(addedLines).toHaveLength(1);
    expect(unchangedLines).toHaveLength(2);
  });

  it('la ligne removed contient le texte "b" et la ligne added contient "B"', () => {
    const content: BeforeAfterContent = { before: 'a\nb\nc', after: 'a\nB\nc' };
    render(
      <BeforeAfter
        content={content}
        language="csharp"
        copy={{ beforeLabel: 'Avant', afterLabel: 'Après' }}
      />,
    );

    const removed = document.querySelector('[data-diff-type="removed"]');
    const added = document.querySelector('[data-diff-type="added"]');

    expect(removed?.textContent).toContain('b');
    expect(added?.textContent).toContain('B');
  });

  it('la ligne added porte le marqueur "+"', () => {
    const content: BeforeAfterContent = { before: 'a\nb', after: 'a\nB' };
    render(
      <BeforeAfter
        content={content}
        language="csharp"
        copy={{ beforeLabel: 'Avant', afterLabel: 'Après' }}
      />,
    );

    const added = document.querySelector('[data-diff-type="added"]');
    expect(added?.textContent).toContain('+');
  });

  it('la ligne removed porte le marqueur "-"', () => {
    const content: BeforeAfterContent = { before: 'a\nb', after: 'a\nB' };
    render(
      <BeforeAfter
        content={content}
        language="csharp"
        copy={{ beforeLabel: 'Avant', afterLabel: 'Après' }}
      />,
    );

    const removed = document.querySelector('[data-diff-type="removed"]');
    expect(removed?.textContent).toContain('-');
  });

  it('des numeros de ligne sont affiches dans la vue diff', () => {
    render(<BeforeAfter content={CONTENT} language="csharp" copy={COPY} />);
    // At least line "1" should appear as a line number
    const diffContainer = document.querySelector('[data-testid="diff-view"]');
    expect(diffContainer?.textContent).toContain('1');
  });
});

// ---------------------------------------------------------------------------
// A11y : aria-label on diff lines
// ---------------------------------------------------------------------------

describe('BeforeAfter - accessibilite diff', () => {
  it('la ligne ajoutee porte addedAriaLabel si fourni', () => {
    const content: BeforeAfterContent = { before: 'a', after: 'b' };
    render(
      <BeforeAfter
        content={content}
        language="csharp"
        copy={{ beforeLabel: 'Avant', afterLabel: 'Après', addedAriaLabel: 'Ligne ajoutée' }}
      />,
    );

    const added = document.querySelector('[data-diff-type="added"]');
    expect(added?.getAttribute('aria-label')).toBe('Ligne ajoutée');
  });

  it('la ligne supprimee porte removedAriaLabel si fourni', () => {
    const content: BeforeAfterContent = { before: 'a', after: 'b' };
    render(
      <BeforeAfter
        content={content}
        language="csharp"
        copy={{ beforeLabel: 'Avant', afterLabel: 'Après', removedAriaLabel: 'Ligne supprimée' }}
      />,
    );

    const removed = document.querySelector('[data-diff-type="removed"]');
    expect(removed?.getAttribute('aria-label')).toBe('Ligne supprimée');
  });

  it('les lignes inchangees ne portent pas de aria-label', () => {
    const content: BeforeAfterContent = { before: 'a\nb', after: 'a\nB' };
    render(
      <BeforeAfter
        content={content}
        language="csharp"
        copy={{ beforeLabel: 'Avant', afterLabel: 'Après', addedAriaLabel: 'ajout' }}
      />,
    );

    const unchanged = document.querySelector('[data-diff-type="unchanged"]');
    expect(unchanged?.getAttribute('aria-label')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// View switching
// ---------------------------------------------------------------------------

describe('BeforeAfter - bascule de vue', () => {
  it('clic sur Avant affiche le code before et masque les diff lines', () => {
    render(<BeforeAfter content={CONTENT} language="csharp" copy={COPY} />);

    fireEvent.click(screen.getByRole('button', { name: 'Avant' }));

    // diff lines no longer present
    expect(document.querySelectorAll('[data-diff-type]')).toHaveLength(0);
    // before content visible: "Console.WritLne" is unique to the before snippet
    expect(screen.getByText(/Console\.WritLne/)).toBeDefined();
  });

  it('clic sur Après affiche le code after et masque les diff lines', () => {
    render(<BeforeAfter content={CONTENT} language="csharp" copy={COPY} />);

    fireEvent.click(screen.getByRole('button', { name: 'Après' }));

    expect(document.querySelectorAll('[data-diff-type]')).toHaveLength(0);
    // after content: "Console.WriteLine" (correct spelling)
    expect(screen.getByText(/Console\.WriteLine/)).toBeDefined();
  });

  it('clic sur Avant rend le bouton Avant aria-pressed="true"', () => {
    render(<BeforeAfter content={CONTENT} language="csharp" copy={COPY} />);

    fireEvent.click(screen.getByRole('button', { name: 'Avant' }));

    expect(screen.getByRole('button', { name: 'Avant' }).getAttribute('aria-pressed')).toBe('true');
    expect(
      screen.getByRole('button', { name: 'Différences' }).getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('clic sur Après rend le bouton Après aria-pressed="true"', () => {
    render(<BeforeAfter content={CONTENT} language="csharp" copy={COPY} />);

    fireEvent.click(screen.getByRole('button', { name: 'Après' }));

    expect(screen.getByRole('button', { name: 'Après' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('retour sur Différences depuis Avant re-affiche les diff lines', () => {
    render(<BeforeAfter content={CONTENT} language="csharp" copy={COPY} />);

    fireEvent.click(screen.getByRole('button', { name: 'Avant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Différences' }));

    expect(document.querySelectorAll('[data-diff-type]').length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// diffLabel optional default
// ---------------------------------------------------------------------------

describe('BeforeAfter - diffLabel optionnel', () => {
  it('utilise une etiquette par defaut si diffLabel est absent', () => {
    render(
      <BeforeAfter
        content={CONTENT}
        language="csharp"
        copy={{ beforeLabel: 'Avant', afterLabel: 'Après' }}
      />,
    );

    // Some default diff button must exist
    const buttons = screen.getAllByRole('button');
    const diffButton = buttons.find((b) => b.getAttribute('aria-pressed') === 'true');
    expect(diffButton).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Buttons type="button"
// ---------------------------------------------------------------------------

describe('BeforeAfter - accessibilite boutons', () => {
  it('tous les boutons de vue ont type="button"', () => {
    render(<BeforeAfter content={CONTENT} language="csharp" copy={COPY} />);
    screen.getAllByRole('button').forEach((btn) => {
      expect(btn.getAttribute('type')).toBe('button');
    });
  });
});
