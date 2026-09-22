import { Bike, Database, Music4, Store, Wallet, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { getDatasetIdentity, type DatasetAccent, type DatasetIconName } from "@/config/datasets";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<DatasetIconName, LucideIcon> = {
  store: Store,
  wallet: Wallet,
  delivery: Bike,
  music: Music4,
};

/**
 * Static class strings per accent: Tailwind only sees classes it can find in the source,
 * so these cannot be built by interpolation.
 */
const ACCENT: Record<DatasetAccent, { text: string; chip: string }> = {
  marketplace: {
    text: "text-dataset-marketplace",
    chip: "text-dataset-marketplace bg-dataset-marketplace/10 border-dataset-marketplace/30",
  },
  fintech: {
    text: "text-dataset-fintech",
    chip: "text-dataset-fintech bg-dataset-fintech/10 border-dataset-fintech/30",
  },
  delivery: {
    text: "text-dataset-delivery",
    chip: "text-dataset-delivery bg-dataset-delivery/10 border-dataset-delivery/30",
  },
  music: {
    text: "text-dataset-music",
    chip: "text-dataset-music bg-dataset-music/10 border-dataset-music/30",
  },
};

const NEUTRAL = { text: "text-muted", chip: "text-muted bg-surface-2 border-border" };

/**
 * Consistent marker for a practice dataset: lucide icon + accent + name.
 * `chip` shows the domain too (exercise header); `inline` is for dense places (schema panel).
 */
export function DatasetBadge({
  slug,
  title,
  variant = "chip",
  className,
}: {
  slug: string;
  title: string;
  variant?: "chip" | "inline";
  className?: string;
}) {
  const t = useTranslations("datasets");
  const identity = getDatasetIdentity(slug);
  const Icon = identity ? ICONS[identity.icon] : Database;
  const styles = identity ? ACCENT[identity.accent] : NEUTRAL;
  const domain = identity ? t(`domain.${identity.domainKey}` as never) : null;

  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", className)}>
        <Icon aria-hidden="true" className={cn("size-4 shrink-0", styles.text)} />
        <span className="sr-only">{t("label")}: </span>
        {title}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        styles.chip,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="sr-only">{t("label")}: </span>
      {title}
      {domain ? (
        <>
          <span aria-hidden="true">·</span>
          <span>{domain}</span>
        </>
      ) : null}
    </span>
  );
}
