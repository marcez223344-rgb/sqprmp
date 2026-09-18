import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { founder } from "@/config/founder";
import { social } from "@/config/social";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const t = await getTranslations("about");
  return { title: t("title") };
}

export default async function AboutPage() {
  const t = await getTranslations("about");
  const principles = ["real", "safe", "feedback", "honest"] as const;
  return (
    <div className="container-page max-w-3xl space-y-10 py-12">
      <header className="space-y-3">
        <p className="text-accent-ink text-sm font-semibold tracking-wide uppercase">
          {brand.organization}
        </p>
        <h1 className="text-4xl">{t("title")}</h1>
        <p className="text-muted max-w-prose text-lg">
          {t("intro", { product: brand.productName })}
        </p>
      </header>

      <Card className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div
            aria-hidden="true"
            className="bg-primary/10 text-primary flex size-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold"
          >
            {founder.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl">{founder.name}</h2>
            <p className="text-muted text-sm">
              {founder.role} · {brand.organization}
            </p>
            <p>{founder.bio}</p>
            <a
              href={founder.links.linkedin}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "ghost" }), "w-fit")}
            >
              <ExternalLink aria-hidden="true" />
              {t("linkedin")}
            </a>
          </div>
        </div>
      </Card>

      <section className="space-y-4" aria-labelledby="principios">
        <h2 id="principios" className="text-2xl">
          {t("principles.title")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {principles.map((key) => (
            <li key={key} className="border-border bg-surface rounded-lg border p-4">
              <h3 className="font-semibold">{t(`principles.${key}.title`)}</h3>
              <p className="text-muted mt-1 text-sm">{t(`principles.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3" aria-labelledby="empresa">
        <h2 id="empresa" className="text-2xl">
          {t("company.title")}
        </h2>
        <p className="text-muted">{t("company.body", { org: brand.organization })}</p>
        <p className="text-muted text-sm">
          {t("company.contact")}{" "}
          <a href={`mailto:${brand.supportEmail}`} className="underline underline-offset-4">
            {brand.supportEmail}
          </a>{" "}
          ·{" "}
          <a
            href={social.linkedin}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            LinkedIn
          </a>
        </p>
      </section>

      <Link href="/ingresar" className={cn(buttonVariants(), "w-fit")}>
        {t("cta")}
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  );
}
