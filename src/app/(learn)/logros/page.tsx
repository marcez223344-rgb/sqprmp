import { Award, Lock } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getDashboard } from "@/lib/progress/queries";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const t = await getTranslations("badges");
  return { title: t("title") };
}

export default async function BadgesPage() {
  const profile = await requireOnboardedProfile("/logros");
  const [d, t, format] = await Promise.all([
    getDashboard(profile),
    getTranslations("badges"),
    getFormatter(),
  ]);
  const earned = d.badges.filter((b) => b.earned_at).length;
  return (
    <div className="container-page max-w-4xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("summary", { earned, total: d.badges.length })}</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {d.badges.map((b) => {
          const done = Boolean(b.earned_at);
          return (
            <li
              key={b.slug}
              className={cn(
                "border-border bg-surface flex gap-3 rounded-lg border p-4",
                !done && "opacity-70",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  done ? "bg-warning/20 text-warning" : "bg-surface-2 text-muted",
                )}
              >
                {done ? (
                  <Award aria-hidden="true" className="size-5" />
                ) : (
                  <Lock aria-hidden="true" className="size-5" />
                )}
              </span>
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {b.title}
                  <span className="sr-only">: {done ? t("earned") : t("locked")}</span>
                </p>
                <p className="text-muted">{b.description}</p>
                <p className="text-muted text-xs">
                  {done && b.earned_at
                    ? t("earnedOn", {
                        date: format.dateTime(new Date(b.earned_at), { dateStyle: "medium" }),
                      })
                    : t("locked")}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
