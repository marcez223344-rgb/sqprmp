"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flag, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { limits } from "@/config/limits";
import { reportExerciseProblemAction } from "@/lib/reports/actions";
import type { z } from "zod";
import { REPORT_CATEGORIES, reportFormSchema, type ReportFormValues } from "@/lib/reports/schemas";

type FormInput = z.input<typeof reportFormSchema>;

/**
 * «Reportar un problema con este ejercicio» (D-42): a private note to the instructor with the
 * exercise and whatever is in the editor. Nothing here is public.
 *
 * Native `<dialog>` + `showModal()`, like the admin ReasonDialog: the browser supplies the focus
 * trap, the top layer and Escape. Closing always goes through `close()`, which returns focus to
 * the trigger; the success line is announced next to it, because the dialog is gone by then.
 */
export function ReportProblem({ exerciseId, sql }: { exerciseId: string; sql: string }) {
  const t = useTranslations("workspace.report");
  const uid = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const form = useForm<FormInput, unknown, ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: { note: "" },
  });
  const errors = form.formState.errors;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const errorText = (code?: string) => {
    if (!code) return undefined;
    if (code === "note_too_short")
      return t("errors.note_too_short", { min: limits.exerciseReport.noteMinLength });
    if (code === "note_too_long")
      return t("errors.note_too_long", { max: limits.exerciseReport.noteMaxLength });
    if (code === "category_required") return t("errors.category_required");
    return t("errors.validation");
  };

  // Built inside the event handler: the callback closes the dialog, which touches the trigger ref.
  const send = (values: ReportFormValues) => {
    setServerError(null);
    startTransition(async () => {
      const r = await reportExerciseProblemAction({ ...values, exerciseId, sql });
      if (r.ok) {
        form.reset();
        setSent(true);
        close();
        return;
      }
      if (r.error === "validation" && r.fieldErrors) {
        for (const [field, code] of Object.entries(r.fieldErrors)) {
          if (field === "category" || field === "note")
            form.setError(field, { message: code }, { shouldFocus: true });
        }
        if (!r.fieldErrors.category && !r.fieldErrors.note) setServerError(t("errors.validation"));
        return;
      }
      setServerError(t(`errors.${r.error}`));
    });
  };

  const trimmedSql = sql.trim();
  const sqlNotice = !trimmedSql
    ? t("sqlEmpty")
    : trimmedSql.length > limits.exerciseReport.sqlMaxChars
      ? t("sqlTruncated", { max: limits.exerciseReport.sqlMaxChars })
      : t("sqlIncluded");

  const categoryError = errorText(errors.category?.message);
  const noteError = errorText(errors.note?.message);
  const noteId = `${uid}-note`;
  const noteDescribedBy = [`${noteId}-hint`, noteError ? `${noteId}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setSent(false);
          setServerError(null);
          setOpen(true);
        }}
      >
        <Flag aria-hidden="true" />
        {t("open")}
      </Button>
      <p role="status" className="text-muted text-sm">
        {sent ? t("success") : ""}
      </p>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${uid}-title`}
        aria-describedby={`${uid}-intro`}
        className="bg-surface text-text border-border m-auto w-[min(34rem,calc(100vw-2rem))] rounded-lg border p-6 backdrop:bg-black/50"
        onCancel={(event) => {
          // Escape: one exit path, so focus always returns to the trigger.
          event.preventDefault();
          if (!pending) close();
        }}
      >
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => void form.handleSubmit(send)(event)}
        >
          <div className="space-y-1">
            <h2 id={`${uid}-title`} className="font-heading text-lg font-semibold">
              {t("title")}
            </h2>
            <p id={`${uid}-intro`} className="text-muted text-sm">
              {t("intro")}
            </p>
          </div>

          <fieldset
            className="space-y-1"
            aria-describedby={categoryError ? `${uid}-category-error` : undefined}
            aria-invalid={categoryError ? true : undefined}
          >
            <legend className="mb-1 text-sm font-medium">{t("categoryLegend")}</legend>
            {REPORT_CATEGORIES.map((c) => (
              <label
                key={c}
                className="hover:bg-surface-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm"
              >
                <input
                  type="radio"
                  value={c}
                  className="accent-primary size-4 shrink-0"
                  {...form.register("category")}
                />
                {t(`categories.${c}`)}
              </label>
            ))}
            {categoryError ? (
              <p id={`${uid}-category-error`} role="alert" className="text-danger text-sm">
                {categoryError}
              </p>
            ) : null}
          </fieldset>

          <div className="space-y-1.5" data-invalid={noteError ? "true" : undefined}>
            <label htmlFor={noteId} className="block text-sm font-medium">
              {t("noteLabel")}
            </label>
            <textarea
              id={noteId}
              className="input min-h-28 py-2"
              maxLength={limits.exerciseReport.noteMaxLength}
              aria-describedby={noteDescribedBy}
              aria-invalid={noteError ? true : undefined}
              {...form.register("note")}
            />
            <p id={`${noteId}-hint`} className="text-muted text-sm">
              {t("noteHint", {
                min: limits.exerciseReport.noteMinLength,
                max: limits.exerciseReport.noteMaxLength,
              })}
            </p>
            {noteError ? (
              <p id={`${noteId}-error`} role="alert" className="text-danger text-sm">
                {noteError}
              </p>
            ) : null}
          </div>

          <p className="text-muted text-sm">{sqlNotice}</p>

          {serverError ? (
            <p
              role="alert"
              className="border-danger/45 bg-danger/10 rounded-md border px-3 py-2 text-sm"
            >
              {serverError}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 aria-hidden="true" className="motion-safe:animate-spin" /> : null}
              {pending ? t("sending") : t("submit")}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
