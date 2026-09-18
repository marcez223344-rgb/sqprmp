import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DemoWorkspace } from "@/components/workspace/demo-workspace";
import { buttonVariants } from "@/components/ui/button";
import { tiendaviva } from "@/content/datasets/tiendaviva";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const t = await getTranslations("demo");
  return { title: t("title") };
}

/** Public sandbox: the schema comes from the content spec, so no database is needed. */
export default async function DemoPage() {
  const t = await getTranslations("demo");
  const schema = Object.fromEntries(
    tiendaviva.tables.map((tb) => [tb.name, tb.columns.map((c) => c.name)]),
  );
  return (
    <div className="container-page max-w-5xl space-y-8 py-12">
      <header className="space-y-3">
        <h1 className="text-4xl">{t("title")}</h1>
        <p className="text-muted max-w-prose text-lg">{t("intro")}</p>
      </header>
      <DemoWorkspace schema={schema} />
      <section className="border-border bg-surface rounded-lg border p-5">
        <h2 className="text-xl">{t("tablesTitle")}</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {tiendaviva.tables.map((tb) => (
            <li key={tb.name} className="text-sm">
              <code className="font-mono font-medium">{tb.name}</code>
              <span className="text-muted"> — {tb.description}</span>
            </li>
          ))}
        </ul>
        <Link href="/ingresar" className={cn(buttonVariants(), "mt-6")}>
          {t("cta")}
        </Link>
      </section>
    </div>
  );
}
