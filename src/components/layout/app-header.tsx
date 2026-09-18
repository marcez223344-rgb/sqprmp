import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface AppHeaderProps {
  alias: string | null;
  displayName: string | null;
  isAdmin: boolean;
  onboarded: boolean;
}

export async function AppHeader({ alias, displayName, isAdmin, onboarded }: AppHeaderProps) {
  const t = await getTranslations("app");
  const links = [
    { href: "/aprender", label: t("nav.dashboard") },
    { href: "/ruta", label: t("nav.path") },
    { href: "/logros", label: t("nav.badges") },
    { href: "/perfil", label: t("nav.profile") },
  ] as const;

  return (
    <header className="border-border bg-bg/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          href={onboarded ? "/aprender" : "/onboarding"}
          className="rounded-md"
          aria-label="Inicio"
        >
          <Logo compact />
        </Link>

        {onboarded ? (
          <nav aria-label="Aplicación" className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted hover:bg-surface-2 hover:text-text rounded-md px-3 py-2 text-sm"
              >
                {l.label}
              </Link>
            ))}
            {isAdmin ? (
              <Link
                href="/admin"
                className="text-muted hover:bg-surface-2 hover:text-text rounded-md px-3 py-2 text-sm"
              >
                <ShieldCheck aria-hidden="true" className="mr-1 inline size-4" />
                {t("nav.admin")}
              </Link>
            ) : null}
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          {alias ? (
            <span className="text-muted hidden text-sm sm:inline" aria-label={t("signedInAs")}>
              @{alias}
            </span>
          ) : displayName ? (
            <span className="text-muted hidden text-sm sm:inline">{displayName}</span>
          ) : null}
          <ThemeToggle />
          <form action="/auth/signout" method="post">
            <button type="submit" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              <LogOut aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{t("signOut")}</span>
            </button>
          </form>
        </div>
      </div>
      {onboarded ? (
        <nav aria-label="Aplicación (móvil)" className="border-border border-t md:hidden">
          <div className="container-page flex gap-1 overflow-x-auto py-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hover:bg-surface-2 rounded-md px-3 py-2 text-sm whitespace-nowrap"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
