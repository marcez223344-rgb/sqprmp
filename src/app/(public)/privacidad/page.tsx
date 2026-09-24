import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/layout/legal-page";
import { privacyMarkdown, privacyVersion } from "@/content/legal/privacidad";
import { brand } from "@/config/brand";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata() {
  const t = await getTranslations("legal");
  return buildPageMetadata({
    path: "/privacidad",
    title: t("privacyTitle"),
    description: brand.description,
  });
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal");
  return (
    <LegalPage title={t("privacyTitle")} version={privacyVersion} markdown={privacyMarkdown} />
  );
}
