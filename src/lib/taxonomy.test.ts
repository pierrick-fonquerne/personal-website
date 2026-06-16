import { describe, expect, it } from 'vitest';

import { SUBTHEMES_BY_THEME, isKnownSubtheme } from './taxonomy';

describe('messaging subtheme', () => {
  it('is registered under the architecture theme', () => {
    expect(SUBTHEMES_BY_THEME.architecture).toContain('messaging');
  });

  it('is recognised as a known subtheme of architecture', () => {
    expect(isKnownSubtheme('architecture', 'messaging')).toBe(true);
  });

  it('does not leak into a neighbouring theme', () => {
    expect(isKnownSubtheme('systems', 'messaging')).toBe(false);
  });
});
