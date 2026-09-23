"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * `prefers-reduced-motion` as state, for the places where the decision cannot be a CSS class:
 * the scroll that brings the feedback into view after a submission.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
