import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/layout/logo";
import { brand } from "@/config/brand";
import { founder } from "@/config/founder";

export function SiteFooter() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();
  return (
    <footer className="border-border bg-surface mt-24 border-t">
      <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Logo compact />
          <p className="text-muted text-sm">{t("madeIn")}</p>
          <p className="text-muted text-sm">
            {founder.role} · {founder.name}
          </p>
        </div>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/terminos" className="text-muted hover:text-text">
            {t("terms")}
          </Link>
          <Link href="/privacidad" className="text-muted hover:text-text">
            {t("privacy")}
          </Link>
          <Link href="/verificar" className="text-muted hover:text-text">
            {t("verify")}
          </Link>
        </nav>
      </div>
      <div className="container-page text-muted pb-8 text-xs">
        © {year} {brand.organization}. {t("rights")}
      </div>
    </footer>
  );
}
