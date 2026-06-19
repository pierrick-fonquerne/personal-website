import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FillInTheBlank, { type FillInCopy } from './FillInTheBlank';
import type { FillInContent } from './code-lab-types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Gabarit realiste C# : un seul trou. */
const CONTENT_SINGLE: FillInContent = {
  template: 'var bus = {{decl}};',
  blanks: [{ id: 'decl', expected: 'new MessageBus()' }],
};

/** Gabarit avec deux trous. */
const CONTENT_TWO: FillInContent = {
  template: '{{type}} {{name}} = {{value}};',
  blanks: [
    { id: 'type', expected: 'var' },
    { id: 'name', expected: 'bus' },
    { id: 'value', expected: 'new MessageBus()' },
  ],
};

const COPY: FillInCopy = {
  instructions: 'Completez le code ci-dessous.',
  checkLabel: 'Verifier',
  revealLabel: 'Voir la solution',
  hideLabel: 'Masquer la solution',
  resetLabel: 'Reinitialiser',
  statusIncomplete: 'Certaines reponses sont incorrectes.',
  statusComplete: 'Bravo, tout est correct !',
  hintLabel: 'Indice',
  hints: { decl: 'Pensez au constructeur de MessageBus.' },
  inputAriaLabel: 'Trou',
};

// ---------------------------------------------------------------------------
// Rendu de base
// ---------------------------------------------------------------------------

describe('FillInTheBlank - rendu de base', () => {
  it('affiche les instructions', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    expect(screen.getByText('Completez le code ci-dessous.')).toBeDefined();
  });

  it('rend un input par trou', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(1);
  });

  it('rend autant d inputs que de trous pour un gabarit multi-trous', () => {
    render(<FillInTheBlank content={CONTENT_TWO} language="csharp" copy={COPY} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(3);
  });

  it('affiche le texte non-trou du gabarit dans le rendu', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    // RTL normalise les espaces en fin de texte : chercher via regex plutot qu'exact match
    expect(screen.getByText(/var bus =/)).toBeDefined();
    expect(screen.getByText(';')).toBeDefined();
  });

  it('le bouton Verifier est present', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    expect(screen.getByRole('button', { name: 'Verifier' })).toBeDefined();
  });

  it('le bouton Voir la solution est present', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    expect(screen.getByRole('button', { name: 'Voir la solution' })).toBeDefined();
  });

  it('le bouton Reinitialiser est present quand resetLabel est fourni', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    expect(screen.getByRole('button', { name: 'Reinitialiser' })).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

describe('FillInTheBlank - verification', () => {
  it('une bonne reponse apres Verifier porte data-blank-status="correct"', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new MessageBus()' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verifier' }));
    expect(input.getAttribute('data-blank-status')).toBe('correct');
  });

  it('une mauvaise reponse apres Verifier porte data-blank-status="incorrect"', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'mauvaise reponse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verifier' }));
    expect(input.getAttribute('data-blank-status')).toBe('incorrect');
  });

  it('un champ vide apres Verifier porte data-blank-status="empty"', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Verifier' }));
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('data-blank-status')).toBe('empty');
  });

  it('affiche statusComplete quand toutes les reponses sont correctes', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new MessageBus()' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verifier' }));
    expect(screen.getByText('Bravo, tout est correct !')).toBeDefined();
  });

  it('affiche statusIncomplete quand au moins une reponse est fausse', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'mauvaise' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verifier' }));
    expect(screen.getByText('Certaines reponses sont incorrectes.')).toBeDefined();
  });

  it('aucun data-blank-status avant la premiere verification', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('data-blank-status')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Indices
// ---------------------------------------------------------------------------

describe('FillInTheBlank - indices', () => {
  it('affiche un bouton indice pour un trou qui a un hint', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    expect(screen.getByRole('button', { name: 'Indice' })).toBeDefined();
  });

  it('le clic sur le bouton indice revele le texte d indice', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    const hintButton = screen.getByRole('button', { name: 'Indice' });
    fireEvent.click(hintButton);
    expect(screen.getByText('Pensez au constructeur de MessageBus.')).toBeDefined();
  });

  it('ne rend pas de bouton indice quand hints est absent', () => {
    const copyNoHints: FillInCopy = { ...COPY, hints: undefined, hintLabel: undefined };
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={copyNoHints} />);
    expect(screen.queryByRole('button', { name: 'Indice' })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Revelation de la solution
// ---------------------------------------------------------------------------

describe('FillInTheBlank - revelation de la solution', () => {
  it('clic sur Voir la solution affiche la valeur expected du trou', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Voir la solution' }));
    // La solution reconstituee contient "new MessageBus()" dans le CodeBlock
    expect(screen.getByText(/new MessageBus\(\)/)).toBeDefined();
  });

  it('le libelle du bouton bascule vers hideLabel apres revelation', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Voir la solution' }));
    expect(screen.getByRole('button', { name: 'Masquer la solution' })).toBeDefined();
  });

  it('clic sur Masquer la solution retire la vue solution', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Voir la solution' }));
    fireEvent.click(screen.getByRole('button', { name: 'Masquer la solution' }));
    expect(screen.queryByText(/new MessageBus\(\)/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

describe('FillInTheBlank - reinitialisation', () => {
  it('le reset vide les reponses et supprime les statuts', () => {
    render(<FillInTheBlank content={CONTENT_SINGLE} language="csharp" copy={COPY} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new MessageBus()' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verifier' }));
    expect(input.getAttribute('data-blank-status')).toBe('correct');

    fireEvent.click(screen.getByRole('button', { name: 'Reinitialiser' }));
    expect((input as HTMLInputElement).value).toBe('');
    expect(input.getAttribute('data-blank-status')).toBeNull();
  });
});
