import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/layout/legal-page";
import { termsMarkdown, termsVersion } from "@/content/legal/terminos";

export async function generateMetadata() {
  const t = await getTranslations("legal");
  return { title: t("termsTitle") };
}

export default async function TermsPage() {
  const t = await getTranslations("legal");
  return <LegalPage title={t("termsTitle")} version={termsVersion} markdown={termsMarkdown} />;
}
