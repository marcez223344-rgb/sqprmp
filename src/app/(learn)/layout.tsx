import { useTranslations } from "next-intl";
import { AppHeader } from "@/components/layout/app-header";
import { AccessGrantedNotice } from "@/components/payments/access-granted-notice";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";

/**
 * Authenticated shell. Onboarding itself lives under this layout, so the header
 * shows a reduced state until the profile is complete.
 */
export default async function LearnLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  const profile = await getCurrentProfile();
  return (
    <>
      <SkipLink />
      <AppHeader
        alias={profile?.alias ?? null}
        displayName={profile?.display_name ?? null}
        isAdmin={profile?.role === "admin"}
        onboarded={Boolean(profile?.onboarding_completed_at)}
      />
      <main id="contenido" className="flex-1">
        {/* One-time confirmation that access is live; renders nothing when there is none. */}
        <AccessGrantedNotice />
        {children}
      </main>
    </>
  );
}

function SkipLink() {
  const t = useTranslations("common");
  return (
    <a
      href="#contenido"
      className="bg-primary text-primary-fg fixed top-2 left-2 z-50 inline-flex min-h-10 -translate-y-[300%] items-center rounded-md px-4 py-2 focus:translate-y-0 motion-safe:transition-transform"
    >
      {t("skipToContent")}
    </a>
  );
}
