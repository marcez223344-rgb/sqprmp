import { useTranslations } from "next-intl";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations("common");
  return (
    <>
      <a
        href="#contenido"
        className="bg-primary text-primary-fg fixed top-2 left-2 z-50 inline-flex min-h-10 -translate-y-[300%] items-center rounded-md px-4 py-2 focus:translate-y-0 motion-safe:transition-transform"
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
