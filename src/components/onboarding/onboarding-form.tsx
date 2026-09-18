"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { countries } from "@/config/countries";
import { limits } from "@/config/limits";
import { checkAlias, completeOnboarding } from "@/lib/profile/actions";
import {
  aliasSchema,
  genders,
  mainGoals,
  onboardingSchema,
  sqlLevels,
  weeklyGoals,
  type OnboardingInput,
  type OnboardingValues,
} from "@/lib/profile/schemas";
import { cn } from "@/lib/utils/cn";

interface AvatarOption {
  id: string;
  slug: string;
  image_path: string;
  alt_text: string;
}

interface Props {
  avatars: AvatarOption[];
  next: string;
  defaults: { display_name: string };
}

type Step = 0 | 1 | 2;
const stepFields: Record<Step, (keyof OnboardingValues)[]> = {
  0: ["display_name", "alias", "avatar_id"],
  1: ["country", "birth_date", "gender", "sql_level", "main_goal", "weekly_goal_minutes"],
  2: ["accept_terms", "accept_privacy"],
};

type AliasState = "idle" | "checking" | "available" | "taken" | "invalid";

export function OnboardingForm({ avatars, next, defaults }: Props) {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const [step, setStep] = useState<Step>(0);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [aliasCheck, setAliasCheck] = useState<{ alias: string; available: boolean } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const form = useForm<OnboardingInput, unknown, OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    mode: "onTouched",
    defaultValues: {
      display_name: defaults.display_name,
      alias: "",
      avatar_id: avatars[0]?.id ?? "",
      country: "AR",
      birth_date: "",
      gender: "",
      sql_level: "beginner",
      main_goal: "first_job",
      weekly_goal_minutes: 120,
      accept_terms: undefined,
      accept_privacy: undefined,
    },
  });

  const alias = useWatch({ control: form.control, name: "alias" });

  const aliasValid = Boolean(alias) && aliasSchema.safeParse(alias).success;
  const aliasState: AliasState = !alias
    ? "idle"
    : !aliasValid
      ? "invalid"
      : aliasCheck?.alias !== alias
        ? "checking"
        : aliasCheck.available
          ? "available"
          : "taken";

  // Debounced server-side availability check (rate-limited on the server).
  useEffect(() => {
    if (!aliasValid) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      const result = await checkAlias(alias);
      if (cancelled) return;
      // A limiter/network error leaves the state as "checking"; the server re-validates on submit.
      if (result.ok) setAliasCheck({ alias, available: Boolean(result.data?.available) });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [alias, aliasValid]);

  async function goNext() {
    const valid = await form.trigger(stepFields[step]);
    if (!valid) return;
    if (step === 0 && aliasState === "taken") {
      form.setError("alias", { message: "alias_taken" });
      return;
    }
    setStep((s) => Math.min(2, s + 1) as Step);
    queueMicrotask(() => headingRef.current?.focus());
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1) as Step);
    queueMicrotask(() => headingRef.current?.focus());
  }

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await completeOnboarding(values, next);
      if (!result) return; // redirected
      if (!result.ok) {
        if (result.fieldErrors) {
          for (const [field, message] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof OnboardingInput, { message });
          }
          const firstField = Object.keys(result.fieldErrors)[0] as
            keyof OnboardingValues | undefined;
          const targetStep = (Object.keys(stepFields) as unknown as Step[]).find((s) =>
            stepFields[Number(s) as Step].includes(firstField as keyof OnboardingValues),
          );
          if (targetStep !== undefined) setStep(Number(targetStep) as Step);
        }
        setServerError(result.error === "validation" ? null : t("errors.generic"));
      }
    });
  });

  const errors = form.formState.errors;
  const errorText = (key?: string) =>
    key
      ? t.has(`errors.${key}` as never)
        ? t(`errors.${key}` as never)
        : t("errors.invalid")
      : undefined;
  const steps = [t("steps.identity"), t("steps.about"), t("steps.consent")];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <ol className="flex gap-2" aria-label={t("progressLabel")}>
        {steps.map((label, i) => (
          <li key={label} className="flex-1" aria-current={i === step ? "step" : undefined}>
            <div className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-surface-2")} />
            <span className={cn("mt-2 block text-xs", i === step ? "text-text" : "text-muted")}>
              {i + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      <h2 ref={headingRef} tabIndex={-1} className="text-2xl outline-none">
        {steps[step]}
      </h2>

      {step === 0 ? (
        <fieldset className="space-y-6">
          <legend className="sr-only">{steps[0]}</legend>
          <Field
            id="display_name"
            label={t("fields.displayName")}
            hint={t("hints.displayName")}
            error={errorText(errors.display_name?.message)}
          >
            <input
              id="display_name"
              className="input"
              maxLength={limits.profile.displayNameMaxLength}
              autoComplete="name"
              {...form.register("display_name")}
            />
          </Field>

          <Field
            id="alias"
            label={t("fields.alias")}
            hint={t("hints.alias", { min: limits.alias.minLength, max: limits.alias.maxLength })}
            error={
              errorText(errors.alias?.message) ??
              (aliasState === "taken" ? t("errors.alias_taken") : undefined)
            }
          >
            <div className="relative">
              <span
                aria-hidden="true"
                className="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              >
                @
              </span>
              <input
                id="alias"
                className="input pl-8"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="alias-status"
                {...form.register("alias")}
              />
              <span
                id="alias-status"
                role="status"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-sm"
              >
                {aliasState === "checking" ? (
                  <Loader2
                    aria-label={t("aliasStatus.checking")}
                    className="text-muted size-4 animate-spin"
                  />
                ) : aliasState === "available" ? (
                  <span className="text-success inline-flex items-center gap-1">
                    <Check className="size-4" aria-hidden="true" />
                    {t("aliasStatus.available")}
                  </span>
                ) : aliasState === "taken" ? (
                  <span className="text-danger inline-flex items-center gap-1">
                    <X className="size-4" aria-hidden="true" />
                    {t("aliasStatus.taken")}
                  </span>
                ) : null}
              </span>
            </div>
          </Field>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("fields.avatar")}</legend>
            <p className="text-muted mb-3 text-sm">{t("hints.avatar")}</p>
            <div
              role="radiogroup"
              aria-label={t("fields.avatar")}
              className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8"
            >
              {avatars.map((a) => (
                <label key={a.id} className="cursor-pointer">
                  <input
                    type="radio"
                    value={a.id}
                    className="peer sr-only"
                    {...form.register("avatar_id")}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG assets, no optimization needed */}
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
            {errors.avatar_id ? (
              <p className="text-danger mt-2 text-sm" role="alert">
                {errorText(errors.avatar_id.message)}
              </p>
            ) : null}
          </fieldset>
        </fieldset>
      ) : null}

      {step === 1 ? (
        <fieldset className="space-y-6">
          <legend className="sr-only">{steps[1]}</legend>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              id="country"
              label={t("fields.country")}
              error={errorText(errors.country?.message)}
            >
              <select
                id="country"
                className="input"
                autoComplete="country"
                {...form.register("country")}
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="birth_date"
              label={t("fields.birthDate")}
              hint={t("hints.birthDate", { age: limits.profile.minAge })}
              error={errorText(errors.birth_date?.message)}
            >
              <input
                id="birth_date"
                type="date"
                className="input"
                autoComplete="bday"
                {...form.register("birth_date")}
              />
            </Field>
          </div>

          <Field
            id="gender"
            label={t("fields.gender")}
            hint={t("hints.gender")}
            error={errorText(errors.gender?.message)}
          >
            <select id="gender" className="input" {...form.register("gender")}>
              <option value="">{t("options.gender.unset")}</option>
              {genders.map((g) => (
                <option key={g} value={g}>
                  {t(`options.gender.${g}`)}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="sql_level"
            label={t("fields.sqlLevel")}
            error={errorText(errors.sql_level?.message)}
          >
            <select id="sql_level" className="input" {...form.register("sql_level")}>
              {sqlLevels.map((l) => (
                <option key={l} value={l}>
                  {t(`options.sqlLevel.${l}`)}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="main_goal"
            label={t("fields.mainGoal")}
            error={errorText(errors.main_goal?.message)}
          >
            <select id="main_goal" className="input" {...form.register("main_goal")}>
              {mainGoals.map((g) => (
                <option key={g} value={g}>
                  {t(`options.mainGoal.${g}`)}
                </option>
              ))}
            </select>
          </Field>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("fields.weeklyGoal")}</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {weeklyGoals.map((m) => (
                <label
                  key={m}
                  className="border-border has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-ring flex cursor-pointer items-center justify-center rounded-md border px-3 py-3 text-sm has-focus-visible:ring-2"
                >
                  <input
                    type="radio"
                    value={m}
                    className="sr-only"
                    {...form.register("weekly_goal_minutes")}
                  />
                  {t("options.weeklyGoal", { minutes: m })}
                </label>
              ))}
            </div>
          </fieldset>
        </fieldset>
      ) : null}

      {step === 2 ? (
        <fieldset className="space-y-6">
          <legend className="sr-only">{steps[2]}</legend>
          <div className="border-border bg-surface text-muted rounded-md border p-4 text-sm">
            <h3 className="text-text mb-2 font-medium">{t("privacy.title")}</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>{t("privacy.email")}</li>
              <li>{t("privacy.birthDate")}</li>
              <li>{t("privacy.country")}</li>
              <li>{t("privacy.gender")}</li>
              <li>{t("privacy.rights")}</li>
            </ul>
          </div>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 size-4"
              aria-describedby={errors.accept_terms ? "terms-error" : undefined}
              {...form.register("accept_terms")}
            />
            <span className="text-sm">
              {t.rich("consent.terms", {
                link: (chunks) => (
                  <a href="/terminos" target="_blank" rel="noreferrer" className="underline">
                    {chunks}
                  </a>
                ),
              })}
            </span>
          </label>
          {errors.accept_terms ? (
            <p id="terms-error" role="alert" className="text-danger text-sm">
              {t("errors.consent_required")}
            </p>
          ) : null}
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 size-4" {...form.register("accept_privacy")} />
            <span className="text-sm">
              {t.rich("consent.privacy", {
                link: (chunks) => (
                  <a href="/privacidad" target="_blank" rel="noreferrer" className="underline">
                    {chunks}
                  </a>
                ),
              })}
            </span>
          </label>
          {errors.accept_privacy ? (
            <p role="alert" className="text-danger text-sm">
              {t("errors.consent_required")}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {serverError ? (
        <p
          role="alert"
          className="border-danger/40 bg-danger/10 rounded-md border px-4 py-3 text-sm"
        >
          {serverError}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0 || pending}>
          {tc("back")}
        </Button>
        {step < 2 ? (
          <Button type="button" onClick={goNext} disabled={aliasState === "checking" && step === 0}>
            {tc("next")}
          </Button>
        ) : (
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {t("submit")}
          </Button>
        )}
      </div>
    </form>
  );
}
