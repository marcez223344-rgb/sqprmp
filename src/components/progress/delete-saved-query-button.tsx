"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { deleteSavedQueryAction } from "@/lib/progress/actions";

export function DeleteSavedQueryButton({ id }: { id: string }) {
  const t = useTranslations("savedQueries");
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(async () => void (await deleteSavedQueryAction(id)))}
    >
      <Trash2 aria-hidden="true" />
      {t("delete")}
    </Button>
  );
}
