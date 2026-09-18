import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Administración" };

export default async function AdminPage() {
  await requireAdmin();
  const t = await getTranslations("admin.hub");
  return (
    <div className="container-page max-w-4xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>
      <Card>
        <Link href="/admin/accesos" className="text-primary underline underline-offset-4">
          {t("access")}
        </Link>
        <p className="text-muted mt-2 text-sm">{t("soon")}</p>
      </Card>
    </div>
  );
}
