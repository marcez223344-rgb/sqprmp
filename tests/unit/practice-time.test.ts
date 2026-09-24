import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/types/database";

/**
 * Owner feedback item 27: the dashboard reported 33 minutes after a session that was plainly
 * longer. `daily_activity.minutes_active` is written only by `touch_daily_activity`, and that RPC
 * used to be called from graded submissions alone, so reading a lesson and writing SQL in the
 * editor were invisible to the metric.
 *
 * These tests pin both halves of the fix: the actions a learner takes while practising credit
 * activity, and the 5-minute gap cap they credit it with is still there — without the cap, an idle
 * tab would turn into hours of "practice" the moment the next action fired.
 */

/** Minimal thenable stand-in for a PostgREST query builder: every method chains. */
function query(result: unknown): unknown {
  const target = { then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res) };
  return new Proxy(target, {
    get(t, prop) {
      if (prop === "then") return t.then;
      return () => query(result);
    },
  });
}

const adminRpcCalls: { name: string; args: Record<string, unknown> }[] = [];
const serverRpcCalls: { name: string; args: Record<string, unknown> }[] = [];
let currentProfile: Profile | null = null;
let rpcError: unknown = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: (name: string, args: Record<string, unknown>) => {
      adminRpcCalls.push({ name, args });
      return query({ data: null, error: null });
    },
    from: () => query({ data: null, error: null }),
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: (name: string, args: Record<string, unknown>) => {
      serverRpcCalls.push({ name, args });
      return query({ data: null, error: rpcError });
    },
    from: () => query({ data: null, error: null }),
  }),
}));
vi.mock("@/lib/auth/session", () => ({
  getCurrentProfile: async () => currentProfile,
  getCurrentUser: async () => (currentProfile ? { id: currentProfile.id } : null),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const { markLessonViewed } = await import("@/lib/curriculum/actions");
const { saveDraftAction } = await import("@/lib/exercises/actions");

const PROFILE = {
  id: "22222222-2222-2222-2222-222222222222",
  timezone: "America/Argentina/Buenos_Aires",
} as Profile;
const EXERCISE = "11111111-1111-4111-8111-111111111111";

function activityTouches() {
  return adminRpcCalls.filter((c) => c.name === "touch_daily_activity");
}

beforeEach(() => {
  adminRpcCalls.length = 0;
  serverRpcCalls.length = 0;
  currentProfile = PROFILE;
  rpcError = null;
});

describe("practice time — what counts", () => {
  it("counts reading a lesson through to marking it complete", async () => {
    expect(await markLessonViewed("union-de-tablas", true)).toEqual({ ok: true });
    expect(activityTouches()).toHaveLength(1);
  });

  it("counts writing SQL in the editor, via the draft autosave", async () => {
    expect(await saveDraftAction(EXERCISE, "select 1")).toEqual({ ok: true });
    expect(activityTouches()).toHaveLength(1);
  });

  it("keeps the 5-minute gap cap, so an idle tab cannot inflate the number", async () => {
    await markLessonViewed("union-de-tablas", false);
    await saveDraftAction(EXERCISE, "select 1");
    const touches = activityTouches();
    expect(touches).toHaveLength(2);
    for (const touch of touches) expect(touch.args.p_max_gap_minutes).toBe(5);
  });

  it("dates the activity in the learner timezone, not in UTC", async () => {
    vi.useFakeTimers();
    // 01:30 UTC is still the previous day in Buenos Aires: crediting it to the UTC date would move
    // a late-night session into tomorrow and break both the streak and the weekly total.
    vi.setSystemTime(new Date("2026-03-02T01:30:00Z"));
    await markLessonViewed("union-de-tablas", false);
    vi.useRealTimers();
    expect(activityTouches()[0]?.args.p_activity_date).toBe("2026-03-01");
  });
});

describe("practice time — what must not count", () => {
  it("credits nothing to a signed-out visitor", async () => {
    currentProfile = null;
    expect(await markLessonViewed("union-de-tablas", false)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await saveDraftAction(EXERCISE, "select 1")).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(activityTouches()).toHaveLength(0);
  });

  it("credits nothing for an invalid slug or exercise id", async () => {
    expect(await markLessonViewed("Not A Slug!", false)).toEqual({
      ok: false,
      error: "validation",
    });
    expect(await saveDraftAction("not-a-uuid", "select 1")).toEqual({
      ok: false,
      error: "validation",
    });
    expect(activityTouches()).toHaveLength(0);
  });

  it("credits nothing when the write itself failed", async () => {
    rpcError = { message: "boom" };
    expect(await markLessonViewed("union-de-tablas", false)).toEqual({
      ok: false,
      error: "unknown",
    });
    expect(await saveDraftAction(EXERCISE, "select 1")).toEqual({ ok: false, error: "unknown" });
    expect(activityTouches()).toHaveLength(0);
  });
});
