import Link from "next/link";
import { Check } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { PricingActions } from "@/components/payments/pricing-actions";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { limits } from "@/config/limits";
import { getCurrentProfile } from "@/lib/auth/session";
import { getLearningPath } from "@/lib/curriculum/queries";
import { getAccessStatus, getCatalog } from "@/lib/payments/service";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const t = await getTranslations("pricing");
  return buildPageMetadata({
    path: "/precios",
    title: t("title"),
    description: t("intro", { free: limits.freeExerciseLimit }),
  });
}

export default async function PricingPage({ searchParams }: PageProps<"/precios">) {
  const params = await searchParams;
  // The anonymous learning path reads the cached catalogue, so the section count costs no query.
  const [t, format, catalog, profile, sections] = await Promise.all([
    getTranslations("pricing"),
    getFormatter(),
    getCatalog(),
    getCurrentProfile(),
    getLearningPath(),
  ]);
  const access = profile ? await getAccessStatus(profile) : null;
  const usd =
    catalog.prices.find((p) => p.currency === "USD" && p.provider === "manual") ??
    catalog.prices.find((p) => p.currency === "USD");
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className="container-page max-w-4xl space-y-10 py-12">
      <header className="space-y-3 text-center">
        <h1 className="text-4xl">{t("title")}</h1>
        <p className="text-muted mx-auto max-w-prose text-lg">
          {t("intro", { free: limits.freeExerciseLimit })}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-2xl">{t("free.title")}</h2>
          <p className="font-heading text-3xl font-bold">{t("free.price")}</p>
          <ul className="space-y-2 text-sm">
            {(["theory", "exercises", "aiLesson", "demo", "progress"] as const).map((k) => (
              <li key={k} className="flex gap-2">
                <Check aria-hidden="true" className="text-success mt-0.5 size-4 shrink-0" />
                {t(`free.items.${k}`, { free: limits.freeExerciseLimit })}
              </li>
            ))}
          </ul>
          <Link href="/ingresar" className={cn(buttonVariants({ variant: "secondary" }), "w-fit")}>
            {t("free.cta")}
          </Link>
        </Card>

        <Card className="border-primary space-y-4">
          <h2 className="text-2xl">{catalog.product?.title ?? t("full.title")}</h2>
          <p className="font-heading text-3xl font-bold">
            {usd
              ? format.number(usd.amount_minor / 100, { style: "currency", currency: usd.currency })
              : t("full.priceSoon")}
            <span className="text-muted ml-2 text-base font-normal">{t("full.once")}</span>
          </p>
          <ul className="space-y-2 text-sm">
            {(["all", "quizzes", "certificates", "updates", "support"] as const).map((k) => (
              <li key={k} className="flex gap-2">
                <Check aria-hidden="true" className="text-success mt-0.5 size-4 shrink-0" />
                {t(`full.items.${k}`, { sections: sections.length })}
              </li>
            ))}
          </ul>
          {error ? (
            <p
              role="alert"
              className="border-danger/40 bg-danger/10 rounded-md border px-3 py-2 text-sm"
            >
              {t(`errors.${error}` as never)}
            </p>
          ) : null}
          <PricingActions
            signedIn={Boolean(profile)}
            entitled={Boolean(access?.entitled)}
            pending={Boolean(access?.pendingPurchase)}
            prices={catalog.prices}
          />
        </Card>
      </div>

      <section className="text-muted space-y-3 text-sm">
        <h2 className="text-text text-xl">{t("faq.title")}</h2>
        <p>{t("faq.manual")}</p>
        {/* The card line promised a Hotmart checkout that D-32 disabled, so the page offered a way
            to pay that does not exist. The channels named here are the ones in
            `manualTransferChannels`; `faq.other` is the way out for a buyer none of them reach. */}
        <p>{t("faq.other", { email: brand.supportEmail })}</p>
        <p>{t("faq.refund", { refundDays: brand.refundDays })}</p>
        <p>{t("faq.scholarship")}</p>
      </section>
    </div>
  );
}
