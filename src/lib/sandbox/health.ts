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
  return outcome.ok
    ? { status: 200, body: { ok: true, rows: outcome.rows.length, ms: Date.now() - started } }
    : { status: 503, body: { ok: false, code: outcome.code, message: outcome.message } };
}

function authorized(authorization: string | null): boolean {
  const expected = `Bearer ${serverEnv().CRON_SECRET}`;
  if (!authorization || authorization.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(authorization), Buffer.from(expected));
}
