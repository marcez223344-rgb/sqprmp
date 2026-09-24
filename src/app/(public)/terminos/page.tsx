import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/layout/legal-page";
import { termsMarkdown, termsVersion } from "@/content/legal/terminos";
import { brand } from "@/config/brand";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata() {
  const t = await getTranslations("legal");
  return buildPageMetadata({
    path: "/terminos",
    title: t("termsTitle"),
    description: brand.description,
  });
}

export default async function TermsPage() {
  const t = await getTranslations("legal");
  return <LegalPage title={t("termsTitle")} version={termsVersion} markdown={termsMarkdown} />;
}
