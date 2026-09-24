"use client";

import { useSyncExternalStore } from "react";

/** Nothing to subscribe to: the platform does not change while the page is open. */
function subscribe(): () => void {
  return () => {};
}

function isApplePlatform(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/**
 * Whether the learner is on a platform whose shortcut key is Command instead of Control.
 *
 * The hint used to read "Ctrl/⌘ + Enter": the glyph means nothing to a Windows learner and does
 * not render in every font (owner feedback 2026-09-24). We name one key, the one that works on
 * the machine in front of them. Server and first render assume Control — the majority case, and
 * an Apple learner sees the corrected hint on hydration without a mismatch.
 */
export function useAppleShortcutKey(): boolean {
  return useSyncExternalStore(subscribe, isApplePlatform, () => false);
}
