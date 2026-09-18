import { useTranslations } from "next-intl";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations("common");
  return (
    <>
      <a
        href="#contenido"
        className="focus:bg-primary focus:text-primary-fg sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-4 focus:py-2"
      >
        {t("skipToContent")}
      </a>
      <SiteHeader />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
