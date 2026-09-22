import { AlertTriangle } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Markdown } from "@/components/learn/markdown";
import { brand } from "@/config/brand";

/**
 * Long-form legal page. Shows a visible "draft pending legal review" notice while the
 * company data in src/config/brand.ts still carries D-09 placeholders (never hides WIP).
 */
export async function LegalPage({
  title,
  version,
  markdown,
}: {
  title: string;
  version: string;
  markdown: string;
}) {
  const [t, format] = await Promise.all([getTranslations("legal"), getFormatter()]);
  // The owner chose not to publish the address/CUIT (D-09); the texts omit them and the
  // notice stays off. It reappears if a placeholder is ever put back into the config.
  const draft = brand.legalAddress.includes("PENDIENTE") || brand.taxId.includes("PENDIENTE");
  return (
    <div className="container-page max-w-3xl space-y-6 py-12">
      <header className="space-y-2">
        <h1 className="text-4xl">{title}</h1>
        <p className="text-muted text-sm">
          {t("version", { date: format.dateTime(new Date(version), { dateStyle: "long" }) })}
        </p>
      </header>
      {draft ? (
        <p
          role="note"
          className="border-warning/40 bg-warning/10 inline-flex items-start gap-2 rounded-md border p-3 text-sm"
        >
          <AlertTriangle aria-hidden="true" className="text-warning mt-0.5 size-4 shrink-0" />
          <span>{t("draftNotice")}</span>
        </p>
      ) : null}
      <article>
        <Markdown>{markdown}</Markdown>
      </article>
    </div>
  );
}
