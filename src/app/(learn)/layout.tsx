import { useTranslations } from "next-intl";
import { AppHeader } from "@/components/layout/app-header";
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
      className="focus:bg-primary focus:text-primary-fg sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-4 focus:py-2"
    >
      {t("skipToContent")}
    </a>
  );
}
