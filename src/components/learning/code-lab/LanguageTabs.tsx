import type { JSX, KeyboardEvent } from 'react';
import type { CodeLanguage } from './code-lab-types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Props for the LanguageTabs presentational tab bar. */
export interface LanguageTabsProps {
  /** Languages available, already in canonical order (csharp before rust). */
  readonly languages: readonly CodeLanguage[];
  /** Currently selected language. */
  readonly activeLanguage: CodeLanguage;
  /** Callback invoked when the user selects a different language. */
  readonly onSelect: (language: CodeLanguage) => void;
  /**
   * Display label overrides.
   * Defaults: csharp -> "C#", rust -> "Rust".
   */
  readonly labels?: Partial<Record<CodeLanguage, string>>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default visible label for each supported language. */
const DEFAULT_LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  csharp: 'C#',
  rust: 'Rust',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Presentational, controlled tab bar for switching the active programming
 * language in a CodeLab exercise.
 *
 * Returns null when fewer than two languages are provided (single-language
 * exercises have no need for a switcher).
 *
 * Implements the ARIA tablist pattern: roving tabIndex, arrow-key navigation
 * with wrap-around, Home/End shortcuts.
 */
export default function LanguageTabs({
  languages,
  activeLanguage,
  onSelect,
  labels,
}: LanguageTabsProps): JSX.Element | null {
  if (languages.length < 2) {
    return null;
  }

  /** Resolve the display label for a language. */
  function labelFor(language: CodeLanguage): string {
    return labels?.[language] ?? DEFAULT_LANGUAGE_LABELS[language];
  }

  /** Resolve the target tab index from a keyboard event, or null if not handled. */
  function resolveNavigationIndex(key: string, index: number): number | null {
    const count = languages.length;
    switch (key) {
      case 'ArrowRight': return (index + 1) % count;
      case 'ArrowLeft': return (index - 1 + count) % count;
      case 'Home': return 0;
      case 'End': return count - 1;
      default: return null;
    }
  }

  /** Handle keyboard navigation on a tab button. */
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const targetIndex = resolveNavigationIndex(event.key, index);
    if (targetIndex === null) {
      return;
    }
    event.preventDefault();
    const target = languages[targetIndex];
    if (target !== undefined) {
      onSelect(target);
    }
  }

  return (
    <div
      role="tablist"
      className="cl-language-tabs flex gap-1 rounded-md border border-[var(--color-line)] bg-[var(--color-bg-elevated)] p-1"
    >
      {languages.map((language, index) => {
        const isActive = language === activeLanguage;
        return (
          <button
            key={language}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelect(language)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={[
              'cl-language-tabs__tab',
              'rounded px-3 py-1.5 font-mono text-[12px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/50',
              isActive
                ? 'cl-language-tabs__tab--active border border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                : 'border border-transparent text-[var(--color-fg-muted)] hover:border-[var(--color-line)] hover:text-[var(--color-fg-dim)]',
            ].join(' ')}
          >
            {labelFor(language)}
          </button>
        );
      })}
    </div>
  );
}
