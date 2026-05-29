const STRIP_SELECTORS = [
  '.interactive-only',
  '.chapter-toolbar',
  '.chapter-audio-player',
  'nav',
  'footer',
  '[data-print="hide"]',
  'button',
  'script',
  'style',
].join(', ');

const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'SECTION',
  'ARTICLE',
  'HEADER',
  'FOOTER',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'LI',
  'TR',
  'BLOCKQUOTE',
  'PRE',
  'FIGURE',
]);

function collectText(node: Node, out: string[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    if (text.trim().length > 0) out.push(text.replace(/\s+/g, ' '));
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as HTMLElement;
  const tag = el.tagName;

  if (BLOCK_TAGS.has(tag)) out.push('\n');
  el.childNodes.forEach((child) => collectText(child, out));
  if (BLOCK_TAGS.has(tag)) out.push('\n');
}

export function extractReadableText(rootSelector: string): string {
  if (typeof document === 'undefined') return '';
  const root = document.querySelector(rootSelector);
  if (!root) return '';

  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(STRIP_SELECTORS).forEach((el) => el.remove());

  const parts: string[] = [];
  collectText(clone, parts);

  return parts
    .join('')
    .replace(/\n{2,}/g, '\n')
    .trim();
}
