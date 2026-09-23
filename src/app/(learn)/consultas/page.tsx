import { getFormatter, getTranslations } from "next-intl/server";
import { DeleteSavedQueryButton } from "@/components/progress/delete-saved-query-button";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { listSavedQueries } from "@/lib/progress/saved-queries";

export async function generateMetadata() {
  const t = await getTranslations("savedQueries");
  return { title: t("title") };
}

export default async function SavedQueriesPage() {
  const profile = await requireOnboardedProfile("/consultas");
  const [t, format, queries] = await Promise.all([
    getTranslations("savedQueries"),
    getFormatter(),
    listSavedQueries(profile.id),
  ]);
  return (
    <div className="container-page max-w-4xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>
      {!queries.length ? (
        <p className="border-border text-muted rounded-md border border-dashed p-6 text-center text-sm">
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {queries.map((q) => (
            <li key={q.id} className="border-border bg-surface rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-medium">{q.title}</h2>
                <span className="text-muted text-xs">
                  {q.datasetSlug} ·{" "}
                  {format.dateTime(new Date(q.updatedAt), { dateStyle: "medium" })}
                </span>
              </div>
              <pre className="bg-surface-2 mt-2 overflow-x-auto rounded-md p-3 font-mono text-xs">
                {q.sql}
              </pre>
              <div className="mt-2">
                <DeleteSavedQueryButton id={q.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
