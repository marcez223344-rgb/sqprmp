import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { limits } from "@/config/limits";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const t = await getTranslations("faq");
  return buildPageMetadata({
    path: "/preguntas-frecuentes",
    title: t("title"),
    description: t("intro"),
  });
}

const ITEMS = [
  "who",
  // Second on purpose: "¿sirve si no vivo en América Latina?" is the doubt a reader outside the
  // region has while reading the first answer, and it is cheaper to answer it than to lose them.
  "region",
  "free",
  "price",
  "payments",
  "refund",
  "certificate",
  "sandbox",
  "level",
  "time",
  "support",
] as const;

/** Native <details> keeps the FAQ keyboard-accessible without client JS. */
export default async function FaqPage() {
  const t = await getTranslations("faq");
  return (
    <div className="container-page max-w-3xl space-y-8 py-12">
      <header className="space-y-3">
        <h1 className="text-4xl">{t("title")}</h1>
        <p className="text-muted max-w-prose text-lg">{t("intro")}</p>
      </header>
      <div className="divide-border divide-y">
        {ITEMS.map((key) => (
          <details key={key} className="group py-3">
            <summary className="cursor-pointer list-none rounded-md py-1 font-semibold focus-visible:ring-2 focus-visible:ring-offset-2">
              <span
                aria-hidden="true"
                className="text-primary mr-2 inline-block transition-transform group-open:rotate-90 motion-reduce:transition-none"
              >
                ▸
              </span>
              {t(`items.${key}.q`)}
            </summary>
            <p className="text-muted mt-2 pl-6">
              {t(`items.${key}.a`, {
                free: limits.freeExerciseLimit,
                refundDays: brand.refundDays,
                email: brand.supportEmail,
              })}
            </p>
          </details>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/precios" className={cn(buttonVariants({ variant: "secondary" }))}>
          {t("ctaPricing")}
        </Link>
        <Link href="/ingresar" className={cn(buttonVariants())}>
          {t("ctaStart")}
        </Link>
      </div>
    </div>
  );
}
