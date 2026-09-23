"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { countries } from "@/config/countries";
import { limits } from "@/config/limits";
import { updateProfile } from "@/lib/profile/actions";
import {
  genders,
  mainGoals,
  profileUpdateSchema,
  sqlLevels,
  weeklyGoals,
  type ProfileUpdateInput,
  type ProfileUpdateValues,
} from "@/lib/profile/schemas";

interface AvatarOption {
  id: string;
  slug: string;
  image_path: string;
  alt_text: string;
}

export function ProfileForm({
  avatars,
  initial,
}: {
  avatars: AvatarOption[];
  initial: ProfileUpdateInput;
}) {
  const t = useTranslations("onboarding");
  const tp = useTranslations("profile");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const form = useForm<ProfileUpdateInput, unknown, ProfileUpdateValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: initial,
  });
  const errors = form.formState.errors;
  const errorText = (key?: string) =>
    key
      ? t.has(`errors.${key}` as never)
        ? t(`errors.${key}` as never)
        : t("errors.invalid")
      : undefined;

  const onSubmit = form.handleSubmit((values) => {
    setStatus("idle");
    startTransition(async () => {
      const result = await updateProfile(values);
      setStatus(result.ok ? "saved" : "error");
      if (result.ok) form.reset(values);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          id="display_name"
          label={t("fields.displayName")}
          error={errorText(errors.display_name?.message)}
        >
          <input
            id="display_name"
            className="input"
            maxLength={limits.profile.displayNameMaxLength}
            {...form.register("display_name")}
          />
        </Field>
        <Field
          id="certificate_name"
          label={tp("fields.certificateName")}
          hint={tp("hints.certificateName")}
          error={errorText(errors.certificate_name?.message)}
        >
          <input
            id="certificate_name"
            className="input"
            maxLength={80}
            {...form.register("certificate_name")}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("fields.avatar")}</legend>
        <div
          role="radiogroup"
          aria-label={t("fields.avatar")}
          className="border-border grid max-h-72 grid-cols-4 gap-3 overflow-y-auto rounded-md border p-3 sm:grid-cols-6 md:grid-cols-8"
        >
          {avatars.map((a) => (
            <label key={a.id} className="cursor-pointer">
              <input
                type="radio"
                value={a.id}
                className="peer sr-only"
                {...form.register("avatar_id")}
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG assets */}
              <img
                src={a.image_path}
                alt={a.alt_text}
                width={64}
                height={64}
                className="peer-checked:ring-primary peer-checked:ring-offset-bg peer-focus-visible:ring-ring size-full rounded-full ring-2 ring-transparent transition peer-checked:ring-offset-2 hover:opacity-90"
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="country" label={t("fields.country")} error={errorText(errors.country?.message)}>
          <select id="country" className="input" {...form.register("country")}>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="timezone"
          label={tp("fields.timezone")}
          hint={tp("hints.timezone")}
          error={errorText(errors.timezone?.message)}
        >
          <input id="timezone" className="input" list="timezones" {...form.register("timezone")} />
          <datalist id="timezones">
            {countries.map((c) => (
              <option key={c.code} value={c.timezone} />
            ))}
          </datalist>
        </Field>
        <Field id="gender" label={t("fields.gender")} hint={t("hints.gender")}>
          <select id="gender" className="input" {...form.register("gender")}>
            <option value="">{t("options.gender.unset")}</option>
            {genders.map((g) => (
              <option key={g} value={g}>
                {t(`options.gender.${g}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="sql_level" label={t("fields.sqlLevel")}>
          <select id="sql_level" className="input" {...form.register("sql_level")}>
            {sqlLevels.map((l) => (
              <option key={l} value={l}>
                {t(`options.sqlLevel.${l}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="main_goal" label={t("fields.mainGoal")}>
          <select id="main_goal" className="input" {...form.register("main_goal")}>
            {mainGoals.map((g) => (
              <option key={g} value={g}>
                {t(`options.mainGoal.${g}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="weekly_goal_minutes" label={t("fields.weeklyGoal")}>
          <select
            id="weekly_goal_minutes"
            className="input"
            {...form.register("weekly_goal_minutes")}
          >
            {weeklyGoals.map((m) => (
              <option key={m} value={m}>
                {t("options.weeklyGoal", { minutes: m })}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 size-4" {...form.register("leaderboard_opt_in")} />
        <span className="text-sm">
          <span className="block font-medium">{tp("fields.leaderboardOptIn")}</span>
          <span className="text-muted">{tp("hints.leaderboardOptIn")}</span>
        </span>
      </label>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending || !form.formState.isDirty}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {tp("save")}
        </Button>
        <p role="status" aria-live="polite" className="text-sm">
          {status === "saved" ? (
            <span className="text-success inline-flex items-center gap-1">
              <Check className="size-4" aria-hidden="true" />
              {tp("saved")}
            </span>
          ) : status === "error" ? (
            <span className="text-danger">{tp("saveError")}</span>
          ) : null}
        </p>
      </div>
    </form>
  );
}
