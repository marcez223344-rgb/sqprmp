import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_STYLES, SectionHeader, type SectionHeaderProps } from "./section-header";

export interface CalloutProps extends Omit<SectionHeaderProps, "className" | "wrapper"> {
  children?: ReactNode;
  className?: string;
  /**
   * Id given to the label (title when present, otherwise the eyebrow) and used as
   * `aria-labelledby`. Without it the block stays an unnamed generic container, which is the
   * right default for a decorative callout.
   */
  labelId?: string;
  /** Verdicts announce themselves; nothing else in this component needs a live region. */
  live?: boolean;
}

/**
 * A labelled, tinted block: `SectionHeader` plus content, with exactly one surface change
 * (tint + border, never a tint and a shadow). Categories come from the closed vocabulary in
 * `section-header.tsx`; no call site passes its own colours.
 */
export function Callout({
  children,
  className,
  labelId,
  live,
  category = "neutral",
  headingProps,
  eyebrowProps,
  as,
  title,
  eyebrow,
  ...rest
}: CalloutProps) {
  const labelOnTitle = Boolean(labelId && title);
  return (
    <section
      aria-labelledby={labelId}
      {...(live ? ({ role: "status", "aria-live": "polite" } as const) : {})}
      className={cn("rounded-md border p-4", CATEGORY_STYLES[category].surface, className)}
    >
      <SectionHeader
        {...rest}
        category={category}
        as={as}
        title={title}
        eyebrow={eyebrow}
        headingProps={labelOnTitle ? { id: labelId, ...headingProps } : headingProps}
        eyebrowProps={!labelOnTitle && labelId ? { id: labelId, ...eyebrowProps } : eyebrowProps}
        className={children ? undefined : "mb-0"}
      />
      {children}
    </section>
  );
}
