import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { OG_CONTENT_TYPE, OG_SIZE, ShareCard } from "@/components/og/share-card";
import { brand } from "@/config/brand";
import { verificationRateLimited, verifyCertificate } from "@/lib/certificates/service";

export const alt = brand.productName;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const CODE = /^[a-z0-9]{20}$/;

/**
 * Certificate share card. A learner posting "I finished this" on LinkedIn is the product's
 * cheapest marketing, and a card naming the achievement travels far better than a logo.
 * Only data the verification page already shows publicly is used. A revoked, unknown or
 * rate-limited code falls back to the generic card rather than implying a valid credential.
 */
export default async function CertificateOpengraphImage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [tVerify, tLanding] = await Promise.all([
    getTranslations("verify"),
    getTranslations("landing"),
  ]);

  const limited = await verificationRateLimited();
  const result = CODE.test(code) && !limited ? await verifyCertificate(code) : null;

  const card =
    result && !result.revoked ? (
      <ShareCard
        eyebrow={tVerify("valid.title")}
        headline={result.recipientName}
        description={result.title}
        footnote={`${tVerify("fields.issuer")} · ${brand.organization}`}
      />
    ) : (
      <ShareCard
        eyebrow={brand.productName}
        headline={tLanding("metaTitle")}
        description={tLanding("metaDescription")}
      />
    );

  return new ImageResponse(card, { ...size });
}
