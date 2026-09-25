import Link from "next/link";
import { Award, Download, ShieldCheck } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { PrivacyPanel } from "@/components/profile/privacy-panel";
import { ProfileForm } from "@/components/profile/profile-form";
import { Meter } from "@/components/progress/stat-tile";
import { Card } from "@/components/ui/card";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getRequirementStatuses } from "@/lib/certificates/service";
import { publishedLessons } from "@/lib/curriculum/path-summary";
import { groupByCourseLevel } from "@/lib/curriculum/course-levels";
import { getLearningPath } from "@/lib/curriculum/queries";
import { profileToFormInput } from "@/lib/profile/schemas";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("profile");
  return { title: t("title") };
}

export default async function ProfilePage() {
  const profile = await requireOnboardedProfile("/perfil");
  const supabase = await createClient();
  const [{ data: avatars }, { data: requests }, path, statuses, tPath, format] = await Promise.all([
    supabase
      .from("avatars")
      .select("id, slug, image_path, alt_text")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("data_requests")
      .select("id, type, status, requested_at")
      .eq("user_id", profile.id)
      .in("status", ["pending", "processing"])
      .order("requested_at", { ascending: false }),
    getLearningPath(profile.id),
    getRequirementStatuses(profile),
    getTranslations("path"),
    getFormatter(),
  ]);
  const t = await getTranslations("profile");
  // Same grouping and counting as /ruta (published lessons only), so the numbers match.
  const byLevel = groupByCourseLevel(path)
    .map(({ level, sections }) => {
      const lessons = sections
        .filter((s) => s.is_published)
        .flatMap((s) => publishedLessons(s.lessons));
      const done = lessons.filter((l) => l.status === "completed").length;
      return {
        level,
        done,
        total: lessons.length,
        percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
      };
    })
    .filter((g) => g.total > 0);
  const issued = statuses.flatMap((s) =>
    s.certificate && !s.certificate.revoked ? [{ title: s.title, ...s.certificate }] : [],
  );

  return (
    <div className="container-page max-w-3xl space-y-8 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">
          @{profile.alias} · {t("aliasNote")}
        </p>
      </header>

      {/* What the learner has earned, in one place: until now the profile held only settings. */}
      <Card className="space-y-6">
        <h2 className="text-xl">{t("sections.achievements")}</h2>

        <section aria-labelledby="perfil-certificados" className="space-y-3">
          <h3 id="perfil-certificados" className="text-base font-semibold">
            {t("certificates.title")}
          </h3>
          {issued.length ? (
            <ul className="divide-border border-border divide-y rounded-md border">
              {issued.map((c) => (
                <li
                  key={c.publicId}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-3 text-sm"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Award aria-hidden="true" className="text-primary size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium">{c.title}</span>
                      <span className="text-muted block text-xs">
                        {t("certificates.issuedOn", {
                          date: format.dateTime(new Date(c.issuedAt), { dateStyle: "long" }),
                        })}
                      </span>
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-x-4 gap-y-1">
                    <Link
                      href={`/verificar/${c.verificationCode}`}
                      className="text-primary inline-flex items-center gap-1 underline underline-offset-4"
                    >
                      <ShieldCheck aria-hidden="true" className="size-4" />
                      {t("certificates.verify")}
                      <span className="sr-only"> {c.title}</span>
                    </Link>
                    <a
                      href={`/certificados/${c.publicId}/pdf`}
                      target="_blank"
                      rel="noopener"
                      className="text-primary inline-flex items-center gap-1 underline underline-offset-4"
                    >
                      <Download aria-hidden="true" className="size-4" />
                      {t("certificates.pdf")}
                      <span className="sr-only">
                        {" "}
                        {c.title} {t("certificates.opensNewTab")}
                      </span>
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted text-sm">{t("certificates.none")}</p>
          )}
          <Link href="/certificados" className="text-primary text-sm underline underline-offset-4">
            {t("certificates.all")}
          </Link>
        </section>

        {byLevel.length ? (
          <section aria-labelledby="perfil-progreso" className="space-y-3">
            <h3 id="perfil-progreso" className="text-base font-semibold">
              {t("levelProgress.title")}
            </h3>
            <ul className="space-y-3">
              {byLevel.map((g) => {
                const text = t("levelProgress.value", {
                  done: g.done,
                  total: g.total,
                  percent: g.percent,
                });
                return (
                  <li key={g.level}>
                    <div className="mb-1 flex flex-wrap justify-between gap-x-3 text-sm">
                      <span>{tPath(`levels.${g.level}`)}</span>
                      <span className="text-muted">{text}</span>
                    </div>
                    <Meter
                      tone="success"
                      percent={g.percent}
                      label={tPath(`levels.${g.level}`)}
                      valueText={text}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-6 text-xl">{t("sections.identity")}</h2>
        <ProfileForm avatars={avatars ?? []} initial={profileToFormInput(profile)} />
      </Card>

      <Card>
        <h2 className="mb-2 text-xl">{t("sections.privacy")}</h2>
        <p className="text-muted mb-6 text-sm">{t("privacyIntro")}</p>
        <PrivacyPanel requests={requests ?? []} />
      </Card>
    </div>
  );
}
