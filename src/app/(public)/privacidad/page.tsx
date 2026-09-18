import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/layout/legal-page";
import { privacyMarkdown, privacyVersion } from "@/content/legal/privacidad";

export async function generateMetadata() {
  const t = await getTranslations("legal");
  return { title: t("privacyTitle") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal");
  return (
    <LegalPage title={t("privacyTitle")} version={privacyVersion} markdown={privacyMarkdown} />
  );
}
