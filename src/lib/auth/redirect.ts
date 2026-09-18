import type { Route } from "next";

/**
 * Only internal, absolute paths are accepted as post-login destinations.
 * Prevents open redirects through the `next` parameter.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/aprender"): Route {
  const safeFallback = fallback as Route;
  if (!next) return safeFallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return safeFallback;
  if (/[\r\n]/.test(next) || next.includes("://")) return safeFallback;
  if (next.startsWith("/auth/")) return safeFallback;
  return next as Route;
}
