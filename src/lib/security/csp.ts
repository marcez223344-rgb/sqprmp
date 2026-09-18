/**
 * Content Security Policy built per request with a nonce (docs/SECURITY.md §5).
 * - 'strict-dynamic' lets scripts loaded by nonce'd Next.js scripts run.
 * - 'wasm-unsafe-eval' is required by PGlite (WebAssembly) in the workspace.
 * - Styles allow 'unsafe-inline' because Next.js and Tailwind inject style tags.
 * - 'unsafe-eval' only in development (React error overlays).
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "form-action 'self' https://accounts.google.com https://*.supabase.co",
    "base-uri 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}
