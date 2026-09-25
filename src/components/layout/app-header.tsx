import Link from "next/link";
import type { Route } from "next";
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/layout/logo";
import { SignOutForm } from "@/components/layout/sign-out-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getAdminAttentionCount } from "@/lib/admin/queries";
import { isLeaderboardEnabled } from "@/lib/progress/leaderboard";

interface AppHeaderProps {
  alias: string | null;
  displayName: string | null;
  isAdmin: boolean;
  onboarded: boolean;
}

export async function AppHeader({ alias, displayName, isAdmin, onboarded }: AppHeaderProps) {
  const [t, leaderboard, attention] = await Promise.all([
    getTranslations("app"),
    isLeaderboardEnabled(),
    // Admin-only read (service role): never computed, and never sent, for a learner.
    isAdmin && onboarded ? getAdminAttentionCount() : Promise.resolve(0),
  ]);
  // Visible number for sighted users, full phrase for screen readers («3 novedades»).
  const attentionBadge =
    attention > 0 ? (
      <>
        <span
          aria-hidden="true"
          className="border-warning/40 bg-warning/10 text-warning-ink ml-1.5 rounded-full border px-1.5 text-xs font-semibold tabular-nums"
        >
          {attention}
        </span>
        <span className="sr-only">, {t("nav.adminAttention", { count: attention })}</span>
      </>
    ) : null;
  const links: { href: Route; label: string }[] = [
    { href: "/aprender", label: t("nav.dashboard") },
    { href: "/ruta", label: t("nav.path") },
    { href: "/logros", label: t("nav.badges") },
    // Only when the flag is on: /ranking returns 404 otherwise, and a nav item that 404s is worse
    // than no nav item.
    ...(leaderboard ? [{ href: "/ranking" as Route, label: t("nav.leaderboard") }] : []),
    { href: "/repaso", label: t("nav.review") },
    { href: "/consultas", label: t("nav.savedQueries") },
    { href: "/certificados", label: t("nav.certificates") },
    { href: "/acceso", label: t("nav.access") },
    { href: "/perfil", label: t("nav.profile") },
  ];

  return (
    <header className="border-border bg-bg/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          href={onboarded ? "/aprender" : "/onboarding"}
          className="inline-flex min-h-10 items-center rounded-md"
          aria-label="Inicio"
        >
          <Logo compact />
        </Link>

        {onboarded ? (
          <nav aria-label="Aplicación" className="hidden items-center gap-1 xl:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted hover:bg-surface-2 hover:text-text inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm"
              >
                {l.label}
              </Link>
            ))}
            {isAdmin ? (
              <Link
                href="/admin"
                className="text-muted hover:bg-surface-2 hover:text-text inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm"
              >
                <ShieldCheck aria-hidden="true" className="mr-1 inline size-4" />
                {t("nav.admin")}
                {attentionBadge}
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
          <SignOutForm label={t("signOut")} />
        </div>
      </div>
      {onboarded ? (
        <nav aria-label="Aplicación (móvil)" className="border-border border-t xl:hidden">
          <div className="container-page flex gap-1 overflow-x-auto py-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hover:bg-surface-2 inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm whitespace-nowrap"
              >
                {l.label}
              </Link>
            ))}
            {isAdmin ? (
              <Link
                href="/admin"
                className="hover:bg-surface-2 inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm whitespace-nowrap"
              >
                <ShieldCheck aria-hidden="true" className="mr-1 inline size-4" />
                {t("nav.admin")}
                {attentionBadge}
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
