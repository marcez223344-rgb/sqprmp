import "server-only";
import { cache } from "react";
import { limits } from "@/config/limits";
import { hasStartedLearning } from "@/lib/progress/start-state";
import { activityDateFor, levelProgress, streakStatus } from "@/lib/rewards/rules";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export interface DashboardData {
  xpTotal: number;
  coins: number;
  level: ReturnType<typeof levelProgress>;
  streak: ReturnType<typeof streakStatus> & { longest: number; freezesAvailable: number };
  today: { date: string; xp: number; target: number };
  week: { minutes: number; target: number; xp: number };
  freeUsed: number;
  freeLimit: number;
  /** Titles of the sections whose exercises never consume the free allowance (limits.ts). */
  freeSectionTitles: string[];
  exercisesCompleted: number;
  /** False only on a first-ever visit: nothing opened, nothing solved. */
  hasStarted: boolean;
  badges: {
    slug: string;
    title: string;
    description: string;
    icon: string;
    earned_at: string | null;
  }[];
  continueTarget: {
    kind: "exercise" | "lesson";
    slug: string;
    title: string;
    sectionTitle: string;
  } | null;
  mastery: {
    sectionSlug: string;
    sectionTitle: string;
    number: number;
    completed: number;
    total: number;
  }[];
  goals: { daily_xp_target: number; weekly_minutes_target: number; reminder_opt_in: boolean };
}

