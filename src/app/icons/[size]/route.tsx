import { ImageResponse } from "next/og";
import { markDataUri } from "@/components/og/share-card";

/**
 * PNG app icons for the web manifest. Android and iOS still ignore SVG icons in several
 * places, and generating them from the same mark keeps them from drifting. Sizes are
 * fixed by `generateStaticParams`; anything else is a 404.
 */
const VARIANTS = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  // Maskable icons are cropped to a circle by Android, so the mark sits in the safe area.
  "512-maskable": { size: 512, maskable: true },
} as const;

type VariantKey = keyof typeof VARIANTS;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((size) => ({ size }));
}

export const dynamicParams = false;

export async function GET(_request: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size: key } = await ctx.params;
  const variant = VARIANTS[key as VariantKey];
  if (!variant) return new Response("Not found", { status: 404 });
  const { size, maskable } = variant;
  const inset = maskable ? Math.round(size * 0.18) : 0;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#2B4FE0",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- satori renders <img>, not next/image */}
      <img src={markDataUri()} width={size - inset * 2} height={size - inset * 2} alt="" />
    </div>,
    { width: size, height: size },
  );
}
