import Link from "next/link";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { verifyCertificate } from "@/lib/certificates/service";
import { cn } from "@/lib/utils/cn";

const CODE = /^[a-z0-9]{20}$/;

export async function generateMetadata() {
  const t = await getTranslations("verify");
  return { title: t("title"), robots: { index: false } };
}

export default async function VerifyCodePage({ params }: PageProps<"/verificar/[code]">) {
  const { code } = await params;
  const [t, format] = await Promise.all([getTranslations("verify"), getFormatter()]);
  const result = CODE.test(code) ? await verifyCertificate(code) : null;

  return (
    <div className="container-page max-w-xl space-y-6 py-12">
      <header className="space-y-2">
        <h1 className="inline-flex items-center gap-2 text-3xl">
          <ShieldCheck aria-hidden="true" className="text-primary size-7" />
          {t("title")}
        </h1>
      </header>

      {!result ? (
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
          <p
            className={cn(
              "inline-flex items-center gap-2 font-semibold",
              result.revoked ? "text-danger" : "text-success",
            )}
          >
            {result.revoked ? (
              <XCircle aria-hidden="true" className="size-5" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="size-5" />
            )}
            {result.revoked ? t("revoked.title") : t("valid.title")}
          </p>
          {result.revoked ? <p className="text-muted text-sm">{t("revoked.body")}</p> : null}
          <dl className="grid gap-3 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted">{t("fields.recipient")}</dt>
            <dd className="font-medium">{result.recipientName}</dd>
            <dt className="text-muted">{t("fields.title")}</dt>
            <dd className="font-medium">{result.title}</dd>
            <dt className="text-muted">{t("fields.skills")}</dt>
            <dd>{result.skills.join(" · ")}</dd>
            <dt className="text-muted">{t("fields.issuedAt")}</dt>
            <dd>{format.dateTime(new Date(result.issuedAt), { dateStyle: "long" })}</dd>
            <dt className="text-muted">{t("fields.id")}</dt>
            <dd className="font-mono">{result.publicId}</dd>
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
