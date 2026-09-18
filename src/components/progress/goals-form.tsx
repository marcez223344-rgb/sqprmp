"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { updateGoalsAction } from "@/lib/progress/actions";

const dailyOptions = [25, 50, 100, 200];
const weeklyOptions = [60, 120, 180, 300];

export function GoalsForm({
  goals,
}: {
  goals: { daily_xp_target: number; weekly_minutes_target: number; reminder_opt_in: boolean };
}) {
  const t = useTranslations("dashboard.goals");
  const [open, setOpen] = useState(false);
  const [daily, setDaily] = useState(goals.daily_xp_target);
  const [weekly, setWeekly] = useState(goals.weekly_minutes_target);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {t("edit")}
      </Button>
    );
  }
  return (
    <form
      className="space-y-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await updateGoalsAction({
            daily_xp_target: daily,
            weekly_minutes_target: weekly,
            reminder_opt_in: goals.reminder_opt_in,
          });
          setStatus(r.ok ? t("saved") : t("error"));
          if (r.ok) setOpen(false);
        });
      }}
    >
      <label className="block">
        <span className="mb-1 block font-medium">{t("dailyLabel")}</span>
        <select className="input" value={daily} onChange={(e) => setDaily(Number(e.target.value))}>
          {dailyOptions.map((v) => (
            <option key={v} value={v}>
              {v} XP
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block font-medium">{t("weeklyLabel")}</span>
        <select
          className="input"
          value={weekly}
          onChange={(e) => setWeekly(Number(e.target.value))}
        >
          {weeklyOptions.map((v) => (
            <option key={v} value={v}>
              {v} min
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t("save")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
        <span role="status" className="text-muted text-xs">
          {status}
        </span>
      </div>
    </form>
  );
}
