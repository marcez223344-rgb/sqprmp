import type { Route } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Reference link *out of* the exercise the learner is still working on (the related lesson). It
 * opens a new tab: following an in-page link used to leave
 * the exercise and the query the learner was writing behind (owner feedback, 2026-09-23). The
 * icon is decorative; the fact that a new tab opens is stated in text for every user.
 *
 * Links that *finish* the exercise ("Siguiente", "Volver a la ruta") use `WorkspaceExitLink`
 * instead: opening a tab per solved exercise buried the learner in windows (feedback 2026-09-24).
 */
export function ExternalLessonLink({
  href,
  children,
  newTabHint,
  className,
  icon,
}: {
  href: Route;
  children: ReactNode;
  /** Visible-to-assistive-tech text, e.g. "Se abre en una pestaña nueva". */
  newTabHint: string;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "text-primary inline-flex min-h-10 items-center gap-2 text-sm underline underline-offset-4",
        className,
      )}
    >
      {icon}
      <span>{children}</span>
      <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="sr-only">({newTabHint})</span>
    </Link>
  );
}

/**
 * Link that ends the exercise. Same tab: the learner is done here, the draft is autosaved, and
 * twenty tabs after twenty exercises is not a workspace.
 */
export function WorkspaceExitLink({
  href,
  children,
  className,
}: {
  href: Route;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-primary inline-flex min-h-10 items-center gap-2 text-sm underline underline-offset-4",
        className,
      )}
    >
      <span>{children}</span>
      <ArrowRight aria-hidden="true" className="size-3.5 shrink-0" />
    </Link>
  );
}
