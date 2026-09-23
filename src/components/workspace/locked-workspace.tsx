"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ClipboardList, Lock, SquareTerminal } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/utils/cn";
import { MarkdownClient } from "./markdown-client";

const SqlEditor = dynamic(() => import("./sql-editor").then((m) => m.SqlEditor), {
  ssr: false,
  loading: () => (
    <div className="border-border bg-surface-2 h-48 animate-pulse rounded-md border" />
  ),
});

const EMPTY_SCHEMA: Record<string, string[]> = {};
const NOOP = () => undefined;

/**
 * What a learner without access sees.
 *
 * The previous version showed a one-line card and no editor at all, which read as a broken page:
 * "I could enter the exercise but I could not type" (owner feedback, 2026-09-23). The scenario
 * stays visible as a fair preview, and the editor stays visible but explicitly locked, so the
 * reason is where the learner is looking.
 */
export function LockedWorkspace({
  scenarioMd,
  businessQuestionMd,
  freeLimit,
}: {
  scenarioMd: string;
  businessQuestionMd: string;
  freeLimit: number;
}) {
  const t = useTranslations("workspace");
  return (
    <div className="space-y-6">
      <section
        aria-labelledby="paywall-title"
        className="border-primary/45 bg-primary/10 dark:bg-primary/14 space-y-4 rounded-lg border-2 p-6"
      >
        <SectionHeader
          category="example"
          icon={Lock}
          eyebrow={t("locked.eyebrow")}
          as="h2"
          title={t("locked.title", { limit: freeLimit })}
          headingProps={{ id: "paywall-title" }}
          titleClassName="text-2xl"
          containerClassName="bg-surface"
        />
        <p className="max-w-prose">{t("locked.body")}</p>
        <p className="text-muted max-w-prose text-sm">{t("locked.freeSections")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/precios" className={cn(buttonVariants())}>
            {t("locked.cta")}
          </Link>
          <Link href="/ruta" className={cn(buttonVariants({ variant: "ghost" }))}>
            {t("locked.secondaryCta")}
          </Link>
        </div>
      </section>

      {/* Same three-rank chrome as the unlocked workspace, so the preview is recognisably the task. */}
      <section
        aria-labelledby="preview-title"
        className="border-border bg-surface ring-primary/20 space-y-3 rounded-lg border p-5 shadow-sm ring-1 ring-inset"
      >
        <SectionHeader
          as="h2"
          icon={ClipboardList}
          eyebrow={t("locked.previewTitle")}
          title={t("scenario")}
          headingProps={{ id: "preview-title" }}
          titleClassName="text-xl"
        />
        <MarkdownClient>{scenarioMd}</MarkdownClient>
        <SectionHeader as="h3" eyebrow={t("businessQuestion")} className="mt-4 mb-1" />
        <MarkdownClient className="text-base font-medium">{businessQuestionMd}</MarkdownClient>
      </section>

      <section
        aria-labelledby="locked-editor-title"
        className="border-border bg-surface space-y-3 rounded-lg border p-5 shadow-sm"
      >
        <SectionHeader
          as="h2"
          icon={SquareTerminal}
          title={t("editorTitle")}
          headingProps={{ id: "locked-editor-title" }}
        />
        <div
          role="group"
          aria-disabled="true"
          aria-labelledby="locked-editor-title"
          className="relative"
        >
          {/* Decorative: the real message is in the overlay, so the editor itself is hidden from
              assistive technology and cannot be reached with the keyboard. A scrim dims it instead
              of `opacity`, which would also dim the message on top of it. */}
          <div aria-hidden="true" className="pointer-events-none select-none">
            <SqlEditor
              value=""
              onChange={NOOP}
              onRun={NOOP}
              onSubmit={NOOP}
              schema={EMPTY_SCHEMA}
              ariaLabel={t("editorAria")}
              placeholderText={t("editorPlaceholder")}
              disabled
            />
          </div>
          <div aria-hidden="true" className="bg-surface/80 absolute inset-0 rounded-md" />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <p className="border-border bg-surface inline-flex max-w-sm items-center gap-2 rounded-md border px-4 py-3 text-center text-sm shadow-sm">
              <Lock aria-hidden="true" className="size-4 shrink-0" />
              {t("locked.editorDisabled")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
