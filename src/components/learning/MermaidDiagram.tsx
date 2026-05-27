import { useEffect, useId, useRef, useState, type JSX } from 'react';
import mermaid from 'mermaid';

interface Props {
  definition: string;
  caption?: string;
}

let initialized = false;

function ensureInit(): void {
  if (initialized) return;
  initialized = true;
  const theme =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'light'
      ? 'default'
      : 'dark';
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

  useEffect(() => {
    ensureInit();
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
  }, [definition, id]);

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
