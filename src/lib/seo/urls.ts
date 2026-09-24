/**
 * Absolute URLs for metadata. Social crawlers (LinkedIn, WhatsApp, Slack) resolve
 * `og:image` and `og:url` literally: a relative value is the classic silent reason a
 * card renders as a bare grey box. Everything emitted for sharing goes through here.
 */

const FALLBACK = "http://localhost:3000";

/** The public origin of this deployment, without a trailing slash. */
export function siteUrl(): string {
  // Read directly (not via clientEnv) so metadata still renders in a build or test
  // environment where the full env schema is not satisfied.
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? FALLBACK;
  return raw.replace(/\/+$/, "");
}

/** `/precios` -> `https://host/precios`. Already-absolute values pass through. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Host without protocol, for display inside share images. */
export function siteHost(): string {
  try {
    return new URL(siteUrl()).host;
  } catch {
    return siteUrl();
  }
}
