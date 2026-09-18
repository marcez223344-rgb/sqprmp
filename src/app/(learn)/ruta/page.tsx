import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { requireOnboardedProfile } from "@/lib/auth/session";

export const metadata = { title: "Ruta de aprendizaje" };

export default async function PathPage() {
  await requireOnboardedProfile("/ruta");
  return <PlaceholderPage title="Ruta de aprendizaje" phase={3} />;
}
