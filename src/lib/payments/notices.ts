import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/**
 * The one-time "your access is active" notice (owner feedback item 23).
 *
 * There is no transactional email provider configured in this project — Supabase Auth's own
 * magic-link mail is not a product mailer — so the app tells the learner in the app instead of
 * pretending to send something. `entitlements.acknowledged_at` is what makes it one-time: the
 * notice is derived from data, not from a flag in the browser, so it survives a new device and
 * cannot be resurrected by clearing storage. Deciding whether to add email is OA-16 in
 * docs/OWNER_ACTIONS.md.
 */
export interface AccessNotice {
  entitlementId: string;
  source: string;
  endsAt: string | null;
}

export const getPendingAccessNotice = cache(
  async (profile: Profile): Promise<AccessNotice | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("entitlements")
      .select("id, source, ends_at, acknowledged_at, revoked_at")
      .eq("user_id", profile.id)
      .is("revoked_at", null)
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false })
      .limit(5);
    const active = (data ?? []).find((e) => !e.ends_at || Date.parse(e.ends_at) > Date.now());
    if (!active) return null;
    return { entitlementId: active.id, source: active.source, endsAt: active.ends_at };
  },
);
