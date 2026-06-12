/** Theme colors resolved from the design tokens on the html element. */
export interface ThemeColors {
  background: string;
  foreground: string;
  accent: string;
}

/** Reads the current theme colors from the CSS custom properties. */
export function readThemeColors(): ThemeColors {
  const styles = getComputedStyle(document.documentElement);
  return {
    background: styles.getPropertyValue('--color-bg').trim(),
    foreground: styles.getPropertyValue('--color-fg').trim(),
    accent: styles.getPropertyValue('--color-accent').trim(),
  };
}

/** Converts a 6 digit hex color to an rgba() string with the given alpha. */
export function withAlpha(hexColor: string, alpha: number): string {
  const red = parseInt(hexColor.slice(1, 3), 16);
  const green = parseInt(hexColor.slice(3, 5), 16);
  const blue = parseInt(hexColor.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * Boots a canvas backdrop and keeps it alive across ClientRouter navigations.
 * initialize must return a teardown that cancels animation and disconnects
 * every observer and document level listener it created.
 */
export function registerBackdrop(
  selector: string,
  initialize: (canvas: HTMLCanvasElement) => () => void,
): void {
  let teardown: (() => void) | null = null;

  function boot(): void {
    teardown?.();
    teardown = null;
    const canvas = document.querySelector<HTMLCanvasElement>(selector);
    if (canvas instanceof HTMLCanvasElement) {
      teardown = initialize(canvas);
    }
  }

  boot();
  document.addEventListener('astro:page-load', boot);
  document.addEventListener('astro:before-swap', () => {
    teardown?.();
    teardown = null;
  });
}
