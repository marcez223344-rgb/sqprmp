/**
 * Static feature flags. Database `feature_flags` rows override these at runtime
 * (Phase 8). Keep flags boolean and short-lived.
 */
export const features = {
  magicLinkLogin: false,
  /**
   * D-35 / OA-20: on since 2026-09-23. The owner asked twice why the ranking he had consented to
   * was nowhere to be seen — the page and the RPCs were built and the flag was still off, so
   * `/ranking` 404'd and the nav item was hidden. Only learners who opted in appear, and the board
   * refuses to render below `limits.leaderboard.minParticipants`. Flip it off from /admin/flags.
   */
  leaderboards: true,
  avatarUploads: false,
  subscriptions: false,
  writeExercises: false,
  thirdPartyAnalytics: false,
  paymentsLive: false, // never true without owner approval (D-05)
} as const;

export type FeatureFlag = keyof typeof features;
