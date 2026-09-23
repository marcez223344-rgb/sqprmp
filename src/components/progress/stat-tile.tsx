import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Stat tiles and meters for the dashboard (docs/DESIGN_SYSTEM.md §5).
 *
 * Two rules make this a system instead of decoration:
 *
 * 1. **Hue is assigned by meaning, never per card.** A tile takes the hue of the family its number
 *    belongs to — level → `achievement` (the same token as the «nivel» badge family), XP and
 *    exercises → `primary`, streak → `warm` (`accent-ink`, the only genuinely time-sensitive
 *    number), mastery → `success`. A number with nothing to progress toward is `neutral`.
 * 2. **A meter is only shown when a real threshold exists.** Levels and goals have one; total XP
 *    and coins do not, and inventing a full bar for them would be a lie the learner can feel.
 *    A meter never appears without its text equivalent.
 */
export type StatTone = "achievement" | "primary" | "warm" | "success" | "neutral";

interface ToneStyle {
  /** Icon ink; ≥ 5.3:1 on `--color-surface` in both themes. */
  ink: string;
  /** 32 px icon container, same grammar as `SectionHeader`. */
  container: string;
  /** Meter fill; ≥ 4.7:1 against the `surface-2` track in both themes. */
  fill: string;
}

const TONES: Record<StatTone, ToneStyle> = {
  achievement: {
    ink: "text-achievement",
    container: "border-achievement/30 bg-achievement/10 dark:bg-achievement/14",
    fill: "bg-achievement",
  },
  primary: {
    ink: "text-primary",
    container: "border-primary/30 bg-primary/10 dark:bg-primary/14",
    fill: "bg-primary",
  },
  warm: {
    ink: "text-accent-ink",
    container: "border-accent-ink/30 bg-accent-ink/10 dark:bg-accent-ink/14",
    fill: "bg-accent-ink",
  },
  success: {
    ink: "text-success-ink",
    container: "border-success-ink/30 bg-success-ink/10 dark:bg-success-ink/14",
    fill: "bg-success-ink",
  },
  neutral: {
    ink: "text-muted",
    container: "border-border bg-surface-2",
    fill: "bg-muted",
  },
};

export function Meter({
  label,
  percent,
  valueText,
  tone = "primary",
  className,
}: {
  /** Accessible name; the visible equivalent is the caption next to the meter. */
  label: string;
  percent: number;
  /** Spoken value, e.g. «59 XP para el nivel 3» — never just a percentage. */
  valueText?: string;
  tone?: StatTone;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={valueText}
      aria-label={label}
      className={cn(
        "bg-surface-2 border-border/60 h-2 w-full overflow-hidden rounded-full border",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full", TONES[tone].fill)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  caption,
  meter,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: StatTone;
  /** The text a bare number is missing: the distance to the next threshold. */
  caption?: ReactNode;
  meter?: ReactNode;
}) {
  const style = TONES[tone];
  return (
    <div className="border-border bg-surface flex flex-col gap-2 rounded-lg border p-4">
      <dt className="text-muted flex items-center gap-2 text-sm">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md border",
            style.container,
            style.ink,
          )}
        >
          <Icon className="size-4.5" strokeWidth={1.75} />
        </span>
        {label}
      </dt>
      <dd className="space-y-1.5">
        <p className="font-heading text-3xl leading-none font-bold">{value}</p>
        {meter}
        {caption ? <p className="text-muted text-xs">{caption}</p> : null}
      </dd>
    </div>
  );
}
