import Link from "next/link";
import {
  Award,
  Check,
  CircleDashed,
  CircleDot,
  CircleX,
  Download,
  Share2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { IssueCertificateForm } from "@/components/certificates/issue-form";
import {
  ProgressMarker,
  progressRailClasses,
  type ProgressState,
} from "@/components/progress/progress-state";
import { Meter } from "@/components/progress/stat-tile";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { limits } from "@/config/limits";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { linkedInAddCertificationUrl } from "@/lib/certificates/linkedin";
import { getRequirementStatuses } from "@/lib/certificates/service";
import { absoluteUrl } from "@/lib/seo/urls";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata() {
  const t = await getTranslations("certificates");
  return { title: t("title") };
}

export default async function CertificatesPage() {
  const profile = await requireOnboardedProfile("/certificados");
  // `path` is borrowed for one string: the word «En curso», so a section that has work started on
  // it reads the same here as it does on /ruta.
  const [statuses, t, tPath, format] = await Promise.all([
    getRequirementStatuses(profile),
    getTranslations("certificates"),
    getTranslations("path"),
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
                      // The same four-state vocabulary as /ruta (DESIGN_SYSTEM §5c): a bare circle
                      // could not say whether a pending section had been started.
                      const state: ProgressState =
                        p.unitsTotal === 0
                          ? "soon"
                          : sec.completed
                            ? "completed"
                            : p.unitsDone > 0
                              ? "in_progress"
                              : "not_started";
                      const stateLabel =
                        state === "completed"
                          ? t("sectionDone")
                          : state === "in_progress"
                            ? tPath("state.in_progress")
                            : state === "soon"
                              ? t("detail.soon")
                              : t("sectionPending");
                      return (
                        <li
                          key={sec.slug}
                          className={cn(
                            "border-border bg-surface flex items-start gap-2 rounded-md border p-3",
                            progressRailClasses(state),
                            // These cards are fully bordered, unlike the /ruta lesson rows, so the
                            // untouched state keeps a normal left border instead of a transparent
                            // notch in the outline.
                            state === "not_started" && "border-l-border",
                          )}
                        >
                          <ProgressMarker state={state} label={stateLabel} className="mt-0.5" />
                          <span className="min-w-0">
                            <span className={cn("block", state === "in_progress" && "font-bold")}>
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
                          <span className="sr-only"> {t("opensNewTab")}</span>
                        </a>
                        <Link
                          href={`/verificar/${s.certificate.verificationCode}`}
                          className={cn(buttonVariants({ variant: "ghost" }))}
                        >
                          <ShieldCheck aria-hidden="true" />
                          {t("verifyLink")}
                        </Link>
                        {/* Only on the learner's own page: the public verify page is read by
                            employers, who have no certificate to add. */}
                        {!s.certificate.revoked ? (
                          <a
                            href={linkedInAddCertificationUrl({
                              name: s.title,
                              organizationName: brand.organization,
                              issuedAt: new Date(s.certificate.issuedAt),
                              certUrl: absoluteUrl(`/verificar/${s.certificate.verificationCode}`),
                              certId: s.certificate.publicId,
                            })}
                            className={cn(buttonVariants({ variant: "ghost" }))}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Share2 aria-hidden="true" />
                            {t("addToLinkedIn")}
                            <span className="sr-only"> {t("opensNewTab")}</span>
                          </a>
                        ) : null}
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

/**
 * Four verdicts that used to differ only by hue — and `--color-success` over its own 10 % tint
 * measures 4.35:1, below AA. Each one now carries a glyph as well, and the success ink is the
 * `-ink` variant that passes.
 */
const PILL: Record<"success" | "danger" | "info" | "muted", { classes: string; icon: LucideIcon }> =
  {
    success: { classes: "bg-success-ink/10 text-success-ink", icon: Check },
    danger: { classes: "bg-danger/8 text-danger", icon: CircleX },
    info: { classes: "bg-info/10 text-info", icon: CircleDot },
    muted: { classes: "bg-surface-2 text-muted", icon: CircleDashed },
  };

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "danger" | "info" | "muted";
}) {
  const { classes, icon: Icon } = PILL[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        classes,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}
