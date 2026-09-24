import {
  BookOpen,
  CheckCheck,
  Flag,
  CircleCheck,
  CircleX,
  Lightbulb,
  ListChecks,
  SquareTerminal,
  Table2,
  Target,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The one section-header pattern of the product: a monochrome lucide icon in a fixed 32 px
 * container, an uppercase eyebrow in the category ink, and an optional real heading.
 *
 * The vocabulary is closed on purpose (docs/DESIGN_SYSTEM.md §5, review 2026-09-23): call sites
 * pick a category, never their own colour classes, so every eyebrow on every screen sits on the
 * same vertical line and one hue always means one thing.
 */
export const sectionCategories = [
  "why",
  "goal",
  "concept",
  "schema",
  "example",
  "pitfall",
  "verify",
  "summary",
  "feedback-correct",
  "feedback-incorrect",
  "hint",
  "neutral",
] as const;

export type SectionCategory = (typeof sectionCategories)[number];

interface CategoryStyle {
  /** `null` for `neutral`: the caller may pass an icon, or the header renders without one. */
  icon: LucideIcon | null;
  /** Ink for the eyebrow and the icon; ≥ 4.5:1 as text on its own tint in both themes. */
  ink: string;
  /** Icon container: tint + border. Holds no text, so tier/alpha stacking is safe here. */
  container: string;
  /** Surface for a `Callout` of this category: the block's single surface change. */
  surface: string;
}

/**
 * **Pick a category by meaning, never by appearance.** Warm and alert hues — `--color-accent-ink`
 * (`why`), `--color-warning-ink` (`pitfall`, `hint`), `--color-danger` (`feedback-incorrect`) — are
 * reserved for the things that ask the reader to be careful. Anything that describes achievement,
 * progress or a promise to the learner must not use them: the «Al terminar vas a poder» block was
 * built on `why` because the `Target` icon fitted, and a full-width terracotta panel at the top of
 * every lesson read as a warning (owner feedback, 2026-09-24). That block is now `goal`.
 *
 * Tints are 10 % in light and 14 % in dark, the cap at which `--color-muted` still passes 4.5:1
 * over the tint. `feedback-*` are the only pair allowed a 45 % border plus a tint — a verdict is
 * the one place in the product that may raise its voice. The danger tint stays at 8 % in light
 * because `--color-danger` over its own 10 % tint measures 4.48:1 (8 % measures 4.62:1).
 */
export const CATEGORY_STYLES: Record<SectionCategory, CategoryStyle> = {
  why: {
    icon: Target,
    ink: "text-accent-ink",
    container: "border-accent-ink/30 bg-accent-ink/10 dark:bg-accent-ink/14",
    surface: "border-accent-ink/30 bg-accent-ink/10 dark:bg-accent-ink/14",
  },
  goal: {
    icon: Flag,
    ink: "text-achievement",
    container: "border-achievement/30 bg-achievement/10 dark:bg-achievement/14",
    surface: "border-achievement/30 bg-achievement/10 dark:bg-achievement/14",
  },
  concept: {
    icon: BookOpen,
    ink: "text-info",
    container: "border-info/30 bg-info/10 dark:bg-info/14",
    surface: "border-info/30 bg-info/10 dark:bg-info/14",
  },
  schema: {
    icon: Table2,
    ink: "text-text",
    container: "border-border bg-surface-2",
    surface: "border-border bg-surface-2",
  },
  example: {
    icon: SquareTerminal,
    ink: "text-primary",
    container: "border-primary/30 bg-primary/10 dark:bg-primary/14",
    surface: "border-primary/30 bg-primary/10 dark:bg-primary/14",
  },
  pitfall: {
    icon: TriangleAlert,
    ink: "text-warning-ink",
    container: "border-warning/45 bg-warning/10 dark:bg-warning/14",
    surface: "border-warning/45 bg-warning/10 dark:bg-warning/14",
  },
  verify: {
    icon: CheckCheck,
    ink: "text-success-ink",
    container: "border-success-ink/30 bg-success-ink/10 dark:bg-success-ink/14",
    surface: "border-success-ink/30 bg-success-ink/10 dark:bg-success-ink/14",
  },
  summary: {
    icon: ListChecks,
    ink: "text-text",
    container: "border-border bg-surface-2",
    surface: "border-border bg-surface-2",
  },
  "feedback-correct": {
    icon: CircleCheck,
    ink: "text-success-ink",
    container: "border-success-ink/45 bg-success-ink/10 dark:bg-success-ink/14",
    surface: "border-success-ink/45 bg-success-ink/10 dark:bg-success-ink/14",
  },
  "feedback-incorrect": {
    icon: CircleX,
    ink: "text-danger",
    container: "border-danger/45 bg-danger/8 dark:bg-danger/14",
    surface: "border-danger/45 bg-danger/8 dark:bg-danger/14",
  },
  hint: {
    icon: Lightbulb,
    ink: "text-warning-ink",
    container: "border-border bg-surface-2",
    surface: "border-border bg-surface-2",
  },
  neutral: {
    icon: null,
    ink: "text-muted",
    container: "border-border bg-surface-2",
    surface: "border-border bg-surface-2",
  },
};

export interface SectionHeaderProps {
  category?: SectionCategory;
  /** Overrides the category icon (only `neutral` has none of its own). */
  icon?: LucideIcon;
  /** Uppercase label. It — not the icon — carries the meaning. */
  eyebrow?: ReactNode;
  /**
   * Rendered as a real heading when `as` is given. When there is no title, the eyebrow itself
   * becomes the heading, so an eyebrow-only panel still appears in the outline (three workspace
   * panels used to be `<p>` elements pretending to be headings).
   */
  title?: ReactNode;
  as?: "h2" | "h3" | "h4";
  /** Extra props for the heading element (id, ref, tabIndex when focus must land on it). */
  headingProps?: ComponentPropsWithRef<"h2">;
  /** Props for the eyebrow element (id, for `aria-labelledby`). */
  eyebrowProps?: ComponentPropsWithRef<"p">;
  /** Right-aligned meta: engine status, row counts, dataset marker, counters. */
  aside?: ReactNode;
  className?: string;
  titleClassName?: string;
  /** Override the icon container surface — a well already on `surface-2` needs `bg-surface`. */
  containerClassName?: string;
  /** `header` by default; `div` where a grouping element would be noise (prose headings). */
  wrapper?: "header" | "div";
}

export function SectionHeader({
  category = "neutral",
  icon,
  eyebrow,
  title,
  as,
  headingProps,
  eyebrowProps,
  aside,
  className,
  titleClassName,
  containerClassName,
  wrapper = "header",
}: SectionHeaderProps) {
  const style = CATEGORY_STYLES[category];
  const Icon = icon ?? style.icon;
  const Heading = as;
  const Wrapper = wrapper;
  const eyebrowIsHeading = !title;
  // The only place uppercase is allowed in the product.
  const eyebrowClasses = "text-xs font-semibold tracking-[0.06em] uppercase";
  return (
    <Wrapper className={cn("mb-3 flex flex-wrap items-start gap-3", className)}>
      {Icon ? (
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md border",
            style.container,
            style.ink,
            containerClassName,
          )}
        >
          <Icon className="size-4.5" strokeWidth={1.75} />
        </span>
      ) : null}
      <div className="min-w-0">
        {eyebrow ? (
          eyebrowIsHeading && Heading ? (
            <Heading
              {...eyebrowProps}
              {...headingProps}
              className={cn(
                eyebrowClasses,
                style.ink,
                eyebrowProps?.className,
                headingProps?.className,
              )}
            >
              {eyebrow}
            </Heading>
          ) : (
            <p {...eyebrowProps} className={cn(eyebrowClasses, style.ink, eyebrowProps?.className)}>
              {eyebrow}
            </p>
          )
        ) : null}
        {Heading && title ? (
          <Heading
            {...headingProps}
            className={cn("font-heading text-lg leading-snug", titleClassName)}
          >
            {title}
          </Heading>
        ) : title ? (
          <p className={cn("font-heading text-lg leading-snug", titleClassName)}>{title}</p>
        ) : null}
      </div>
      {aside ? <div className="ml-auto shrink-0 text-right">{aside}</div> : null}
    </Wrapper>
  );
}
