"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Award, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { limits } from "@/config/limits";
import { issueCertificateAction } from "@/lib/certificates/actions";

const KNOWN_ERRORS = ["unauthorized", "validation", "not_eligible", "not_found"] as const;
type KnownError = (typeof KNOWN_ERRORS)[number];

export function IssueCertificateForm({
  requirementSlug,
  defaultName,
}: {
  requirementSlug: string;
  defaultName: string;
}) {
  const t = useTranslations("certificates.issue");
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const id = `recipient-${requirementSlug}`;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const r = await issueCertificateAction({ requirementSlug, recipientName: name });
          if (!r.ok) {
            const code = (KNOWN_ERRORS as readonly string[]).includes(r.error)
              ? (r.error as KnownError)
              : "unknown";
            setError(t(`errors.${code}`));
            return;
          }
          // A fresh issuance opens the congratulation on the same page; the server re-checks the
          // certificate before showing it, so the query parameter alone proves nothing.
          if (!r.alreadyIssued) {
            router.replace(
              `/certificados?emitido=${encodeURIComponent(requirementSlug)}` as Route,
              {
                scroll: false,
              },
            );
          }
        });
      }}
    >
      <Field id={id} label={t("nameLabel")} hint={t("nameHint")} error={error ?? undefined}>
        <input
          id={id}
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={limits.profile.displayNameMaxLength}
          minLength={3}
          required
          autoComplete="name"
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Award aria-hidden="true" />
        )}
        {t("submit")}
      </Button>
    </form>
  );
}
