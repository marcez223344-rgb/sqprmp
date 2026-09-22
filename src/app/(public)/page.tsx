import Link from "next/link";
import { ArrowRight, Award, Check, Lightbulb, MessageSquareText, Table2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { founder } from "@/config/founder";
import { limits } from "@/config/limits";
import { getLearningPath } from "@/lib/curriculum/queries";
import { cn } from "@/lib/utils/cn";

const benefitIcons = {
  practice: Table2,
  feedback: MessageSquareText,
  hints: Lightbulb,
  certificates: Award,
} as const;

export default async function LandingPage() {
  const [t, sections] = await Promise.all([getTranslations("landing"), getLearningPath()]);
  const initials = founder.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  const levelOrder = ["beginner", "intermediate", "advanced", "expert"] as const;
  const levelSummary = levelOrder
    .map((level) => ({ level, count: sections.filter((s) => s.level === level).length }))
    .filter(({ count }) => count > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: brand.productName,
    description: t("hero.subtitle"),
    provider: { "@type": "Organization", name: brand.organization },
    instructor: {
      "@type": "Person",
      name: founder.name,
      jobTitle: founder.role,
      description: founder.bio,
      sameAs: [founder.links.linkedin],
    },
    inLanguage: "es-419",
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Built from src/config, never from user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero */}
      <section className="container-page grid gap-10 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div className="space-y-6">
          <p className="text-accent-ink text-sm font-semibold tracking-wide uppercase">
            {t("hero.eyebrow")}
          </p>
          <h1 className="text-4xl leading-tight sm:text-5xl">{t("hero.title")}</h1>
          <p className="text-muted max-w-prose text-lg">{t("hero.subtitle")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/ingresar" className={cn(buttonVariants({ size: "lg" }))}>
              {t("hero.ctaPrimary")}
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/demo" className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}>
              {t("hero.ctaSecondary")}
            </Link>
          </div>
          <p className="text-muted text-sm">
            {t("hero.note", { count: limits.freeExerciseLimit })}
          </p>
          {/* The founder's name is the main trust signal at launch; it belongs above the fold. */}
          <Link
            href="/nosotros"
            className="border-border bg-surface inline-flex min-h-10 items-center gap-3 rounded-full border py-1.5 pr-4 pl-1.5 text-sm"
          >
            <span
              aria-hidden="true"
              className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full text-xs font-bold"
            >
              {initials}
            </span>
            <span>
              <span className="font-medium">{founder.name}</span>
              <span className="text-muted"> · {founder.role}</span>
            </span>
          </Link>
        </div>

        <SampleQuery />
      </section>

      {/* The 30-second version of the curriculum; the full list lives in /curriculo. */}
      <section className="container-page py-8" aria-labelledby="ruta-resumen">
        <h2 id="ruta-resumen" className="sr-only">
          {t("path.title")}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {levelSummary.map(({ level, count }, i) => (
            <li
              key={level}
              className="border-border bg-surface inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
            >
              <span className="text-primary font-mono text-xs">{i + 1}</span>
              <span className="font-medium">{t(`path.levels.${level}`)}</span>
              <span className="text-muted text-xs">{t("path.sections", { count })}</span>
            </li>
          ))}
        </ul>
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
            <p className="text-muted mt-2 max-w-prose text-sm">{founder.bio}</p>
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
      {/* The hero shows the shape of an exercise — business question first, SQL second — because
          that ordering is the product's whole argument. */}
      <figcaption className="border-border bg-surface-2 space-y-2 border-b px-4 py-3">
        <p className="text-accent-ink text-xs font-semibold tracking-wide uppercase">
          Sección 14 · Agregación
        </p>
        <p className="text-sm">
          TiendaViva quiere saber en qué países vendió más durante 2025, contando solo los pedidos
          entregados.
        </p>
        <ul className="text-muted flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {["country", "total_sales"].map((c) => (
            <li key={c} className="inline-flex items-center gap-1.5">
              <Check aria-hidden="true" className="text-success size-3.5" />
              <code className="font-mono">{c}</code>
            </li>
          ))}
        </ul>
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
