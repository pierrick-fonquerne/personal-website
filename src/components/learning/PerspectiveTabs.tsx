import { useState, type JSX } from 'react';

interface Perspective {
  id: string;
  label: string;
  /** Term as seen from this perspective, e.g. the local definition of a shared word. */
  heading: string;
  /** Attribute list displayed as a pseudo data structure. */
  fields: { name: string; note?: string }[];
  summary: string;
}

interface Props {
  title: string;
  perspectives: Perspective[];
}

export default function PerspectiveTabs({ title, perspectives }: Props): JSX.Element {
  const [activeId, setActiveId] = useState<string>(perspectives[0]?.id ?? '');

  const active = perspectives.find((p) => p.id === activeId) ?? perspectives[0];

  return (
    <section className="my-8 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-6">
      <header className="mb-4">
        <span className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-accent)] uppercase">
          {title}
        </span>
      </header>
      <div className="mb-4 flex flex-wrap gap-2">
        {perspectives.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveId(p.id)}
            className={`rounded-md border px-3 py-1.5 font-mono text-[12px] transition-colors ${
              p.id === activeId
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                : 'border-[var(--color-line)] text-[var(--color-fg-muted)] hover:border-[var(--color-fg-dim)]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {active && (
        <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg)] p-4">
          <p className="mb-3 font-mono text-[13px] font-medium text-[var(--color-fg)]">
            {active.heading}
          </p>
          <ul className="mb-3 flex flex-col gap-1 border-l-2 border-[var(--color-line)] pl-4">
            {active.fields.map((f) => (
              <li key={f.name} className="font-mono text-[12px] text-[var(--color-fg-muted)]">
                {f.name}
                {f.note && <span className="text-[var(--color-fg-dim)]"> — {f.note}</span>}
              </li>
            ))}
          </ul>
          <p className="text-[13px] leading-relaxed text-[var(--color-fg-dim)]">{active.summary}</p>
        </div>
      )}
    </section>
  );
}
