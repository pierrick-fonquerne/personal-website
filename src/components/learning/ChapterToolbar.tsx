import type { JSX } from 'react';

interface Props {
  labels: {
    print: string;
  };
}

export default function ChapterToolbar({ labels }: Props): JSX.Element {
  const handlePrint = (): void => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div
      className="chapter-toolbar sticky top-4 z-20 mb-8 flex items-center justify-end gap-2"
      data-print="hide"
    >
      <button
        type="button"
        onClick={handlePrint}
        aria-label={labels.print}
        title={labels.print}
        className="inline-flex items-center gap-2 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] px-3 py-1.5 font-mono text-[11px] tracking-[0.14em] text-[var(--color-fg-muted)] uppercase transition-colors duration-150 hover:border-[var(--color-line-strong)] hover:text-[var(--color-fg)]"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        <span>{labels.print}</span>
      </button>
    </div>
  );
}
