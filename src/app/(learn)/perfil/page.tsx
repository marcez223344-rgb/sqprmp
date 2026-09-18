import { getTranslations } from "next-intl/server";
import { PrivacyPanel } from "@/components/profile/privacy-panel";
import { ProfileForm } from "@/components/profile/profile-form";
import { Card } from "@/components/ui/card";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { profileToFormInput } from "@/lib/profile/schemas";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("profile");
  return { title: t("title") };
}

export default async function ProfilePage() {
  const profile = await requireOnboardedProfile("/perfil");
  const supabase = await createClient();
  const [{ data: avatars }, { data: requests }] = await Promise.all([
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
  ]);
  const t = await getTranslations("profile");

  return (
    <div className="container-page max-w-3xl space-y-8 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">
          @{profile.alias} · {t("aliasNote")}
        </p>
      </header>

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