function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export const getDashboard = cache(async (profile: Profile): Promise<DashboardData> => {
  const supabase = await createClient();
  const today = activityDateFor(new Date(), profile.timezone);
  const monday = weekStart(today);

  const [
    totals,
    streak,
    activity,
    goals,
    freeUsed,
    badges,
    userBadges,
    progress,
    lessonProgress,
    sections,
    lessons,
  ] = await Promise.all([
    supabase.from("user_totals").select("*").eq("user_id", profile.id).maybeSingle(),
    supabase.from("streaks").select("*").eq("user_id", profile.id).maybeSingle(),
    supabase
      .from("daily_activity")
      .select("activity_date, xp_earned, minutes_active")
      .eq("user_id", profile.id)
      .gte("activity_date", monday),
    supabase.from("learning_goals").select("*").eq("user_id", profile.id).maybeSingle(),
    supabase.rpc("free_exercises_used", { p_user_id: profile.id }),
    supabase
      .from("badges")
      .select("slug, title, description, icon, id")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", profile.id),
    supabase
      .from("exercise_progress")
      .select("exercise_id, status, last_activity_at")
      .eq("user_id", profile.id)
      .order("last_activity_at", { ascending: false }),
    supabase
      .from("lesson_progress")
      .select("lesson_id, status, last_viewed_at")
      .eq("user_id", profile.id)
      .order("last_viewed_at", { ascending: false })
      .limit(1),
    supabase.from("sections").select("id, slug, number, title, is_published").order("number"),
    supabase
      .from("lessons_public")
      .select("id, slug, title, kind, section_id, ref_slug, is_published, sort_order"),
  ]);

  const earned = new Map((userBadges.data ?? []).map((b) => [b.badge_id, b.earned_at]));
  const xpTotal = totals.data?.xp_total ?? 0;
  const todayRow = (activity.data ?? []).find((a) => a.activity_date === today);
  // What `minutes_active` actually measures, so the label can say it honestly (owner feedback
  // item 27: "clearly practised more than 33 minutes"). `touch_daily_activity` now fires on every
  // kind of practice that leaves a server-side trace — opening a lesson, marking one complete,
  // the editor autosave, an exercise submission and the quiz actions — and each call adds
  // min(5, minutes since the previous call). The cap is deliberate: a long gap between two actions
  // counts as five minutes, not as the gap, so a tab left open overnight adds nothing. What still
  // escapes the count is time with no round trip at all: running a query in the browser engine, or
  // reading without navigating. So this remains a floor on time practised, not a stopwatch — but a
  // close enough one for the label to say "minutos de práctica".
  const weekMinutes = (activity.data ?? []).reduce((a, r) => a + r.minutes_active, 0);
  const weekXp = (activity.data ?? []).reduce((a, r) => a + r.xp_earned, 0);
  const goalRow = goals.data ?? {
    daily_xp_target: 50,
    weekly_minutes_target: profile.weekly_goal_minutes ?? 120,
    reminder_opt_in: false,
  };

  // Mastery per published section with exercises.
  const exerciseLessons = (lessons.data ?? []).filter(
    (l) => (l.kind === "exercise" || l.kind === "challenge") && l.is_published,
  );
  const completedExerciseSlugs = new Set(
    (progress.data ?? []).filter((p) => p.status === "completed").map((p) => p.exercise_id),
  );
  // exercise_progress keys by exercise id, lessons expose ref_slug; map via exercises_public.
  const { data: exercises } = await supabase
    .from("exercises_public")
    .select("id, slug, title, section_id")
    .eq("is_published", true);
  const exerciseById = new Map((exercises ?? []).map((e) => [e.id as string, e]));
  const mastery = (sections.data ?? [])
    .filter((s) => s.is_published)
    .map((s) => {
      const total = (exercises ?? []).filter((e) => e.section_id === s.id).length;
      const completed = (exercises ?? []).filter(
        (e) => e.section_id === s.id && completedExerciseSlugs.has(e.id as string),
      ).length;
      return { sectionSlug: s.slug, sectionTitle: s.title, number: s.number, completed, total };
    })
    .filter((m) => m.total > 0);

  // Continue: latest in-progress exercise; else next unfinished exercise lesson; else latest lesson.
  let continueTarget: DashboardData["continueTarget"] = null;
  const latestInProgress = (progress.data ?? []).find((p) => p.status !== "completed");
  if (latestInProgress) {
    const e = exerciseById.get(latestInProgress.exercise_id);
    const section = (sections.data ?? []).find((s) => s.id === e?.section_id);
    if (e?.slug)
      continueTarget = {
        kind: "exercise",
        slug: e.slug,
        title: e.title ?? "",
        sectionTitle: section?.title ?? "",
      };
  }
  if (!continueTarget) {
    const nextExercise = exerciseLessons
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .find((l) => {
        const e = (exercises ?? []).find((x) => x.slug === l.ref_slug);
        return e && !completedExerciseSlugs.has(e.id as string);
      });
    if (nextExercise?.ref_slug) {
      const section = (sections.data ?? []).find((s) => s.id === nextExercise.section_id);
      continueTarget = {
        kind: "exercise",
        slug: nextExercise.ref_slug,
        title: nextExercise.title ?? "",
        sectionTitle: section?.title ?? "",
      };
    }
  }
  if (!continueTarget) {
    const last = lessonProgress.data?.[0];
    const lesson = (lessons.data ?? []).find((l) => l.id === last?.lesson_id);
    const section = (sections.data ?? []).find((s) => s.id === lesson?.section_id);
    if (lesson?.slug)
      continueTarget = {
        kind: "lesson",
        slug: lesson.slug,
        title: lesson.title ?? "",
        sectionTitle: section?.title ?? "",
      };
  }

  return {
    xpTotal,
    coins: totals.data?.coin_balance ?? 0,
    level: levelProgress(xpTotal),
    streak: {
      ...streakStatus(
        {
          current_length: streak.data?.current_length ?? 0,
          last_activity_date: streak.data?.last_activity_date ?? null,
          freezes_available: streak.data?.freezes_available ?? 0,
        },
        today,
      ),
      longest: streak.data?.longest_length ?? 0,
      freezesAvailable: streak.data?.freezes_available ?? 1,
    },
    today: { date: today, xp: todayRow?.xp_earned ?? 0, target: goalRow.daily_xp_target },
    week: { minutes: weekMinutes, target: goalRow.weekly_minutes_target, xp: weekXp },
    freeUsed: typeof freeUsed.data === "number" ? freeUsed.data : 0,
    freeLimit: limits.freeExerciseLimit,
    // The counter alone reads as a bug next to a larger "exercises completed" number; naming the
    // always-free sections is what makes the two numbers agree (owner feedback, 2026-09-23).
    freeSectionTitles: limits.freeExerciseSections.flatMap((slug) => {
      const s = (sections.data ?? []).find((x) => x.slug === slug && x.is_published);
      return s ? [s.title] : [];
    }),
    exercisesCompleted: completedExerciseSlugs.size,
    hasStarted: hasStartedLearning({
      exerciseProgressCount: (progress.data ?? []).length,
      lessonProgressCount: (lessonProgress.data ?? []).length,
      exercisesCompleted: completedExerciseSlugs.size,
    }),
    badges: (badges.data ?? []).map((b) => ({
      slug: b.slug,
      title: b.title,
      description: b.description,
      icon: b.icon,
      earned_at: earned.get(b.id) ?? null,
    })),
    continueTarget,
    mastery,
    goals: {
      daily_xp_target: goalRow.daily_xp_target,
      weekly_minutes_target: goalRow.weekly_minutes_target,
      reminder_opt_in: goalRow.reminder_opt_in,
    },
  };
});
