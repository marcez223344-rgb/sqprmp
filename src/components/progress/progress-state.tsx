import { Check, Lock, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The one progress-state vocabulary of the product (docs/DESIGN_SYSTEM.md §5c).
 *
 * Why it exists: `/ruta` used to tell «Completada», «En curso» and «Sin empezar» apart with three
 * circular glyphs (`CheckCircle2`, `PlayCircle`, `Circle`) plus three inks whose greyscale values
 * are 98, 95 and 99 out of 255 — a contrast of 1.02:1 to 1.07:1 *between the states*. Desaturated,
 * the three states were the same colour, and the only surviving difference was a 3 px mark inside
 * an identical circle, repeated 347 times down the page (owner feedback item 28).
 *
 * Two rules replace it:
 *
 * 1. **Ink is never the channel; the amount of ink is.** The marker goes filled → ringed → empty →
 *    dashed as the state goes completed → in progress → not started → soon. That ladder is a
 *    luminance ladder, so it survives greyscale and every form of colour blindness; the hue only
 *    confirms what the shape already said.
 * 2. **The states are not equal, and the design is not symmetric.** «En curso» is what the learner
 *    is hunting for down a long list, so it is the only row that gets a filled background, a bold
 *    title and a visible word. «Completada» keeps a marker and a thin rail and nothing else —
 *    reassurance, not competition. «Sin empezar» spends no ink at all: an empty marker on a
 *    transparent rail. At 347 repetitions the quiet states have to cost nothing, or the one row
 *    that matters drowns in them.
 */
export type ProgressState = "completed" | "in_progress" | "not_started" | "locked" | "soon";

interface ProgressStateStyle {
  /** Small marker (dense lesson rows, section checklists). Square, 18 px. */
  markerSm: string;
  /** Large marker (section cards). 40 px; carries the section number unless it is `completed`. */
  markerLg: string;
  /** Left rail for a dense row: the vertical lane the eye runs down. */
  rail: string;
  /** Card edge for a section card: rail weight + border. */
  card: string;
  /** Status chip on a section card. */
  chip: string;
  /** Glyph drawn inside the marker instead of a number, when the state has one. */
  glyph: LucideIcon | null;
  /** True when the state is loud enough to also deserve a bold title and a visible label. */
  emphasised: boolean;
}

/**
 * Inks: `--color-bg` is the knockout on the filled `success-ink` marker (5.74:1 in light, 8.97:1 in
 * dark — white would drop to 2.1:1 on the dark-theme green). The `in_progress` tint stays at 10/14 %
 * for the same reason as `CATEGORY_STYLES`: above that, `--color-muted` on the tint breaks 4.5:1.
 */
export const PROGRESS_STATE_STYLES: Record<ProgressState, ProgressStateStyle> = {
  completed: {
    markerSm: "bg-success-ink text-bg border-success-ink",
    markerLg: "bg-success-ink text-bg border-success-ink",
    rail: "border-l-2 border-l-success-ink",
    card: "border-border bg-surface border-l-2 border-l-success-ink",
    chip: "border-success-ink/35 text-success-ink",
    glyph: Check,
    emphasised: false,
  },
  in_progress: {
    markerSm: "border-2 border-primary bg-surface text-primary",
    markerLg: "border-2 border-primary bg-primary/10 dark:bg-primary/14 text-primary",
    rail: "border-l-2 border-l-primary bg-primary/8 dark:bg-primary/12",
    card: "border-primary/50 bg-surface border-l-4 border-l-primary",
    chip: "border-primary/45 bg-primary/10 dark:bg-primary/14 text-primary font-semibold",
    glyph: null,
    emphasised: true,
  },
  not_started: {
    markerSm: "border border-border bg-surface-2 text-muted",
    markerLg: "border border-border bg-surface-2 text-muted",
    rail: "border-l-2 border-l-transparent",
    card: "border-border bg-surface",
    chip: "border-border bg-surface-2 text-muted",
    glyph: null,
    emphasised: false,
  },
  locked: {
    markerSm: "border border-dashed border-border bg-surface-2 text-muted",
    markerLg: "border border-dashed border-border bg-surface-2 text-muted",
    rail: "border-l-2 border-l-border border-dashed",
    card: "border-border border-dashed bg-surface",
    chip: "border-border border-dashed bg-surface text-muted",
    glyph: Lock,
    emphasised: false,
  },
  soon: {
    markerSm: "border border-dashed border-border bg-surface text-muted",
    markerLg: "border border-dashed border-border bg-surface text-muted",
    rail: "border-l-2 border-l-border border-dashed",
    card: "border-border border-dashed bg-surface",
    chip: "border-border border-dashed bg-surface text-muted",
    glyph: null,
    emphasised: false,
  },
};

/**
 * The marker. `label` is always rendered (`sr-only` unless the call site prints it too), because a
 * shape is only half of "never colour alone" — the other half is a word a screen reader can read.
 *
 * `in_progress` is drawn as a ring with a solid centre rather than a glyph: at 18 px a play triangle
 * and a check mark inside the same circle are the collision this component exists to remove.
 */
export function ProgressMarker({
  state,
  label,
  number,
  size = "sm",
  className,
}: {
  state: ProgressState;
  label: string;
  /** Printed by the large marker for every state except `completed`, which shows its check. */
  number?: number;
  size?: "sm" | "lg";
  className?: string;
}) {
  const style = PROGRESS_STATE_STYLES[state];
  const Glyph = style.glyph;
  const lg = size === "lg";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        lg ? "size-10 text-sm font-bold" : "size-4.5",
        lg ? style.markerLg : style.markerSm,
        className,
      )}
    >
      {Glyph ? (
        <Glyph
          aria-hidden="true"
          className={lg ? "size-5" : "size-2.5"}
          strokeWidth={lg ? 2.5 : 3.25}
        />
      ) : state === "in_progress" ? (
        lg ? (
          number
        ) : (
          <span aria-hidden="true" className="bg-primary size-1.5 rounded-full" />
        )
      ) : lg ? (
        number
      ) : null}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Status chip for a section card. The word carries the meaning; the icon only confirms it. */
export function ProgressChip({
  state,
  label,
  icon: Icon,
  className,
}: {
  state: ProgressState;
  label: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        PROGRESS_STATE_STYLES[state].chip,
        className,
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
      {label}
    </span>
  );
}

/** Left rail for a dense row (lesson rows, certificate section checklists). */
export function progressRailClasses(state: ProgressState): string {
  return PROGRESS_STATE_STYLES[state].rail;
}
