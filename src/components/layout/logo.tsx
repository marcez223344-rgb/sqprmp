import { brand } from "@/config/brand";
import { cn } from "@/lib/utils/cn";

/** Wordmark rendered as text + geometric mark so it works without image assets (P-2). */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("font-heading inline-flex items-center gap-2 font-bold", className)}>
      <span
        aria-hidden="true"
        className="bg-primary text-primary-fg grid size-8 grid-cols-2 gap-0.5 rounded-md p-1.5"
      >
        <span className="rounded-[2px] bg-current opacity-90" />
        <span className="rounded-[2px] bg-current opacity-50" />
        <span className="rounded-[2px] bg-current opacity-50" />
        <span className="bg-accent rounded-[2px]" />
      </span>
      <span className="text-lg tracking-tight">
        {compact ? brand.shortName : brand.productName}
      </span>
    </span>
  );
}
