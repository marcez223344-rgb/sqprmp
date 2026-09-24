import { ImageResponse } from "next/og";
import { markDataUri } from "@/components/og/share-card";
import { brand } from "@/config/brand";

// iOS ignores SVG apple-touch icons, so this replaces the former apple-icon.svg with the
// 180x180 PNG the home screen actually uses.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const alt = brand.productName;

export default function AppleIcon() {
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
      <img src={markDataUri()} width={140} height={140} alt="" />
    </div>,
    { ...size },
  );
}
