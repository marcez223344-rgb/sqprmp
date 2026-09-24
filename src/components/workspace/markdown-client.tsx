"use client";

import { useTranslations } from "next-intl";

import { Markdown } from "@/components/learn/markdown";
import { cn } from "@/lib/utils/cn";

/**
 * Client-side Markdown for content that arrives from server actions (scenarios, hints, solutions,
 * quiz prompts).
 *
 * It used to be a second, poorer renderer: a bare `ReactMarkdown`, so an exercise scenario showed
 * uncoloured code and none of the authored blocks, while the same Markdown in a lesson body got
 * the full treatment. `Markdown` and every block component it renders are pure and hook-free, so
 * it works unchanged inside this `"use client"` boundary — there is no reason for two renderers.
 */
export function MarkdownClient({
  children,
  className,
}: {
  children: string;
  /** Overrides the default density, e.g. the business question reads one step larger. */
  className?: string;
}) {
  const t = useTranslations("lesson.block");
  return (
    <Markdown
      className={cn("prose-dm text-sm", className)}
      labels={{
        objectives: t("objectives"),
        keyIdea: t("keyIdea"),
        wrong: t("wrong"),
        right: t("right"),
        result: t("result"),
        diagram: t("diagram"),
      }}
    >
      {children}
    </Markdown>
  );
}
