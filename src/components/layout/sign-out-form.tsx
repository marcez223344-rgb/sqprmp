"use client";

import { LogOut } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { clearDraftStorage } from "@/components/workspace/draft-storage";
import { cn } from "@/lib/utils/cn";

/**
 * Sign-out stays a server POST (a GET would be CSRF-able), so the server cannot clear browser
 * storage: the SQL drafts kept in `localStorage` have to be swept here, before the form submits
 * (security review 2026-09-23, F-8). Without this, the next person to use a shared machine could
 * read the previous learner's queries.
 */
export function SignOutForm({ label }: { label: string }) {
  return (
    <form action="/auth/signout" method="post" onSubmit={() => clearDraftStorage()}>
      <button type="submit" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
        <LogOut aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">{label}</span>
      </button>
    </form>
  );
}
