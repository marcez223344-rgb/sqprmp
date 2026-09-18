"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { limits } from "@/config/limits";
import { getCurrentProfile } from "@/lib/auth/session";
import { issueCertificate, type IssueOutcome } from "@/lib/certificates/service";

const schema = z.object({
  requirementSlug: z.string().regex(/^[a-z0-9-]{2,80}$/),
  recipientName: z
    .string()
    .trim()
    .min(3)
    .max(limits.profile.displayNameMaxLength)
    .regex(/^[\p{L}\p{M}' .-]+$/u),
});

export async function issueCertificateAction(
  raw: unknown,
): Promise<IssueOutcome | { ok: false; error: "unauthorized" | "validation" }> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.onboarding_completed_at) return { ok: false, error: "unauthorized" };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "validation" };
  const result = await issueCertificate(
    profile,
    parsed.data.requirementSlug,
    parsed.data.recipientName,
  );
  if (result.ok) revalidatePath("/certificados");
  return result;
}
