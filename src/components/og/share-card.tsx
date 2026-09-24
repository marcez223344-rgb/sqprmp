import type { ReactElement } from "react";
import { siteHost } from "@/lib/seo/urls";

/** LinkedIn, Facebook and WhatsApp all render 1.91:1; 1200x630 is the safe master size. */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

/**
 * Dark palette from docs/DESIGN_SYSTEM.md §2. A share card is rendered by the crawler,
 * never by the browser, so the CSS variables are not available and the token values are
 * repeated here. This is the one sanctioned copy: keep it in sync with globals.css.
 */
const C = {
  bg: "#0E1117",
  surface: "#161B25",
  border: "#2A3242",
  text: "#E8ECF3",
  muted: "#A3ACBD",
  primary: "#7C93FF",
  accent: "#FF8A5B",
} as const;

/** Mirrors public/brand/mark.svg; inlined because satori cannot read from /public. */
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#2b4fe0"/>
  <ellipse cx="32" cy="20" rx="17" ry="6.5" fill="#ffffff"/>
  <path d="M15 20v10c0 3.6 7.6 6.5 17 6.5s17-2.9 17-6.5V20" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M15 33v10c0 3.6 7.6 6.5 17 6.5s17-2.9 17-6.5V33" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M24 44.5 30 50l-6 5.5" fill="none" stroke="#f2652e" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M34.5 55.5h9" fill="none" stroke="#f2652e" stroke-width="4.5" stroke-linecap="round"/>
</svg>`;

export function markDataUri(): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`;
}

export interface ShareCardProps {
  /** Small label above the headline: the product name, or what kind of page this is. */
  eyebrow: string;
  headline: string;
  description?: string;
  /** Bottom-right line; defaults to the site host. */
  footnote?: string;
}

/**
 * The single share-card layout. Built from the design tokens instead of a hand-made PNG
 * so it cannot drift from the brand. Sizes are chosen so the headline is still readable
 * at LinkedIn's ~552 px feed width (64 px here renders at ~29 px there).
 */
export function ShareCard({
  eyebrow,
  headline,
  description,
  footnote,
}: ShareCardProps): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: C.bg,
        position: "relative",
        padding: "64px 72px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Result-table metaphor (§1): faint rules, never competing with the text. */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={`h${i}`}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 90 * (i + 1),
            height: 1,
            backgroundColor: "rgba(232,236,243,0.05)",
          }}
        />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={`v${i}`}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 240 * (i + 1),
            width: 1,
            backgroundColor: "rgba(232,236,243,0.05)",
          }}
        />
      ))}

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- satori renders <img>, not next/image */}
        <img src={markDataUri()} width={64} height={64} alt="" />
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
          {eyebrow}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1000 }}>
        <div style={{ display: "flex", fontSize: 64, lineHeight: 1.15, color: C.text }}>
          {headline}
        </div>
        {description ? (
          <div style={{ display: "flex", fontSize: 30, lineHeight: 1.4, color: C.muted }}>
            {description}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              width: 72,
              height: 8,
              backgroundColor: C.primary,
              borderRadius: 4,
            }}
          />
          <div
            style={{
              display: "flex",
              width: 24,
              height: 8,
              backgroundColor: C.accent,
              borderRadius: 4,
            }}
          />
        </div>
        <div style={{ display: "flex", fontSize: 26, color: C.muted }}>
          {footnote ?? siteHost()}
        </div>
      </div>
    </div>
  );
}
