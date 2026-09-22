import { NextResponse, type NextRequest } from "next/server";
import { accessHealth } from "@/lib/exercises/health";

/**
 * Access-path probe for one exercise slug; requires the CRON_SECRET bearer token.
 *
 * `can_access_exercise` runs through the privileged client, so when that client is misconfigured
 * every learner sees a paywall instead of an error. Nothing in the UI can tell the two apart, and
 * the service-role call cannot be reproduced locally against production. See src/lib/exercises/health.ts.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "catalogo-de-categorias";
  const { status, body } = await accessHealth(request.headers.get("authorization"), slug);
  return NextResponse.json(body, { status });
}
