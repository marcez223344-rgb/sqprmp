import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { OG_CONTENT_TYPE, OG_SIZE, ShareCard } from "@/components/og/share-card";
import { brand } from "@/config/brand";

export const alt = `${brand.productName} — ${brand.tagline}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Default card for every route that does not override it. */
export default async function OpengraphImage() {
  const t = await getTranslations("landing");
  return new ImageResponse(
    <ShareCard
      eyebrow={brand.productName}
      headline={t("metaTitle")}
      description={t("metaDescription")}
    />,
    { ...size },
  );
}
