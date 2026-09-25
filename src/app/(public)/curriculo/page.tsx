import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LearningPath } from "@/components/learn/learning-path";
import { buttonVariants } from "@/components/ui/button";
import { getLearningPath } from "@/lib/curriculum/queries";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const [sections, t] = await Promise.all([getLearningPath(), getTranslations("curriculum")]);
  return buildPageMetadata({
    path: "/curriculo",
    title: t("title"),
    description: t("intro", { sections: sections.length }),
  });
}

export default async function CurriculumPage() {
  const [sections, t] = await Promise.all([getLearningPath(), getTranslations("curriculum")]);
  return (
    <div className="container-page max-w-4xl space-y-8 py-12">
      <header className="space-y-3">
        <h1 className="text-4xl">{t("title")}</h1>
        <p className="text-muted max-w-prose text-lg">
          {t("intro", { sections: sections.length })}
        </p>
        <Link href="/ingresar" className={cn(buttonVariants())}>
          {t("cta")}
        </Link>
      </header>
      <LearningPath sections={sections} mode="public" />
    </div>
  );
}
