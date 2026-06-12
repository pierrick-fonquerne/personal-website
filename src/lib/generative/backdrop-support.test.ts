import { describe, expect, it } from 'vitest';
import { withAlpha } from './backdrop-support';

describe('withAlpha', () => {
  it('converts a 6 digit hex color to rgba with the given alpha', () => {
    expect(withAlpha('#0a0a0a', 0.05)).toBe('rgba(10, 10, 10, 0.05)');
    expect(withAlpha('#ff6b35', 1)).toBe('rgba(255, 107, 53, 1)');
  });
});
