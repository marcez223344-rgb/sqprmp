import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Administración" };

export default async function AdminPage() {
  await requireAdmin();
  return <PlaceholderPage title="Administración" phase={8} />;
}
