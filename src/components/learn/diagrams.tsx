import type { ReactElement } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Lesson diagrams (`docs/DESIGN_SYSTEM.md` §6b).
 *
 * Three rules hold for every entry in the registry:
 *
 * 1. **The visual is `aria-hidden`.** The accessible content of a diagram is the text alternative
 *    the author writes inside the fence, which `Markdown` renders as a visible `<figcaption>`.
 *    That way the explanation is there for everyone — screen-reader users, people who find the
 *    picture ambiguous, and anyone reading on a 360 px phone — and nothing is announced twice.
 * 2. **No meaning by colour alone.** Every distinction is also carried by border style, fill,
 *    position or an ordinal, so the figure survives greyscale.
 * 3. **No text inside an SVG.** Anything with words is composed in HTML so it reflows, stays
 *    selectable and keeps its contrast at any zoom level. SVG is used only where the meaning is
 *    genuinely geometric.
 *
 * The visual language is the brand's own (`DESIGN_SYSTEM.md` §1): grids, rows and result tables,
 * in the semantic tokens. No mascots, no clip art, no gradients.
 */

const cell = "px-2 py-1 text-left font-mono text-xs whitespace-nowrap";
const miniTable = "border-border bg-surface w-full border-collapse rounded-md border text-xs";
const miniCaption = "text-muted mb-1.5 font-mono text-[0.7rem] tracking-wide";

