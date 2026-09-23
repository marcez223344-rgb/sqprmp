import type { Route } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Link out of the workspace. It always opens a new tab: following an in-page link used to leave
 * the exercise and the query the learner was writing behind (owner feedback, 2026-09-23). The
 * icon is decorative; the fact that a new tab opens is stated in text for every user.
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
