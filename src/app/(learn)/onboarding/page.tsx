import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("onboarding");
  return { title: t("title") };
}

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);
  const profile = await getCurrentProfile();
  if (!profile) redirect("/ingresar");
  if (profile.onboarding_completed_at) redirect(next);

  const supabase = await createClient();
  const { data: avatars } = await supabase
    .from("avatars")
    .select("id, slug, image_path, alt_text")
    .eq("is_active", true)
    .order("sort_order");

  const t = await getTranslations("onboarding");

  return (
    <div className="container-page max-w-3xl py-10">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>
      {/* The Google name arrives as a *suggestion*, never as a value: pre-filling it published the
          learner's legal name as their public display name without them choosing it. */}
      <OnboardingForm
        avatars={avatars ?? []}
        next={next}
        suggestedName={profile.display_name ?? ""}
      />
    </div>
  );
}
