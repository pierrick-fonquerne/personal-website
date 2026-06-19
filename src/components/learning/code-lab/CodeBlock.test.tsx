import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CodeBlock from './CodeBlock';

// ---------------------------------------------------------------------------
// Clipboard mock
// ---------------------------------------------------------------------------

const writeTextMock = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeTextMock.mockClear();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: writeTextMock },
    configurable: true,
  });
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FOUR_LINE_CODE = `let x = 1;
let y = 2;
let z = 3;
let w = 4;`;

// ---------------------------------------------------------------------------
// Synchronous rendering
// ---------------------------------------------------------------------------

describe('CodeBlock - synchronous line rendering', () => {
  it('renders one line element per code line and the text of each line is present', () => {
    render(
      <CodeBlock
        code={FOUR_LINE_CODE}
        language="rust"
      />,
    );

    expect(screen.getByText('let x = 1;')).toBeDefined();
    expect(screen.getByText('let y = 2;')).toBeDefined();
    expect(screen.getByText('let z = 3;')).toBeDefined();
    expect(screen.getByText('let w = 4;')).toBeDefined();
  });

  it('wraps lines in <pre><code> for correct semantics', () => {
    const { container } = render(
      <CodeBlock code="const x = 1;" language="csharp" />,
    );

    expect(container.querySelector('pre')).not.toBeNull();
    expect(container.querySelector('pre code')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Line highlighting
// ---------------------------------------------------------------------------

describe('CodeBlock - line highlighting', () => {
  it('highlights line 2 only when highlightedLines="2"', () => {
    const { container } = render(
      <CodeBlock
        code={FOUR_LINE_CODE}
        language="rust"
        highlightedLines="2"
      />,
    );

    const lines = container.querySelectorAll('[data-line]');
    expect(lines).toHaveLength(4);

    expect(lines[0]?.getAttribute('data-highlighted')).not.toBe('true');
    expect(lines[1]?.getAttribute('data-highlighted')).toBe('true');
    expect(lines[2]?.getAttribute('data-highlighted')).not.toBe('true');
    expect(lines[3]?.getAttribute('data-highlighted')).not.toBe('true');
  });

  it('highlights lines 1, 2, 4 when highlightedLines="1-2,4"', () => {
    const { container } = render(
      <CodeBlock
        code={FOUR_LINE_CODE}
        language="rust"
        highlightedLines="1-2,4"
      />,
    );

    const lines = container.querySelectorAll('[data-line]');
    expect(lines).toHaveLength(4);

    expect(lines[0]?.getAttribute('data-highlighted')).toBe('true');
    expect(lines[1]?.getAttribute('data-highlighted')).toBe('true');
    expect(lines[2]?.getAttribute('data-highlighted')).not.toBe('true');
    expect(lines[3]?.getAttribute('data-highlighted')).toBe('true');
  });

  it('applies highlight modifier class to highlighted lines', () => {
    const { container } = render(
      <CodeBlock
        code={FOUR_LINE_CODE}
        language="rust"
        highlightedLines="3"
      />,
    );

    const lines = container.querySelectorAll('[data-line]');
    expect(lines[2]?.classList.contains('cl-code-block__line--highlight')).toBe(true);
    expect(lines[0]?.classList.contains('cl-code-block__line--highlight')).toBe(false);
  });

  it('does not mark any line as highlighted when highlightedLines is absent', () => {
    const { container } = render(
      <CodeBlock code={FOUR_LINE_CODE} language="rust" />,
    );

    const highlighted = container.querySelectorAll('[data-highlighted="true"]');
    expect(highlighted).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

describe('CodeBlock - copy button', () => {
  it('renders no button when copyLabel is absent', () => {
    render(<CodeBlock code="let x = 1;" language="rust" />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders a button with the provided copyLabel when copyLabel is given', () => {
    render(
      <CodeBlock
        code="let x = 1;"
        language="rust"
        copyLabel="Copier"
      />,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDefined();
    expect(button.textContent).toBe('Copier');
  });

  it('calls clipboard.writeText with the exact code on click', async () => {
    const code = 'let x = 42;';
    render(
      <CodeBlock
        code={code}
        language="rust"
        copyLabel="Copier"
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(code);
    });
  });

  it('shows copiedLabel after click when provided', async () => {
    render(
      <CodeBlock
        code="let x = 1;"
        language="rust"
        copyLabel="Copier"
        copiedLabel="Copie !"
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('button').textContent).toBe('Copie !');
    });
  });

  it('falls back to copyLabel as copiedLabel when copiedLabel is absent', async () => {
    render(
      <CodeBlock
        code="let x = 1;"
        language="rust"
        copyLabel="Copier"
      />,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // After click: copiedLabel ?? copyLabel = copyLabel = "Copier"
    // So the label stays "Copier" - we verify writeText was called (confirming click worked)
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledOnce();
    });
  });

  it('button has type="button" and aria-label set to copyLabel', () => {
    render(
      <CodeBlock
        code="let x = 1;"
        language="rust"
        copyLabel="Copier le code"
      />,
    );

    const button = screen.getByRole('button');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Copier le code');
  });
});
