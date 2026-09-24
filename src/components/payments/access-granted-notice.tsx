import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getPendingAccessNotice } from "@/lib/payments/notices";
import { AccessNoticeDismiss } from "./access-notice-dismiss";

/**
 * Shown once, at the top of the authenticated shell, the first time a learner loads the app after
 * their access becomes active (owner feedback item 23: nobody told them). Server component: the
 * entitlement is read on the server and the dismissal is a server action, so nothing about access
 * depends on the browser.
 */
export async function AccessGrantedNotice() {
  const profile = await getCurrentProfile();
  if (!profile || !profile.onboarding_completed_at) return null;
  const notice = await getPendingAccessNotice(profile);
  if (!notice) return null;
  const [t, format] = await Promise.all([getTranslations("access.notice"), getFormatter()]);
  const until = notice.endsAt
    ? t("until", { date: format.dateTime(new Date(notice.endsAt), { dateStyle: "long" }) })
    : t("lifetime");

  return (
    <div className="container-page pt-4">
      <div
        role="status"
        className="border-success/40 bg-success/10 flex flex-wrap items-start justify-between gap-3 rounded-md border p-4"
      >
        <div className="space-y-1">
          <p className="font-semibold">{t("title")}</p>
          <p className="text-sm">
            {until} {t(`source.${notice.source}` as never)}
          </p>
          <p className="text-sm">
            <Link href="/ruta" className="text-primary underline underline-offset-4">
              {t("goPath")}
            </Link>
            <span aria-hidden="true"> · </span>
            <Link href="/acceso" className="text-primary underline underline-offset-4">
              {t("seeDetails")}
            </Link>
          </p>
        </div>
        <AccessNoticeDismiss label={t("dismiss")} />
      </div>
    </div>
  );
}