function MiniTable({
  name,
  columns,
  rows,
}: {
  name: string;
  columns: string[];
  rows: { cells: string[]; muted?: boolean; highlight?: boolean }[];
}) {
  return (
    <div className="min-w-0">
      <p className={miniCaption}>{name}</p>
      <table className={miniTable}>
        <thead>
          <tr className="bg-surface-2">
            {columns.map((c) => (
              <th key={c} className={cn(cell, "text-muted font-semibold")}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn(
                "border-border border-t",
                // Rows that drop out are marked by border style and ink, never by colour alone.
                row.muted && "[&>td]:text-muted border-dashed [&>td]:border-dashed [&>td]:italic",
                row.highlight && "bg-primary/10 dark:bg-primary/14",
              )}
            >
              {row.cells.map((value, j) => (
                <td key={j} className={cell}>
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Arrow() {
  return (
    <div className="text-muted flex items-center justify-center py-1 font-mono text-lg sm:py-0">
      <span className="sm:hidden">↓</span>
      <span className="hidden sm:inline">→</span>
    </div>
  );
}

/** `FROM → WHERE → … → LIMIT`, with the steps named in `emphasis` ringed. */
function ExecutionOrder({ emphasis }: { emphasis: string[] }) {
  const steps = [
    "FROM",
    "WHERE",
    "GROUP BY",
    "HAVING",
    "OVER",
    "SELECT",
    "ORDER BY",
    "LIMIT",
  ] as const;
  return (
    <ol className="flex flex-wrap items-stretch gap-1.5">
      {steps.map((step, i) => {
        const strong = emphasis.includes(step.toLowerCase().replace(/\s+/g, "-"));
        return (
          <li
            key={step}
            className={cn(
              "border-border bg-surface flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-xs",
              strong && "border-primary/45 bg-primary/10 dark:bg-primary/14 ring-primary/30 ring-1",
            )}
          >
            <span
              className={cn(
                "bg-surface-2 text-muted flex size-4.5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold",
                strong && "bg-primary text-primary-fg",
              )}
            >
              {i + 1}
            </span>
            <span className={cn(strong ? "text-primary font-semibold" : "text-text")}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}

function InnerJoinShape() {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1.3fr] sm:items-center">
      <MiniTable
        name="products"
        columns={["id", "seller_id"]}
        rows={[
          { cells: ["101", "4"] },
          { cells: ["102", "7"] },
          { cells: ["103", "99"], muted: true },
        ]}
      />
      <Arrow />
      <MiniTable
        name="sellers"
        columns={["id", "store_name"]}
        rows={[
          { cells: ["4", "Andes"] },
          { cells: ["7", "Ribera"] },
          { cells: ["12", "Pampa"], muted: true },
        ]}
      />
      <Arrow />
      <MiniTable
        name="INNER JOIN"
        columns={["p.id", "s.store_name"]}
        rows={[
          { cells: ["101", "Andes"], highlight: true },
          { cells: ["102", "Ribera"], highlight: true },
        ]}
      />
    </div>
  );
}

function GroupByVsWindow() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="border-border bg-surface-2 space-y-2 rounded-md border p-3">
        <p className="text-muted font-mono text-[0.7rem]">GROUP BY kind</p>
        <MiniTable
          name="entra"
          columns={["kind", "amount"]}
          rows={[
            { cells: ["qr", "120"] },
            { cells: ["qr", "80"] },
            { cells: ["card", "300"] },
            { cells: ["card", "100"] },
          ]}
        />
        <Arrow />
        <MiniTable
          name="sale (2 filas)"
          columns={["kind", "avg"]}
          rows={[
            { cells: ["qr", "100"], highlight: true },
            { cells: ["card", "200"], highlight: true },
          ]}
        />
      </div>
      <div className="border-border bg-surface-2 space-y-2 rounded-md border p-3">
        <p className="text-muted font-mono text-[0.7rem]">avg(amount) OVER (PARTITION BY kind)</p>
        <MiniTable
          name="entra"
          columns={["kind", "amount"]}
          rows={[
            { cells: ["qr", "120"] },
            { cells: ["qr", "80"] },
            { cells: ["card", "300"] },
            { cells: ["card", "100"] },
          ]}
        />
        <Arrow />
        <MiniTable
          name="sale (4 filas)"
          columns={["kind", "amount", "avg"]}
          rows={[
            { cells: ["qr", "120", "100"], highlight: true },
            { cells: ["qr", "80", "100"], highlight: true },
            { cells: ["card", "300", "200"], highlight: true },
            { cells: ["card", "100", "200"], highlight: true },
          ]}
        />
      </div>
    </div>
  );
}

/**
 * The one genuinely geometric figure: eight ordered rows, a bracket over the ones inside the frame
 * and a marker on the current row. Text-free on purpose (see rule 3 above).
 */
function WindowFrame() {
  const rows = Array.from({ length: 8 }, (_, i) => i);
  const current = 4;
  const y = (i: number) => 18 + i * 22;
  return (
    <svg
      viewBox="0 0 320 210"
      className="mx-auto h-auto w-full max-w-md"
      aria-hidden="true"
      focusable="false"
    >
      {/* Bracket over the frame: from the first row to the current row. */}
      <path
        d={`M 30 ${y(0) - 4} H 18 V ${y(current) + 18} H 30`}
        className="stroke-primary fill-none"
        strokeWidth="2"
      />
      <path
        d={`M 14 ${(y(0) + y(current) + 14) / 2} h -8`}
        className="stroke-primary"
        strokeWidth="2"
      />
      {rows.map((i) => (
        <g key={i}>
          <rect
            x="38"
            y={y(i)}
            width={i <= current ? 190 : 150}
            height="14"
            rx="3"
            className={
              i <= current
                ? "fill-primary/70 stroke-primary"
                : "fill-surface-2 stroke-muted [stroke-dasharray:3_3]"
            }
            strokeWidth="1.5"
          />
          {i === current ? (
            <>
              <rect
                x="34"
                y={y(i) - 4}
                width="198"
                height="22"
                rx="5"
                className="stroke-accent-ink fill-none"
                strokeWidth="2"
              />
              <path
                d={`M 248 ${y(i) + 7} h 22 m -8 -6 l 8 6 l -8 6`}
                className="stroke-accent-ink fill-none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="282"
                cy={y(i) + 7}
                r="9"
                className="fill-accent-ink/25 stroke-accent-ink"
                strokeWidth="2"
              />
            </>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

export type DiagramRenderer = (argument: string | null) => ReactElement;

export const LESSON_DIAGRAMS: Record<string, DiagramRenderer> = {
  "orden-de-ejecucion": (argument) => (
    <ExecutionOrder emphasis={argument ? argument.split(",").map((s) => s.trim()) : []} />
  ),
  "inner-join": () => <InnerJoinShape />,
  "agrupar-vs-ventana": () => <GroupByVsWindow />,
  "marco-de-ventana": () => <WindowFrame />,
};

export const diagramNames = Object.keys(LESSON_DIAGRAMS);
