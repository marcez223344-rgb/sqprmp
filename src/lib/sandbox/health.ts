import "server-only";
import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env/server";
import { workerEngine } from "@/lib/sandbox/engines/worker-engine";

/**
 * Executes one trivial query through the graded engine and reports what happened.
 *
 * The engine breaks in build-shaped ways — a bundler rewriting the worker's imports, a missing
 * dataset snapshot — which every local test misses because they run outside the production build.
 * This is the cheapest way to tell, from outside, whether submissions work on a deployment.
 */
export async function sandboxHealth(
  authorization: string | null,
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!authorized(authorization)) return { status: 401, body: { error: "unauthorized" } };

  const started = Date.now();
  const outcome = await workerEngine.execute(
    { slug: "tiendaviva", version: 1 },
    "select count(*) as n from customers",
  );
  if (!outcome.ok)
    return { status: 503, body: { ok: false, code: outcome.code, message: outcome.message } };

  const zone = await sessionTimeZoneProbe();
  return {
    status: zone.ok ? 200 : 503,
    body: { ok: zone.ok, rows: outcome.rows.length, ms: Date.now() - started, timeZone: zone },
  };
}

/**
 * The session zone is pinned to UTC in the engine core, but only a deployment can prove the
 * deployed engine agrees with the expected results the seed was generated from. `current_setting`
 * is revoked for the `learner` role, so the zone is read through its observable effect: under any
 * other zone this timestamp renders with a different offset and the month lands on a different day.
 */
async function sessionTimeZoneProbe(): Promise<{
  ok: boolean;
  rendered: string;
  monthAdd: string;
}> {
  const expectedRendered = "2025-07-01 00:00:00+00";
  const expectedMonthAdd = "2025-08-01 00:00:00+00";
  const r = await workerEngine.execute(
    { slug: "tiendaviva", version: 1 },
    "select (timestamptz '2025-07-01 00:00:00+00')::text as rendered, (timestamptz '2025-07-01 00:00:00+00' + interval '1 month')::text as month_add",
  );
  if (!r.ok) return { ok: false, rendered: "", monthAdd: "" };
  const rendered = String(r.rows[0]?.[0] ?? "");
  const monthAdd = String(r.rows[0]?.[1] ?? "");
  return { ok: rendered === expectedRendered && monthAdd === expectedMonthAdd, rendered, monthAdd };
}

function authorized(authorization: string | null): boolean {
  const expected = `Bearer ${serverEnv().CRON_SECRET}`;
  if (!authorization || authorization.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(authorization), Buffer.from(expected));
}
