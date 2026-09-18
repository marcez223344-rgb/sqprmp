import { getTranslations } from "next-intl/server";
import { LearningPath } from "@/components/learn/learning-path";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getLearningPath } from "@/lib/curriculum/queries";

export async function generateMetadata() {
  const t = await getTranslations("path");
  return { title: t("title") };
}

export default async function PathPage() {
  const profile = await requireOnboardedProfile("/ruta");
  const [sections, t] = await Promise.all([getLearningPath(profile.id), getTranslations("path")]);
  return (
    <div className="container-page max-w-4xl space-y-8 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>
      <LearningPath sections={sections} mode="learner" />
    </div>
  );
}
