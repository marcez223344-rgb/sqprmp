"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { markLessonViewed } from "@/lib/curriculum/actions";

export function CompleteLessonButton({ slug, completed }: { slug: string; completed: boolean }) {
  const t = useTranslations("lesson");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(completed);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <p role="status" className="text-success-ink inline-flex items-center gap-2 text-sm">
        <CheckCircle2 aria-hidden="true" className="size-5" />
        {t("completed")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await markLessonViewed(slug, true);
            if (result.ok) setDone(true);
            else setError(t("completeError"));
          })
        }
      >
        {pending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <CheckCircle2 aria-hidden="true" />
        )}
        {t("markComplete")}
      </Button>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
