import { useEffect, useId, useRef, useState, type JSX } from 'react';
import mermaid from 'mermaid';

interface Props {
  definition: string;
  caption?: string;
}

type MermaidTheme = 'default' | 'dark';

// Theme currently applied to the shared mermaid instance. Tracked at module
// level (mermaid.initialize is global) so re-initializing only happens when
// the theme actually changes, instead of never after the first render.
let currentTheme: MermaidTheme | null = null;

function getPreferredTheme(): MermaidTheme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark';
}

function ensureInit(theme: MermaidTheme): void {
  if (currentTheme === theme) return;
  currentTheme = theme;
  mermaid.initialize({
    startOnLoad: false,
    theme,
    securityLevel: 'strict',
    fontFamily: 'JetBrains Mono Variable, ui-monospace, monospace',
  });
}

export default function MermaidDiagram({ definition, caption }: Props): JSX.Element {
  const id = useId().replace(/[:]/g, '');
  const ref = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState<string>('');
  const [theme, setTheme] = useState<MermaidTheme>(() => getPreferredTheme());

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const target = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme(getPreferredTheme());
    });
    observer.observe(target, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    ensureInit(theme);
    let cancelled = false;
    mermaid
      .render(`mmd-${id}`, definition)
      .then((result) => {
        if (!cancelled) setSvg(result.svg);
      })
      .catch(() => {
        if (!cancelled) setSvg('<pre>Mermaid render error</pre>');
      });
    return () => {
      cancelled = true;
    };
  }, [definition, id, theme]);

  return (
    <figure className="my-6 overflow-x-auto rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-4">
      <div ref={ref} dangerouslySetInnerHTML={{ __html: svg }} />
      {caption && (
        <figcaption className="mt-3 text-center font-mono text-[11px] tracking-[0.12em] text-[var(--color-fg-dim)] uppercase">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
