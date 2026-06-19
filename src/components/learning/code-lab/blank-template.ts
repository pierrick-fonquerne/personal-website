/**
 * Pure template parser for fill-in-the-blank code exercises.
 * No UI, no DOM dependencies - plain TypeScript.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A segment produced by parsing a fill-in-the-blank template string. */
export type TemplateSegment =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'blank'; readonly id: string };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Regex that matches a valid blank marker: {{ identifier }}.
 * The identifier pattern allows letters, digits, underscores, and hyphens.
 * Internal whitespace around the identifier is allowed and trimmed.
 * The `g` flag enables repeated exec() calls over the same string.
 */
const BLANK_MARKER_PATTERN = /\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g;

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse a fill-in-the-blank template string into an ordered array of segments.
 *
 * A marker has the form `{{identifier}}` where the identifier matches
 * `[A-Za-z0-9_-]+`, optionally surrounded by internal whitespace (e.g. `{{ foo }}`).
 * Text between / around markers becomes `text` segments; whitespace and newlines
 * are preserved verbatim.
 *
 * Rules:
 * - Empty `text` segments (length 0) are never emitted.
 * - A `{{` with no matching `}}`, or with non-conforming content, is treated
 *   as literal text (the marker regex simply does not match it).
 * - Two adjacent blank markers produce `[blank, blank]` with no text in between.
 * - Segments appear in the order they were encountered.
 */
export function parseBlankTemplate(template: string): readonly TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  let lastIndex = 0;

  // Reset the pattern's internal state in case it was previously used.
  BLANK_MARKER_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;

  while ((match = BLANK_MARKER_PATTERN.exec(template)) !== null) {
    const matchStart = match.index;
    const matchEnd = BLANK_MARKER_PATTERN.lastIndex;

    // Emit any literal text that precedes this marker.
    if (matchStart > lastIndex) {
      segments.push({ kind: 'text', value: template.slice(lastIndex, matchStart) });
    }

    // Emit the blank segment. Group 1 is the trimmed identifier.
    // The regex already handles surrounding whitespace via \s*, but we trim
    // defensively to remove any residual whitespace the group captured.
    const id = (match[1] ?? '').trim();
    segments.push({ kind: 'blank', id });

    lastIndex = matchEnd;
  }

  // Emit any trailing literal text after the last marker.
  if (lastIndex < template.length) {
    segments.push({ kind: 'text', value: template.slice(lastIndex) });
  }

  return segments;
}
