import Link from "next/link";
import { Award, CheckCircle2, Circle, Download, ShieldCheck } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { IssueCertificateForm } from "@/components/certificates/issue-form";
import { Meter } from "@/components/progress/stat-tile";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { limits } from "@/config/limits";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getRequirementStatuses } from "@/lib/certificates/service";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const t = await getTranslations("certificates");
  return { title: t("title") };
}

export default async function CertificatesPage() {
  const profile = await requireOnboardedProfile("/certificados");
  const [statuses, t, format] = await Promise.all([
    getRequirementStatuses(profile),
    getTranslations("certificates"),
    getFormatter(),
  ]);
  return (
    <div className="container-page max-w-4xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </header>
      {statuses.length === 0 ? (
        <Card>
          <p className="text-muted">{t("empty")}</p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {statuses.map((s) => {
            const completed = s.sections.filter((x) => x.completed).length;
            const unitsDone = s.sections.reduce((a, x) => a + x.progress.unitsDone, 0);
            const unitsTotal = s.sections.reduce((a, x) => a + x.progress.unitsTotal, 0);
            return (
              <li key={s.slug}>
                <Card className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="inline-flex items-center gap-2 text-xl">
                        <Award aria-hidden="true" className="text-primary size-5" />
                        {s.title}
                      </h2>
                      {/* Two numbers, because one of them was always zero at the start and said
                          nothing about the work already done: sections fully completed (what the
                          certificate is built on) and the share of lessons and exercises done. */}
                      <p className="text-muted text-sm">
                        {t("progress", { completed, total: s.sections.length })}
                      </p>
                      <p className="text-muted text-sm">
                        {t("progressUnits", {
                          done: unitsDone,
                          total: unitsTotal,
                          percent: s.percent,
                        })}
                      </p>
                    </div>
                    <StatusPill
                      label={
                        s.certificate
                          ? s.certificate.revoked
                            ? t("status.revoked")
                            : t("status.issued")
                          : s.eligible
                            ? t("status.eligible")
                            : t("status.inProgress")
                      }
                      tone={
                        s.certificate
                          ? s.certificate.revoked
                            ? "danger"
                            : "success"
                          : s.eligible
                            ? "info"
                            : "muted"
                      }
                    />
                  </div>

                  {unitsTotal > 0 ? (
                    <Meter
                      tone="success"
                      percent={s.percent}
                      label={s.title}
                      valueText={t("progressUnits", {
                        done: unitsDone,
                        total: unitsTotal,
                        percent: s.percent,
                      })}
                    />
                  ) : null}

                  <ul className="grid gap-2 text-sm sm:grid-cols-2">
                    {s.sections.map((sec) => {
                      const p = sec.progress;
                      // "Teoría 1/2 · Ejercicios 3/5 · Quiz pendiente": the three kinds of work a
                      // section holds, so one solved exercise is visible on this page.
                      const detail =
                        p.unitsTotal === 0
                          ? t("detail.soon")
                          : [
                              p.lessonsTotal > 0
                                ? t("detail.lessons", {
                                    done: p.lessonsDone,
                                    total: p.lessonsTotal,
                                  })
                                : null,
                              p.exercisesTotal > 0
                                ? t("detail.exercises", {
                                    done: p.exercisesDone,
                                    total: p.exercisesTotal,
                                  })
                                : null,
                              p.quizzesTotal > 0
                                ? p.quizzesDone === p.quizzesTotal
                                  ? t("detail.quizPassed")
                                  : t("detail.quizPending")
                                : null,
                            ]
                              .filter((x): x is string => Boolean(x))
                              .join(" · ");
                      return (
                        <li
                          key={sec.slug}
                          className="border-border bg-surface-2 flex items-start gap-2 rounded-md border p-3"
                        >
                          {sec.completed ? (
                            <CheckCircle2
                              aria-hidden="true"
                              className="text-success-ink mt-0.5 size-4 shrink-0"
                            />
                          ) : (
                            <Circle
                              aria-hidden="true"
                              className="text-muted mt-0.5 size-4 shrink-0"
                            />
                          )}
                          <span className="min-w-0">
                            <span className="sr-only">
                              {sec.completed ? t("sectionDone") : t("sectionPending")}
                            </span>
                            <span className="block">
                              {sec.number}. {sec.title}
                            </span>
                            {/* What is actually left in this section, instead of a bare circle. */}
                            <span className="text-muted block text-xs">{detail}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <p className="text-muted text-xs">
                    {t("skills")}: {s.skills.join(" · ")}
                  </p>

                  {s.certificate ? (
                    <div className="border-border space-y-2 border-t pt-4 text-sm">
                      <p>
                        {t("issuedOn", {
                          date: format.dateTime(new Date(s.certificate.issuedAt), {
                            dateStyle: "long",
                          }),
                        })}{" "}
                        · <span className="font-mono">{s.certificate.publicId}</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/certificados/${s.certificate.publicId}/pdf`}
                          className={cn(buttonVariants({ variant: "secondary" }))}
                          target="_blank"
                          rel="noopener"
                        >
                          <Download aria-hidden="true" />
                          {t("downloadPdf")}
                        </a>
                        <Link
                          href={`/verificar/${s.certificate.verificationCode}`}
                          className={cn(buttonVariants({ variant: "ghost" }))}
                        >
                          <ShieldCheck aria-hidden="true" />
                          {t("verifyLink")}
                        </Link>
                      </div>
                    </div>
                  ) : s.eligible ? (
                    <div className="border-border border-t pt-4">
                      <IssueCertificateForm
                        requirementSlug={s.slug}
                        defaultName={profile.display_name ?? ""}
                      />
                    </div>
                  ) : (
                    <p className="text-muted text-sm">
                      {t("howToEarn", { percent: limits.certificates.minQuizScorePercent })}
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "danger" | "info" | "muted";
}) {
  const tones = {
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    info: "bg-info/10 text-info",
    muted: "bg-surface-2 text-muted",
  } as const;
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", tones[tone])}>{label}</span>
  );
}
