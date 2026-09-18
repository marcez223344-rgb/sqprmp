import { NextResponse, type NextRequest } from "next/server";
import { processWebhook, webhookRateLimited } from "@/lib/payments/service";

export const runtime = "nodejs";

/**
 * Hotmart Webhook 2.0 endpoint. Always 200 after persistence so the provider stops retrying;
 * invalid tokens are recorded (audit) and rejected with 401 without side effects.
 */
export async function POST(request: NextRequest) {
  if (await webhookRateLimited("hotmart"))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const raw = await request.text();
  if (raw.length > 64 * 1024) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const outcome = await processWebhook("hotmart", raw, request.headers);
  if (outcome === "invalid_signature")
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  if (outcome === "provider_unknown")
    return NextResponse.json({ error: "provider_disabled" }, { status: 404 });
  return NextResponse.json({ outcome });
}
