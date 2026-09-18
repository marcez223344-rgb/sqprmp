import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import { parseAnalyticsEvent, type AnalyticsEventName, type AnalyticsProps } from "./events";

/**
 * Records a first-party analytics event. Fire-and-forget: analytics must never break a
 * learner flow, so failures are logged (without properties) and swallowed.
 * Invalid events are dropped rather than stored partially.
 */
export async function track<N extends AnalyticsEventName>(
  name: N,
  props: AnalyticsProps<N>,
  ctx: { userId?: string | null; anonymousId?: string | null } = {},
): Promise<void> {
  const parsed = parseAnalyticsEvent(name, props);
  if (!parsed) {
    console.warn(`[analytics] dropped invalid event ${name}`);
    return;
  }
  try {
    const { error } = await createAdminClient()
      .from("analytics_events")
      .insert({
        name,
        properties: parsed as Json,
        user_id: ctx.userId ?? null,
        anonymous_id: ctx.anonymousId ?? null,
      });
    if (error) console.warn(`[analytics] insert failed for ${name}: ${error.code}`);
  } catch {
    console.warn(`[analytics] insert threw for ${name}`);
  }
}
