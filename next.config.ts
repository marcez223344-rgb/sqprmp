import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProd = process.env.NODE_ENV === "production";

/** Static security headers; the per-request CSP with nonce is set in src/proxy.ts. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  // The sandbox worker is spawned by path (not bundled); ship it, PGlite and the dataset
  // snapshots with the routes that execute learner SQL (docs/SQL_SANDBOX.md).
  // PGlite must stay a real node_modules dependency on the server: bundled, its wasm loader is
  // replaced by a browser build that throws "instantiateWasm is not a function" the moment the
  // graded engine boots.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingIncludes: {
    "/ejercicio/[slug]": [
      "./sandbox-runtime/**",
      "./public/datasets/**",
      "./node_modules/@electric-sql/pglite/dist/**",
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
