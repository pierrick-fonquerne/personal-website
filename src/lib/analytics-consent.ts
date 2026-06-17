export interface AnalyticsSignals {
  doNotTrack: boolean;
  globalPrivacyControl: boolean;
  optedOut: boolean;
}

/** Returns true when anonymous analytics may be loaded for the current visitor. */
export function shouldLoadAnalytics(signals: AnalyticsSignals): boolean {
  return !signals.doNotTrack && !signals.globalPrivacyControl && !signals.optedOut;
}
