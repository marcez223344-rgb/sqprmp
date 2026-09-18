import { AppHeader } from "@/components/layout/app-header";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const profile = await requireAdmin();
  return (
    <>
      <AppHeader alias={profile.alias} displayName={profile.display_name} isAdmin onboarded />
      <main id="contenido" className="flex-1">
        {children}
      </main>
    </>
  );
}
