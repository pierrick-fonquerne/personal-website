import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageTabs from './LanguageTabs';

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('LanguageTabs - rendering', () => {
  it('renders two tab buttons with default labels when two languages are provided', () => {
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="csharp"
        onSelect={vi.fn()}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]?.textContent).toBe('C#');
    expect(tabs[1]?.textContent).toBe('Rust');
  });

  it('wraps tabs in a tablist container', () => {
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="csharp"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('tablist')).toBeDefined();
  });

  it('renders null when only one language is provided', () => {
    const { container } = render(
      <LanguageTabs
        languages={['rust']}
        activeLanguage="rust"
        onSelect={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders null when languages array is empty', () => {
    const { container } = render(
      <LanguageTabs
        languages={[]}
        activeLanguage="csharp"
        onSelect={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Active state
// ---------------------------------------------------------------------------

describe('LanguageTabs - active state', () => {
  it('sets aria-selected="true" on the active language tab', () => {
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="csharp"
        onSelect={vi.fn()}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('false');
  });

  it('sets aria-selected="true" on rust when rust is active', () => {
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="rust"
        onSelect={vi.fn()}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('false');
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');
  });

  it('gives tabIndex 0 to the active tab and -1 to the inactive tab', () => {
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="csharp"
        onSelect={vi.fn()}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    expect(Number(tabs[0]?.getAttribute('tabindex'))).toBe(0);
    expect(Number(tabs[1]?.getAttribute('tabindex'))).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------

describe('LanguageTabs - interaction', () => {
  it('calls onSelect with the clicked language when an inactive tab is clicked', () => {
    const onSelect = vi.fn();
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="csharp"
        onSelect={onSelect}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]!);

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith('rust');
  });

  it('does not call onSelect more than once on a single click', () => {
    const onSelect = vi.fn();
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="csharp"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getAllByRole('tab')[1]!);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Custom labels
// ---------------------------------------------------------------------------

describe('LanguageTabs - custom labels', () => {
  it('uses the provided label override for csharp and keeps default for rust', () => {
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="csharp"
        onSelect={vi.fn()}
        labels={{ csharp: 'C sharp' }}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]?.textContent).toBe('C sharp');
    expect(tabs[1]?.textContent).toBe('Rust');
  });

  it('overrides both labels when both are provided', () => {
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="csharp"
        onSelect={vi.fn()}
        labels={{ csharp: 'CSharp', rust: 'Rust-lang' }}
      />,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]?.textContent).toBe('CSharp');
    expect(tabs[1]?.textContent).toBe('Rust-lang');
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

describe('LanguageTabs - keyboard navigation', () => {
  it('calls onSelect with the next language on ArrowRight from the active tab', () => {
    const onSelect = vi.fn();
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="csharp"
        onSelect={onSelect}
      />,
    );

    const activeTab = screen.getAllByRole('tab')[0]!;
    fireEvent.keyDown(activeTab, { key: 'ArrowRight' });

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith('rust');
  });

  it('wraps from last to first on ArrowRight', () => {
    const onSelect = vi.fn();
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="rust"
        onSelect={onSelect}
      />,
    );

    const activeTab = screen.getAllByRole('tab')[1]!;
    fireEvent.keyDown(activeTab, { key: 'ArrowRight' });

    expect(onSelect).toHaveBeenCalledWith('csharp');
  });

  it('calls onSelect with the previous language on ArrowLeft from the active tab', () => {
    const onSelect = vi.fn();
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="rust"
        onSelect={onSelect}
      />,
    );

    const activeTab = screen.getAllByRole('tab')[1]!;
    fireEvent.keyDown(activeTab, { key: 'ArrowLeft' });

    expect(onSelect).toHaveBeenCalledWith('csharp');
  });

  it('wraps from first to last on ArrowLeft', () => {
    const onSelect = vi.fn();
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="csharp"
        onSelect={onSelect}
      />,
    );

    const activeTab = screen.getAllByRole('tab')[0]!;
    fireEvent.keyDown(activeTab, { key: 'ArrowLeft' });

    expect(onSelect).toHaveBeenCalledWith('rust');
  });

  it('calls onSelect with the first language on Home key', () => {
    const onSelect = vi.fn();
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="rust"
        onSelect={onSelect}
      />,
    );

    const activeTab = screen.getAllByRole('tab')[1]!;
    fireEvent.keyDown(activeTab, { key: 'Home' });

    expect(onSelect).toHaveBeenCalledWith('csharp');
  });

  it('calls onSelect with the last language on End key', () => {
    const onSelect = vi.fn();
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="csharp"
        onSelect={onSelect}
      />,
    );

    const activeTab = screen.getAllByRole('tab')[0]!;
    fireEvent.keyDown(activeTab, { key: 'End' });

    expect(onSelect).toHaveBeenCalledWith('rust');
  });
});

// ---------------------------------------------------------------------------
// A11y structure
// ---------------------------------------------------------------------------

describe('LanguageTabs - accessibility', () => {
  it('each tab has type="button"', () => {
    render(
      <LanguageTabs
        languages={['csharp', 'rust']}
        activeLanguage="csharp"
        onSelect={vi.fn()}
      />,
    );

    screen.getAllByRole('tab').forEach((tab) => {
      expect(tab.getAttribute('type')).toBe('button');
    });
  });
});
