/**
 * Static feature flags. Database `feature_flags` rows override these at runtime
 * (Phase 8). Keep flags boolean and short-lived.
 */
export const features = {
  magicLinkLogin: false,
  leaderboards: false,
  avatarUploads: false,
  subscriptions: false,
  writeExercises: false,
  thirdPartyAnalytics: false,
  paymentsLive: false, // never true without owner approval (D-05)
} as const;

export type FeatureFlag = keyof typeof features;
