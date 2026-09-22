import { NextResponse, type NextRequest } from "next/server";
import { sandboxHealth } from "@/lib/sandbox/health";

/** Sandbox health probe; requires the CRON_SECRET bearer token. See src/lib/sandbox/health.ts. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { status, body } = await sandboxHealth(request.headers.get("authorization"));
  return NextResponse.json(body, { status });
}
