import { describe, expect, it } from 'vitest';
import { parseBlankTemplate, type TemplateSegment } from './blank-template';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function text(value: string): TemplateSegment {
  return { kind: 'text', value };
}

function blank(id: string): TemplateSegment {
  return { kind: 'blank', id };
}

// ---------------------------------------------------------------------------
// parseBlankTemplate
// ---------------------------------------------------------------------------

describe('parseBlankTemplate', () => {
  it('retourne un seul segment text quand il ny a aucun marqueur', () => {
    const result = parseBlankTemplate('pas de trous ici');
    expect(result).toEqual([text('pas de trous ici')]);
  });

  it('decoupe un marqueur au milieu en [text, blank, text]', () => {
    const result = parseBlankTemplate('a {{x}} b');
    expect(result).toEqual([text('a '), blank('x'), text(' b')]);
  });

  it('un marqueur en debut donne [blank, text]', () => {
    const result = parseBlankTemplate('{{x}} b');
    expect(result).toEqual([blank('x'), text(' b')]);
  });

  it('un marqueur en fin donne [text, blank]', () => {
    const result = parseBlankTemplate('a {{x}}');
    expect(result).toEqual([text('a '), blank('x')]);
  });

  it('deux marqueurs adjacents donnent [blank, blank] sans text vide', () => {
    const result = parseBlankTemplate('{{x}}{{y}}');
    expect(result).toEqual([blank('x'), blank('y')]);
  });

  it('preserve les sauts de ligne entre marqueur et texte', () => {
    const result = parseBlankTemplate('line1\n{{x}}\nline2');
    expect(result).toEqual([text('line1\n'), blank('x'), text('\nline2')]);
  });

  it('accepte des espaces internes dans le marqueur : {{ foo }} -> id "foo"', () => {
    const result = parseBlankTemplate('{{ foo }}');
    expect(result).toEqual([blank('foo')]);
  });

  it('traite {{ non ferme comme du texte litteral', () => {
    const result = parseBlankTemplate('a {{ b');
    expect(result).toEqual([text('a {{ b')]);
  });

  it('traite un marqueur a contenu non conforme (espaces seuls) comme du texte litteral', () => {
    // {{   }} ne contient pas un identifiant valide : doit rester texte
    const result = parseBlankTemplate('{{   }}');
    expect(result).toEqual([text('{{   }}')]);
  });

  it('accepte des identifiants avec tirets et underscores', () => {
    const result = parseBlankTemplate('{{my-blank_1}}');
    expect(result).toEqual([blank('my-blank_1')]);
  });

  it('retourne un tableau vide pour un gabarit vide', () => {
    const result = parseBlankTemplate('');
    expect(result).toEqual([]);
  });

  it('plusieurs marqueurs avec du texte intercale', () => {
    const result = parseBlankTemplate('fn {{name}}({{param}}: {{type}})');
    expect(result).toEqual([
      text('fn '),
      blank('name'),
      text('('),
      blank('param'),
      text(': '),
      blank('type'),
      text(')'),
    ]);
  });

  it('gabarit realiste C# avec un seul trou', () => {
    const result = parseBlankTemplate('var bus = {{decl}};');
    expect(result).toEqual([text('var bus = '), blank('decl'), text(';')]);
  });
});
