"use client";

import { useEffect } from "react";
import { clearDraftStorage } from "@/components/workspace/draft-storage";

/**
 * Renders nothing; sweeps the SQL drafts left in this browser (security review 2026-09-23, F-8).
 * Mounted on the sign-in page, it catches the sessions that ended without a clean sign-out —
 * an expired token, a closed tab, a cleared cookie — where the sign-out sweep never ran.
 */
export function DraftStorageSweep() {
  useEffect(() => {
    clearDraftStorage();
  }, []);
  return null;
}
