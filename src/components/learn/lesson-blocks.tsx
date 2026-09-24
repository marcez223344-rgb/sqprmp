import { Check, Key, SquareTerminal, Workflow } from "lucide-react";
import type { ReactNode } from "react";
import { Callout } from "@/components/ui/callout";
import { CATEGORY_STYLES, SectionHeader } from "@/components/ui/section-header";
import { cn } from "@/lib/utils/cn";
import { SqlCode } from "./sql-highlight";

/**
 * The authored blocks of a theory lesson (`docs/DESIGN_SYSTEM.md` §5b). Each one is a
 * `SectionHeader` / `Callout` composition — the closed category vocabulary is the palette, and no
 * block here invents a colour of its own.
 *
 * All labels arrive as props from `Markdown`, which defaults them to `LESSON_BLOCK_LABELS`.
 */

/** The single code-block shell: a well with a 2 px left rail and an optional caption below. */
export function CodeFigure({
  code,
  caption,
  variant = "plain",
  label,
}: {
  code: string;
  caption?: string;
  variant?: "plain" | "wrong" | "right";
  label?: string;
}) {
  const rail = {
    plain: "border-l-primary/40",
    // Wrong/right differ in three channels at once: the word in `label`, the icon, and the rail
    // (dashed vs solid). Colour is the fourth, never the only one.
    wrong: "border-l-warning-ink border-l-4 [border-left-style:dashed]",
    right: "border-l-success-ink border-l-4",
  }[variant];
  return (
    <figure className="my-5">
      {label ? (
        <SectionHeader
          category={variant === "wrong" ? "pitfall" : "verify"}
          eyebrow={label}
          className="mb-2"
        />
      ) : null}
      <pre className={cn("border-l-2", rail)}>
        <code>
          <SqlCode code={code} />
        </code>
      </pre>
      {caption ? (
        <figcaption className="text-muted mt-2 flex items-start gap-2 text-sm">
          <SquareTerminal aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{caption}</span>
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * The pull-quote of the lesson: the one sentence a learner should leave with. `concept` surface
 * (the lesson's own hue) plus a 4 px rail and a larger type size — the emphasis is typographic,
 * so it survives greyscale and never competes with the section headers for a new colour.
 */
export function KeyIdea({ label, children }: { label: string; children: ReactNode }) {
  return (
    <aside
      className={cn(
        "border-l-info my-6 rounded-md border border-l-4 p-4",
        CATEGORY_STYLES.concept.surface,
      )}
    >
      <SectionHeader category="concept" icon={Key} eyebrow={label} className="mb-2" />
      <div className="text-lg leading-snug font-medium">{children}</div>
    </aside>
  );
}

/**
 * The lesson opener: what the learner will be able to do. `goal` — `--color-achievement`, the hue
 * the product already uses for levels and the «nivel» badge family, so "what you will achieve"
 * looks the same wherever it appears.
 *
 * It used to be `why` (`--color-accent-ink`), inherited from the small «Por qué importa» aside
 * because the icon fitted. Blown up to a full-width panel at the top of every lesson, a warm
 * terracotta block with red-ish check marks read as a warning — the exact opposite of a promise
 * (owner feedback, 2026-09-24). Warm hues are reserved for things that need care.
 */
export function Objectives({ label, items }: { label: string; items: ReactNode[] }) {
  return (
    <Callout category="goal" eyebrow={label} className="mt-0 mb-8">
      <ul className="mt-1 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <Check aria-hidden="true" className="text-achievement mt-1 size-4 shrink-0" />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </Callout>
  );
}

/**
 * An inline result table: what the query actually returns, shown as a table instead of described
 * in prose. Same shape as the workspace result panel (`schema` category), so the two agree.
 */
export function ResultTable({
  label,
  caption,
  header,
  rows,
}: {
  label: string;
  caption?: string;
  header: string[];
  rows: string[][];
}) {
  return (
    <figure className="border-border bg-surface-2 my-5 overflow-hidden rounded-md border">
      <div className="px-4 pt-3">
        <SectionHeader
          category="schema"
          eyebrow={label}
          aside={caption ? <span className="text-muted text-xs">{caption}</span> : undefined}
          containerClassName="bg-surface"
          className="mb-2"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[0.8125rem]">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-border bg-surface border-y">
              {header.map((cell) => (
                <th
                  key={cell}
                  scope="col"
                  className="text-muted px-3 py-1.5 text-left font-semibold whitespace-nowrap"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-border border-b last:border-b-0">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-1.5 whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/**
 * A diagram plus its text alternative. The picture is `aria-hidden`; the authored caption is a
 * real, visible `<figcaption>` and is the accessible content of the figure.
 */
export function DiagramFigure({
  label,
  caption,
  children,
}: {
  label: string;
  caption: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="border-border bg-surface my-6 rounded-md border p-4">
      <SectionHeader
        category="schema"
        icon={Workflow}
        eyebrow={label}
        containerClassName="bg-surface-2"
      />
      <div aria-hidden="true" className="overflow-x-auto py-1">
        {children}
      </div>
      <figcaption className="text-muted border-border mt-3 border-t pt-3 text-sm">
        {caption}
      </figcaption>
    </figure>
  );
}
