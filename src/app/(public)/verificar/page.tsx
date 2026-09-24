import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata() {
  const t = await getTranslations("verify");
  return buildPageMetadata({ path: "/verificar", title: t("title"), description: t("subtitle") });
}

const CODE = /^[a-z0-9]{20}$/;

async function goToCode(formData: FormData) {
  "use server";
  const raw = String(formData.get("code") ?? "")
    .trim()
    .toLowerCase();
  // Accept a pasted verification URL too.
  const code = raw.split("/").pop() ?? "";
  redirect(CODE.test(code) ? `/verificar/${code}` : "/verificar?invalid=1");
}

export default async function VerifyPage({ searchParams }: PageProps<"/verificar">) {
  const [t, params] = await Promise.all([getTranslations("verify"), searchParams]);
  const invalid = params.invalid === "1";
  return (
    <div className="container-page max-w-xl space-y-6 py-12">
      <header className="space-y-2">
        <h1 className="inline-flex items-center gap-2 text-3xl">
          <ShieldCheck aria-hidden="true" className="text-primary size-7" />
          {t("title")}
        </h1>
        <p className="text-muted">{t("subtitle")}</p>
      </header>
      <Card>
        <form action={goToCode} className="space-y-4">
          <Field
            id="code"
            label={t("codeLabel")}
            hint={t("codeHint")}
            error={invalid ? t("invalidFormat") : undefined}
          >
            <input
              id="code"
              name="code"
              className="input font-mono"
              required
              maxLength={200}
              autoComplete="off"
              aria-describedby={`code-hint${invalid ? " code-error" : ""}`}
            />
          </Field>
          <Button type="submit">{t("submit")}</Button>
        </form>
      </Card>
    </div>
  );
}
