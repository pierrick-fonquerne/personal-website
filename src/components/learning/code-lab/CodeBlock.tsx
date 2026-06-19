import { useState, useEffect, useCallback, type JSX } from 'react';
import type { ThemedToken } from 'shiki';
import type { CodeLanguage } from './code-lab-types';
import { getCodeHighlighter, parseLineRanges, toShikiLanguage } from './highlight';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Props for the CodeBlock read-only syntax-highlighted code display. */
export interface CodeBlockProps {
  /** Source code to display. */
  readonly code: string;
  /** Programming language for syntax highlighting. */
  readonly language: CodeLanguage;
  /**
   * Line highlight specification, e.g. "2-4,7".
   * Lines are 1-based. If absent, no lines are highlighted.
   */
  readonly highlightedLines?: string;
  /**
   * Label for the copy button (visible prose).
   * If absent, no copy button is rendered.
   */
  readonly copyLabel?: string;
  /**
   * Label shown on the copy button after a successful copy.
   * Falls back to copyLabel when absent.
   */
  readonly copiedLabel?: string;
}

// ---------------------------------------------------------------------------
// COPY_RESET_DELAY_MS: how long the "copied" label stays visible.
// ---------------------------------------------------------------------------

const COPY_RESET_DELAY_MS = 1500;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Read-only code block with Shiki syntax highlighting, optional line
 * highlighting, and an optional copy-to-clipboard button.
 *
 * Rendering strategy:
 * - Synchronous pass: raw text per line (always present, guarantees a11y).
 * - Async enhancement: Shiki token colours applied via a useEffect.
 *   Tests assert against the synchronous structure only, keeping them fast
 *   and non-flaky. The async enhancement is validated visually/in integration.
 */
export default function CodeBlock({
  code,
  language,
  highlightedLines,
  copyLabel,
  copiedLabel,
}: CodeBlockProps): JSX.Element {
  const lines = code.split('\n');
  const highlightedSet = parseLineRanges(highlightedLines, lines.length);

  // Shiki token rows: null until async enhancement resolves.
  const [tokenRows, setTokenRows] = useState<readonly (readonly ThemedToken[])[] | null>(null);

  // Copy button feedback state.
  const [isCopied, setIsCopied] = useState(false);

  // ---------------------------------------------------------------------------
  // Async Shiki enhancement
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const highlighter = await getCodeHighlighter();
        const { tokens } = highlighter.codeToTokens(code, {
          lang: toShikiLanguage(language),
          theme: 'github-dark',
        });
        if (isMounted) {
          setTokenRows(tokens);
        }
      } catch {
        // Stay on plain-text fallback on error.
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [code, language]);

  // ---------------------------------------------------------------------------
  // Copy handler
  // ---------------------------------------------------------------------------

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, COPY_RESET_DELAY_MS);
  }, [code]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="cl-code-block relative my-4 rounded-md bg-[#24292e] font-mono text-sm">
      {/* Copy button - outside <pre> so it can be absolutely positioned */}
      {copyLabel != null && (
        <button
          type="button"
          aria-label={copyLabel}
          onClick={() => void handleCopy()}
          className="absolute right-2 top-2 rounded px-2 py-1 text-xs text-[#e1e4e8] hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          {isCopied ? (copiedLabel ?? copyLabel) : copyLabel}
        </button>
      )}

      <pre className="overflow-x-auto p-4 pt-4">
        <code>
          {lines.map((lineText, index) => {
            const lineNumber = index + 1;
            const isHighlighted = highlightedSet.has(lineNumber);
            const lineClassName = [
              'cl-code-block__line',
              'block',
              isHighlighted ? 'cl-code-block__line--highlight' : '',
              isHighlighted ? 'bg-white/10 -mx-4 px-4' : '',
            ]
              .filter(Boolean)
              .join(' ');

            const tokenRow = tokenRows !== null ? tokenRows[index] : null;

            return (
              <div
                key={lineNumber}
                data-line={lineNumber}
                data-highlighted={isHighlighted ? 'true' : undefined}
                className={lineClassName}
              >
                {tokenRow != null && tokenRow.length > 0 ? (
                  // Shiki-enhanced: render coloured spans.
                  tokenRow.map((token, tokenIndex) => (
                    <span
                      key={tokenIndex}
                      style={token.color != null ? { color: token.color } : undefined}
                    >
                      {token.content}
                    </span>
                  ))
                ) : (
                  // Synchronous fallback: plain text.
                  lineText
                )}
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
