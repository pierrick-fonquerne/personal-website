import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';

const initialize = vi.fn();
const render_ = vi.fn().mockResolvedValue({ svg: '<svg data-mock="1" />' });

vi.mock('mermaid', () => ({
  default: {
    initialize,
    render: render_,
  },
}));

describe('MermaidDiagram', () => {
  beforeEach(() => {
    initialize.mockClear();
    render_.mockClear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    vi.resetModules();
  });

  it('re-initializes mermaid and re-renders the diagram when the page theme toggles', async () => {
    // Reset the module registry so the module-level theme tracker starts
    // fresh, independent of any other test file that may have imported it.
    vi.resetModules();
    const { default: MermaidDiagram }: { default: ComponentType<{ definition: string }> } =
      await import('./MermaidDiagram');

    render(<MermaidDiagram definition="graph TD; A-->B;" />);

    await waitFor(() => expect(render_).toHaveBeenCalledTimes(1));
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark' }));

    // Simulate the ThemeToggle switching the site to light mode.
    act(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });

    await waitFor(() => expect(render_).toHaveBeenCalledTimes(2));
    expect(initialize).toHaveBeenCalledTimes(2);
    expect(initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'default' }));
  });
});
