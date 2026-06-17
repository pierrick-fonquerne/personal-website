import { describe, expect, it } from 'vitest';

import { shouldLoadAnalytics, type AnalyticsSignals } from './analytics-consent';

const allFalse: AnalyticsSignals = {
  doNotTrack: false,
  globalPrivacyControl: false,
  optedOut: false,
};

describe('shouldLoadAnalytics', () => {
  it('returns true when all signals are false (default visitor)', () => {
    expect(shouldLoadAnalytics(allFalse)).toBe(true);
  });

  it('returns false when doNotTrack is true', () => {
    expect(shouldLoadAnalytics({ ...allFalse, doNotTrack: true })).toBe(false);
  });

  it('returns false when globalPrivacyControl is true', () => {
    expect(shouldLoadAnalytics({ ...allFalse, globalPrivacyControl: true })).toBe(false);
  });

  it('returns false when optedOut is true', () => {
    expect(shouldLoadAnalytics({ ...allFalse, optedOut: true })).toBe(false);
  });

  it('returns false when doNotTrack and globalPrivacyControl are both true', () => {
    expect(
      shouldLoadAnalytics({ ...allFalse, doNotTrack: true, globalPrivacyControl: true }),
    ).toBe(false);
  });

  it('returns false when doNotTrack and optedOut are both true', () => {
    expect(shouldLoadAnalytics({ ...allFalse, doNotTrack: true, optedOut: true })).toBe(false);
  });

  it('returns false when globalPrivacyControl and optedOut are both true', () => {
    expect(
      shouldLoadAnalytics({ ...allFalse, globalPrivacyControl: true, optedOut: true }),
    ).toBe(false);
  });

  it('returns false when all three signals are true', () => {
    expect(
      shouldLoadAnalytics({ doNotTrack: true, globalPrivacyControl: true, optedOut: true }),
    ).toBe(false);
  });
});
