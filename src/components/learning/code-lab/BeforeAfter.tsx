import { useMemo, useState } from 'react';
import type { JSX } from 'react';
import type { BeforeAfterContent, CodeLanguage } from './code-lab-types';
import { diffLines } from './code-diff';
import CodeBlock from './CodeBlock';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Copy strings for the BeforeAfter component view selector and diff accessibility. */
export interface BeforeAfterCopy {
  /** Label for the broken-code view button, e.g. "Avant". */
  readonly beforeLabel: string;
  /** Label for the fixed-code view button, e.g. "Après". */
  readonly afterLabel: string;
  /** Label for the diff view button. Falls back to an internal default when absent. */
  readonly diffLabel?: string;
  /** Accessible label for an added diff line. */
  readonly addedAriaLabel?: string;
  /** Accessible label for a removed diff line. */
  readonly removedAriaLabel?: string;
}

/** Props for the BeforeAfter component. */
export interface BeforeAfterProps {
  /** Before and after code snippets to compare. */
  readonly content: BeforeAfterContent;
  /** Programming language for syntax highlighting in plain views. */
  readonly language: CodeLanguage;
  /** Visible and accessible copy strings. */
  readonly copy: BeforeAfterCopy;
}

// ---------------------------------------------------------------------------
// View type
// ---------------------------------------------------------------------------

type ActiveView = 'before' | 'after' | 'diff';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Before-after interactive code comparison component.
 *
 * Provides three views via a segmented control:
 * - before: broken code snippet rendered via CodeBlock.
 * - after: fixed code snippet rendered via CodeBlock.
 * - diff: line-by-line diff rendered with added/removed/unchanged highlighting.
 *
 * Default view is diff (most pedagogical). The diff engine is memoised on
 * before+after so switching views is free.
 */
export default function BeforeAfter({ content, language, copy }: BeforeAfterProps): JSX.Element {
  const [activeView, setActiveView] = useState<ActiveView>('diff');

  const diffResult = useMemo(
    () => diffLines(content.before, content.after),
    [content.before, content.after],
  );

  const diffButtonLabel = copy.diffLabel ?? 'Diff';

  // ---------------------------------------------------------------------------
  // Button styling helpers
  // ---------------------------------------------------------------------------

  function viewButtonClass(view: ActiveView): string {
    const isActive = activeView === view;
    return [
      'rounded border px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50',
      isActive
        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
        : 'border-[var(--color-line)] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-fg)]',
    ].join(' ');
  }

  // ---------------------------------------------------------------------------
  // Diff line styling
  // ---------------------------------------------------------------------------

  function diffLineClass(type: 'added' | 'removed' | 'unchanged'): string {
    const base = 'flex items-start font-mono text-sm leading-relaxed';
    if (type === 'added') return `${base} bg-green-500/10`;
    if (type === 'removed') return `${base} bg-red-500/10`;
    return base;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="my-4 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)]">
      {/* View selector */}
      <div className="flex gap-2 border-b border-[var(--color-line)] p-3">
        <button
          type="button"
          aria-pressed={activeView === 'before'}
          onClick={() => setActiveView('before')}
          className={viewButtonClass('before')}
        >
          {copy.beforeLabel}
        </button>
        <button
          type="button"
          aria-pressed={activeView === 'after'}
          onClick={() => setActiveView('after')}
          className={viewButtonClass('after')}
        >
          {copy.afterLabel}
        </button>
        <button
          type="button"
          aria-pressed={activeView === 'diff'}
          onClick={() => setActiveView('diff')}
          className={viewButtonClass('diff')}
        >
          {diffButtonLabel}
        </button>
      </div>

      {/* Content area */}
      <div className="p-0">
        {/* Before view */}
        {activeView === 'before' && (
          <div className="p-4">
            <CodeBlock code={content.before} language={language} />
          </div>
        )}

        {/* After view */}
        {activeView === 'after' && (
          <div className="p-4">
            <CodeBlock code={content.after} language={language} />
          </div>
        )}

        {/* Diff view */}
        {activeView === 'diff' && (
          <div
            data-testid="diff-view"
            className="overflow-x-auto rounded-b-md bg-[var(--color-bg)] p-0"
          >
            {diffResult.lines.map((line, index) => {
              const sign =
                line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';

              const beforeNum =
                line.type !== 'added' && line.beforeLineNumber != null
                  ? String(line.beforeLineNumber)
                  : '';

              const afterNum =
                line.type !== 'removed' && line.afterLineNumber != null
                  ? String(line.afterLineNumber)
                  : '';

              const ariaLabel =
                line.type === 'added'
                  ? copy.addedAriaLabel
                  : line.type === 'removed'
                    ? copy.removedAriaLabel
                    : undefined;

              return (
                <div
                  key={index}
                  data-diff-type={line.type}
                  className={diffLineClass(line.type)}
                  aria-label={ariaLabel}
                >
                  {/* Line numbers gutter */}
                  <span className="w-10 shrink-0 select-none pr-2 text-right text-[var(--color-fg-dim)]">
                    {beforeNum}
                  </span>
                  <span className="w-10 shrink-0 select-none pr-2 text-right text-[var(--color-fg-dim)]">
                    {afterNum}
                  </span>
                  {/* Sign gutter */}
                  <span className="w-5 shrink-0 select-none text-center text-[var(--color-fg-muted)]">
                    {sign}
                  </span>
                  {/* Code content */}
                  <span className="flex-1 whitespace-pre px-2 text-[var(--color-fg)]">
                    {line.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
