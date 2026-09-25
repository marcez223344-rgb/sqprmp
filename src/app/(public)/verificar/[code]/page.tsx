import Link from "next/link";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { CertificateSeal } from "@/components/certificates/certificate-seal";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { founder } from "@/config/founder";
import { verificationRateLimited, verifyCertificate } from "@/lib/certificates/service";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils/cn";

const CODE = /^[a-z0-9]{20}$/;

export async function generateMetadata({ params }: PageProps<"/verificar/[code]">) {
  const { code } = await params;
  const t = await getTranslations("verify");
  // Not indexable (it names a person), but it still needs a card: a learner posting their
  // certificate on LinkedIn is the cheapest marketing this product has.
  return buildPageMetadata({
    path: `/verificar/${CODE.test(code) ? code : ""}`,
    title: t("title"),
    description: t("subtitle"),
    type: "article",
    noIndex: true,
    // The certificate card lives in this segment (opengraph-image.tsx); Next merges it.
    imagePath: null,
  });
}

export default async function VerifyCodePage({ params }: PageProps<"/verificar/[code]">) {
  const { code } = await params;
  const [t, format] = await Promise.all([getTranslations("verify"), getFormatter()]);
  const limited = await verificationRateLimited();
  const result = CODE.test(code) && !limited ? await verifyCertificate(code) : null;

  return (
    <div className="container-page max-w-xl space-y-6 py-12">
      <header className="space-y-2">
        <h1 className="inline-flex items-center gap-2 text-3xl">
          <ShieldCheck aria-hidden="true" className="text-primary size-7" />
          {t("title")}
        </h1>
      </header>

      {limited ? (
        <Card className="space-y-3" role="status">
          <p className="text-warning font-semibold">{t("rateLimited")}</p>
        </Card>
      ) : !result ? (
        <Card className="space-y-3" role="status">
          <p className="text-danger inline-flex items-center gap-2 font-semibold">
            <XCircle aria-hidden="true" className="size-5" />
            {t("notFound.title")}
          </p>
          <p className="text-muted text-sm">{t("notFound.body")}</p>
          <Link href="/verificar" className={cn(buttonVariants({ variant: "secondary" }), "w-fit")}>
            {t("tryAgain")}
          </Link>
        </Card>
      ) : (
        <Card className="space-y-4" role="status">
          <div className="flex items-start justify-between gap-4">
            <p
              className={cn(
                "inline-flex items-center gap-2 font-semibold",
                result.revoked ? "text-danger" : "text-success-ink",
              )}
            >
              {result.revoked ? (
                <XCircle aria-hidden="true" className="size-5" />
              ) : (
                <CheckCircle2 aria-hidden="true" className="size-5" />
              )}
              {result.revoked ? t("revoked.title") : t("valid.title")}
            </p>
            {/* The same seal as the PDF (D-42). Decorative: the verdict above says it in words.
                A revoked certificate shows none, since a seal reads as "valid". */}
            {result.revoked ? null : <CertificateSeal className="-mt-1 w-16 sm:w-20" />}
          </div>
          {result.revoked ? <p className="text-muted text-sm">{t("revoked.body")}</p> : null}
          <dl className="grid gap-3 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted">{t("fields.recipient")}</dt>
            <dd className="font-medium">{result.recipientName}</dd>
            <dt className="text-muted">{t("fields.title")}</dt>
            <dd className="font-medium">{result.title}</dd>
            <dt className="text-muted">{t("fields.skills")}</dt>
            <dd>{result.skills.join(" · ")}</dd>
            {result.programHours > 0 ? (
              <>
                <dt className="text-muted">{t("fields.programHours")}</dt>
                <dd>{t("fields.programHoursValue", { hours: result.programHours })}</dd>
              </>
            ) : null}
            <dt className="text-muted">{t("fields.issuedAt")}</dt>
            <dd>{format.dateTime(new Date(result.issuedAt), { dateStyle: "long" })}</dd>
            <dt className="text-muted">{t("fields.id")}</dt>
            <dd className="font-mono">{result.publicId}</dd>
            {/* P-6 (owner, 2026-09-23): the named instructor gives the credential its
                credibility, the company is the verifiable entity that issued it. */}
            <dt className="text-muted">{t("fields.instructor")}</dt>
            <dd>{founder.name}</dd>
            <dt className="text-muted">{t("fields.issuer")}</dt>
            <dd>
              {brand.organization} · {brand.productName}
            </dd>
          </dl>
          <p className="text-muted text-xs">{t("privacyNote")}</p>
        </Card>
      )}
    </div>
  );
}
