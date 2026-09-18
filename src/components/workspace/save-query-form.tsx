"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { saveQueryAction } from "@/lib/exercises/actions";

export function SaveQueryForm({
  exerciseId,
  datasetSlug,
  sql,
}: {
  exerciseId: string;
  datasetSlug: string;
  sql: string;
}) {
  const t = useTranslations("workspace.savedQuery");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)} disabled={!sql.trim()}>
        <Bookmark aria-hidden="true" />
        {t("open")}
      </Button>
    );
  }
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await saveQueryAction(exerciseId, datasetSlug, title, sql);
          setStatus(r.ok ? t("saved") : t("error"));
          if (r.ok) {
            setOpen(false);
            setTitle("");
          }
        });
      }}
    >
      <label className="sr-only" htmlFor="saved-query-title">
        {t("titleLabel")}
      </label>
      <input
        id="saved-query-title"
        className="input h-9 w-56"
        maxLength={120}
        placeholder={t("titlePlaceholder")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <Button type="submit" size="sm" disabled={pending || !title.trim()}>
        {t("save")}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        {t("cancel")}
      </Button>
      <span role="status" className="text-muted text-xs">
        {status}
      </span>
    </form>
  );
}
