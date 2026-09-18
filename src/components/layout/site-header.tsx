"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/curriculo", key: "curriculum" },
  { href: "/como-funciona", key: "howItWorks" },
  { href: "/precios", key: "pricing" },
  { href: "/nosotros", key: "about" },
  { href: "/preguntas-frecuentes", key: "faq" },
] as const;

export function SiteHeader() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <header
      className="border-border bg-bg/80 sticky top-0 z-40 border-b backdrop-blur"
      onKeyDown={(e) => {
        // Escape closes the disclosure and returns focus to its trigger (keyboard parity).
        if (e.key === "Escape" && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="inline-flex min-h-10 items-center rounded-md" aria-label="Inicio">
          <Logo />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-muted hover:bg-surface-2 hover:text-text inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm"
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/ingresar"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden sm:inline-flex",
            )}
          >
            {t("login")}
          </Link>
          <Link
            href="/ingresar"
            className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
          >
            {t("startFree")}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            ref={trigger}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? tc("closeMenu") : tc("openMenu")}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
      </div>

      <div id="mobile-nav" hidden={!open} className="border-border bg-bg border-t lg:hidden">
        <nav aria-label="Principal (móvil)" className="container-page flex flex-col gap-1 py-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="hover:bg-surface-2 rounded-md px-3 py-3 text-base"
            >
              {t(l.key)}
            </Link>
          ))}
          <Link
            href="/ingresar"
            onClick={() => setOpen(false)}
            className={cn(buttonVariants(), "mt-2")}
          >
            {t("startFree")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
