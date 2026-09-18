import Link from "next/link";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("history");
  return { title: t("title") };
}

/** Learner's own attempts (RLS), newest first, with the exercise title and a link back. */
export default async function HistoryPage() {
  const profile = await requireOnboardedProfile("/historial");
  const supabase = await createClient();
  const [t, format, { data: attempts }] = await Promise.all([
    getTranslations("history"),
    getFormatter(),
    supabase
      .from("attempts")
      .select("id, exercise_id, sql, status, feedback, execution_ms, row_count, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const exerciseIds = [...new Set((attempts ?? []).map((a) => a.exercise_id))];
  const { data: exercises } = exerciseIds.length
    ? await supabase.from("exercises_public").select("id, slug, title").in("id", exerciseIds)
    : { data: [] as { id: string | null; slug: string | null; title: string | null }[] };
  const byId = new Map((exercises ?? []).map((e) => [e.id, e]));

  return (
    <div className="container-page max-w-4xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>
      {!attempts?.length ? (
        <p className="border-border text-muted rounded-md border border-dashed p-6 text-center text-sm">
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {attempts.map((a) => {
            const ex = byId.get(a.exercise_id);
            const Icon =
              a.status === "correct"
                ? CheckCircle2
                : a.status === "error"
                  ? AlertTriangle
                  : XCircle;
            const feedback = Array.isArray(a.feedback)
              ? (a.feedback as { category?: string }[])
              : [];
            return (
              <li key={a.id} className="border-border bg-surface rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <Icon aria-hidden="true" className="size-4" />
                    {t(`status.${a.status}`)}
                    {ex?.slug ? (
                      <Link
                        href={`/ejercicio/${ex.slug}`}
                        className="text-primary underline underline-offset-4"
                      >
                        {ex.title}
                      </Link>
                    ) : null}
                  </span>
                  <span className="text-muted text-xs">
                    {format.dateTime(new Date(a.created_at), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {a.execution_ms != null ? ` · ${a.execution_ms} ms` : ""}
                    {a.row_count != null ? ` · ${t("rows", { rows: a.row_count })}` : ""}
                  </span>
                </div>
                <pre className="bg-surface-2 mt-2 overflow-x-auto rounded-md p-3 font-mono text-xs">
                  {a.sql}
                </pre>
                {feedback.length ? (
                  <p className="text-muted mt-2 text-xs">
                    {t("feedbackCategories")}:{" "}
                    {feedback
                      .map((f) => f.category)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
