import "server-only";
import { after } from "next/server";
import { limits } from "@/config/limits";
import { notifications } from "@/config/notifications";
import { serverEnv } from "@/lib/env/server";
import {
  buildOwnerEmail,
  type OwnerEvent,
  type OwnerEventType,
} from "@/lib/notifications/owner-email";
import { siteUrl } from "@/lib/seo/urls";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Owner-only email alerts (D-43) through Resend's REST API. Plain `fetch`, no SDK: one POST is the
 * whole integration, and a dependency would be more surface than the call it wraps.
 *
 * Contract: this never throws into the caller and never slows a learner down. Callers schedule it
 * with `notifyOwnerAfterResponse`, which runs after the response has been sent, and only once the
 * database write it describes has succeeded. Logs name the event type and an HTTP status at most:
 * never the key, the recipient or the email body.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const LOG = "[owner-notify]";

export type NotifyResult = "sent" | "disabled" | "rate_limited" | "failed";

function apiKey(): string | undefined {
  return serverEnv().RESEND_API_KEY;
}

/**
 * Global per-type ceiling (`limits.ownerNotifications.maxPerHour`) on the shared Postgres token
 * bucket, so it holds across serverless instances. Fails closed: if the limiter cannot answer, no
 * email is sent — the event is still stored and counted in the admin badge, so nothing is lost.
 */
async function capReached(type: OwnerEventType): Promise<boolean> {
  const perHour = limits.ownerNotifications.maxPerHour[type];
  const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
    p_key: `owner-email:${type}`,
    p_capacity: perHour,
    p_refill_per_second: perHour / 3600,
  });
  return Boolean(error) || data === false;
}

export async function notifyOwner(event: OwnerEvent): Promise<NotifyResult> {
  try {
    const key = apiKey();
    if (!key) {
      console.info(`${LOG} ${event.type}: RESEND_API_KEY is not set; email skipped`);
      return "disabled";
    }
    if (await capReached(event.type)) {
      console.warn(
        `${LOG} ${event.type}: hourly cap reached or limiter unavailable; email skipped`,
      );
      return "rate_limited";
    }
    const email = buildOwnerEmail(event, siteUrl());
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: notifications.owner.from,
        to: [notifications.owner.email],
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
      signal: AbortSignal.timeout(limits.ownerNotifications.requestTimeoutMs),
    });
    if (!response.ok) {
      console.error(`${LOG} ${event.type}: Resend answered HTTP ${response.status}`);
      return "failed";
    }
    return "sent";
  } catch (error) {
    // The error name only (TimeoutError, TypeError…): messages can echo request details.
    console.error(`${LOG} ${event.type}: ${error instanceof Error ? error.name : "unknown error"}`);
    return "failed";
  }
}

/**
 * Schedules the alert for after the response. `load` builds the event lazily, so any extra read it
 * needs (e.g. the code's remaining uses) also happens off the learner's critical path. Returns
 * nothing and never throws: the learner's action has already succeeded by the time this is called.
 */
export function notifyOwnerAfterResponse(load: () => Promise<OwnerEvent | null>): void {
  try {
    after(async () => {
      try {
        const event = await load();
        if (event) await notifyOwner(event);
      } catch (error) {
        console.error(
          `${LOG} could not build the event: ${error instanceof Error ? error.name : "unknown error"}`,
        );
      }
    });
  } catch (error) {
    console.error(
      `${LOG} could not schedule: ${error instanceof Error ? error.name : "unknown error"}`,
    );
  }
}
