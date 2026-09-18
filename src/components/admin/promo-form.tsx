"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { createPromoCodeAction } from "@/lib/admin/actions";

export function PromoForm() {
  const t = useTranslations("admin.promos.form");
  const router = useRouter();
  const [kind, setKind] = useState<"scholarship" | "discount">("scholarship");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        startTransition(async () => {
          const r = await createPromoCodeAction(data);
          setMessage(r.ok ? t("done") : t(`errors.${r.error}` as "errors.unknown"));
          if (r.ok) {
            form.reset();
            router.refresh();
          }
        });
      }}
    >
      <Field id="promo-code" label={t("code")} hint={t("codeHint")}>
        <input
          id="promo-code"
          name="code"
          className="input font-mono uppercase"
          required
          minLength={4}
          maxLength={40}
          pattern="[A-Za-z0-9-]+"
        />
      </Field>
      <Field id="promo-kind" label={t("kind")}>
        <select
          id="promo-kind"
          name="kind"
          className="input"
          value={kind}
          onChange={(e) => setKind(e.target.value as "scholarship" | "discount")}
        >
          <option value="scholarship">{t("kinds.scholarship")}</option>
          <option value="discount">{t("kinds.discount")}</option>
        </select>
      </Field>
      {kind === "scholarship" ? (
        <Field id="promo-days" label={t("accessDays")} hint={t("accessDaysHint")}>
          <input
            id="promo-days"
            name="accessDays"
            type="number"
            className="input"
            min={1}
            max={3650}
            required
          />
        </Field>
      ) : (
        <Field id="promo-discount" label={t("discountPercent")}>
          <input
            id="promo-discount"
            name="discountPercent"
            type="number"
            className="input"
            min={1}
            max={100}
            required
          />
        </Field>
      )}
      <Field id="promo-max" label={t("maxRedemptions")} hint={t("maxHint")}>
        <input id="promo-max" name="maxRedemptions" type="number" className="input" min={1} />
      </Field>
      <Field id="promo-expires" label={t("expiresAt")} hint={t("expiresHint")}>
        <input id="promo-expires" name="expiresAt" type="date" className="input" />
      </Field>
      <Field id="promo-note" label={t("note")}>
        <input id="promo-note" name="note" className="input" maxLength={300} />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={pending}>
          {t("submit")}
        </Button>
        {message ? (
          <p role="status" className="text-sm">
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
