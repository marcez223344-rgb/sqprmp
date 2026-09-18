import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Explicit work-in-progress page used for routes scheduled in later phases,
 * so navigation never dead-ends (CLAUDE.md: no fake functionality).
 */
export async function PlaceholderPage({ title, phase }: { title: string; phase: number }) {
  const t = await getTranslations("pages.placeholder");
  const tc = await getTranslations("common");
  return (
    <section className="container-page py-24 text-center">
      <p className="text-accent text-sm font-semibold tracking-wide uppercase">
        {tc("comingSoon")} · Fase {phase}
      </p>
      <h1 className="mt-3 text-4xl">{t("title", { page: title })}</h1>
      <p className="text-muted mx-auto mt-4 max-w-prose">{t("body")}</p>
      <Link href="/" className={cn(buttonVariants({ variant: "secondary" }), "mt-8")}>
        {tc("back")}
      </Link>
    </section>
  );
}
