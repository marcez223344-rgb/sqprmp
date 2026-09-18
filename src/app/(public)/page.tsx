import Link from "next/link";
import { ArrowRight, Award, Lightbulb, MessageSquareText, Table2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { founder } from "@/config/founder";
import { limits } from "@/config/limits";
import { cn } from "@/lib/utils/cn";

const benefitIcons = {
  practice: Table2,
  feedback: MessageSquareText,
  hints: Lightbulb,
  certificates: Award,
} as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");

  return (
    <>
      {/* Hero */}
      <section className="container-page grid gap-10 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div className="space-y-6">
          <p className="text-accent text-sm font-semibold tracking-wide uppercase">
            {t("hero.eyebrow")}
          </p>
          <h1 className="text-4xl leading-tight sm:text-5xl">{t("hero.title")}</h1>
          <p className="text-muted max-w-prose text-lg">{t("hero.subtitle")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/ingresar" className={cn(buttonVariants({ size: "lg" }))}>
              {t("hero.ctaPrimary")}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link
              href="/curriculo"
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
            >
              {t("hero.ctaSecondary")}
            </Link>
          </div>
          <p className="text-muted text-sm">
            {t("hero.note", { count: limits.freeExerciseLimit })}
          </p>
        </div>

        <SampleQuery />
      </section>

      {/* Benefits */}
      <section className="container-page py-16" aria-labelledby="beneficios">
        <h2 id="beneficios" className="text-3xl">
          {t("benefits.title")}
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {(Object.keys(benefitIcons) as (keyof typeof benefitIcons)[]).map((key) => {
            const Icon = benefitIcons[key];
            return (
              <Card key={key} className="space-y-3">
                <span className="bg-surface-2 text-primary inline-flex size-10 items-center justify-center rounded-md">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="text-xl">{t(`benefits.items.${key}.title`)}</h3>
                <p className="text-muted">{t(`benefits.items.${key}.body`)}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="border-border bg-surface border-y py-16" aria-labelledby="como-funciona">
        <div className="container-page">
          <h2 id="como-funciona" className="text-3xl">
            {t("howItWorks.title")}
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {(["one", "two", "three"] as const).map((step, i) => (
              <li key={step} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="bg-primary font-heading text-primary-fg flex size-9 shrink-0 items-center justify-center rounded-full font-bold"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg">{t(`howItWorks.steps.${step}.title`)}</h3>
                  <p className="text-muted">{t(`howItWorks.steps.${step}.body`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Curriculum + pricing */}
      <section className="container-page grid gap-6 py-16 md:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-2xl">{t("curriculum.title")}</h2>
          <p className="text-muted">{t("curriculum.subtitle")}</p>
          <Link href="/curriculo" className={cn(buttonVariants({ variant: "secondary" }))}>
            {t("curriculum.cta")}
          </Link>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-2xl">{t("pricing.title")}</h2>
          <p className="text-muted">{t("pricing.body")}</p>
          <Link href="/precios" className={cn(buttonVariants({ variant: "secondary" }))}>
            {t("pricing.cta")}
          </Link>
        </Card>
      </section>

      {/* Founder */}
      <section className="container-page py-8" aria-labelledby="fundador">
        <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="fundador" className="text-2xl">
              {t("founder.title")}
            </h2>
            <p className="text-muted mt-1">
              {founder.name} · {founder.role}, {brand.organization}
            </p>
          </div>
          <Link href="/nosotros" className={cn(buttonVariants({ variant: "ghost" }))}>
            {t("founder.cta", { name: founder.name.split(" ")[0] })}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Card>
      </section>

      {/* Final CTA */}
      <section className="container-page py-16 text-center">
        <h2 className="text-3xl">{t("finalCta.title")}</h2>
        <Link href="/ingresar" className={cn(buttonVariants({ size: "lg" }), "mt-6")}>
          {t("finalCta.cta")}
        </Link>
      </section>
    </>
  );
}

/** Static illustration of the workspace; the live demo editor arrives in Phase 4. */
function SampleQuery() {
  return (
    <figure className="border-border bg-surface overflow-hidden rounded-lg border shadow-sm">
      <figcaption className="border-border bg-surface-2 text-muted border-b px-4 py-2 font-mono text-xs">
        ventas_por_pais.sql · tiendaviva
      </figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed">
        <code>{`SELECT c.country,
       SUM(o.total_amount) AS total_sales
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'delivered'
  AND o.created_at >= DATE '2025-01-01'
GROUP BY c.country
ORDER BY total_sales DESC;`}</code>
      </pre>
      <div className="border-border overflow-x-auto border-t">
        <table className="w-full text-left font-mono text-xs">
          <caption className="sr-only">Resultado de ejemplo</caption>
          <thead className="bg-surface-2 text-muted">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">
                country
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                total_sales
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ["MX", "1 284 930.50"],
              ["AR", "962 115.00"],
              ["CO", "418 770.25"],
            ].map(([c, v]) => (
              <tr key={c} className="border-border border-t">
                <td className="px-4 py-2">{c}</td>
                <td className="px-4 py-2 text-right">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
