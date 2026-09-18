import "server-only";
import { track } from "@/lib/analytics/track";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export interface RequirementStatus {
  slug: string;
  title: string;
  skills: string[];
  sections: { slug: string; title: string; number: number; completed: boolean }[];
  eligible: boolean;
  certificate: {
    publicId: string;
    verificationCode: string;
    issuedAt: string;
    revoked: boolean;
  } | null;
}

interface RequirementRules {
  sections?: string[];
  min_quiz_score_percent?: number;
}

/** All active requirements with the learner's section-by-section status and issued certificate. */
export async function getRequirementStatuses(profile: Profile): Promise<RequirementStatus[]> {
  const supabase = await createClient();
  const [{ data: reqs }, { data: sections }, { data: progress }, { data: certs }] =
    await Promise.all([
      supabase
        .from("certificate_requirements")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("sections").select("id, slug, title, number").eq("is_published", true),
      supabase.from("section_progress").select("section_id").eq("user_id", profile.id),
      supabase
        .from("certificates")
        .select("public_id, verification_code, issued_at, revoked_at, requirement_id")
        .eq("user_id", profile.id),
    ]);
  const done = new Set((progress ?? []).map((p) => p.section_id));
  const bySlug = new Map((sections ?? []).map((s) => [s.slug, s]));
  const admin = createAdminClient();
  return Promise.all(
    (reqs ?? []).map(async (r) => {
      const rules = (r.rules ?? {}) as RequirementRules;
      const secs = (rules.sections ?? []).flatMap((slug) => {
        const s = bySlug.get(slug);
        return s ? [{ slug, title: s.title, number: s.number, completed: done.has(s.id) }] : [];
      });
      const cert = (certs ?? []).find((c) => c.requirement_id === r.id) ?? null;
      // Eligibility is decided by the DB rule (also re-checks late section completion).
      const eligible = cert
        ? true
        : Boolean(
            (
              await admin.rpc("certificate_eligible", {
                p_user_id: profile.id,
                p_requirement_slug: r.slug,
              })
            ).data,
          );
      return {
        slug: r.slug,
        title: r.title,
        skills: r.skills,
        sections: secs,
        eligible,
        certificate: cert
          ? {
              publicId: cert.public_id,
              verificationCode: cert.verification_code,
              issuedAt: cert.issued_at,
              revoked: cert.revoked_at !== null,
            }
          : null,
      };
    }),
  );
}

export type IssueOutcome =
  | { ok: true; publicId: string; verificationCode: string; alreadyIssued: boolean }
  | { ok: false; error: "not_eligible" | "not_found" | "unknown" };

/** Issues (or returns the existing) certificate; eligibility is enforced inside the RPC. */
export async function issueCertificate(
  profile: Profile,
  requirementSlug: string,
  recipientName: string,
): Promise<IssueOutcome> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("issue_certificate", {
    p_user_id: profile.id,
    p_requirement_slug: requirementSlug,
    p_recipient_name: recipientName,
  });
  if (error) {
    if (error.code === "P0001") return { ok: false, error: "not_eligible" };
    if (error.code === "P0002") return { ok: false, error: "not_found" };
    return { ok: false, error: "unknown" };
  }
  const row = data?.[0];
  if (!row) return { ok: false, error: "unknown" };
  if (!row.already_issued)
    await track(
      "certificate_issued",
      { requirement_slug: requirementSlug },
      { userId: profile.id },
    );
  return {
    ok: true,
    publicId: row.public_id,
    verificationCode: row.verification_code,
    alreadyIssued: row.already_issued,
  };
}

export interface CertificateDetail {
  publicId: string;
  verificationCode: string;
  recipientName: string;
  title: string;
  skills: string[];
  issuedAt: string;
  revoked: boolean;
}

/** Owner-only detail (RLS restricts to the learner's own rows or admins). */
export async function getOwnCertificate(publicId: string): Promise<CertificateDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select(
      "public_id, verification_code, recipient_name, issued_at, revoked_at, certificate_requirements ( title, skills )",
    )
    .eq("public_id", publicId)
    .maybeSingle();
  if (!data) return null;
  const req = data.certificate_requirements;
  return {
    publicId: data.public_id,
    verificationCode: data.verification_code,
    recipientName: data.recipient_name,
    title: req?.title ?? "",
    skills: req?.skills ?? [],
    issuedAt: data.issued_at,
    revoked: data.revoked_at !== null,
  };
}

export interface VerificationResult {
  publicId: string;
  recipientName: string;
  title: string;
  skills: string[];
  issuedAt: string;
  revoked: boolean;
}

/** Public verification by code: minimal data, no user identifiers. */
export async function verifyCertificate(code: string): Promise<VerificationResult | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_certificate", { p_code: code });
  const row = data?.[0];
  if (!row) return null;
  return {
    publicId: row.public_id,
    recipientName: row.recipient_name,
    title: row.title,
    skills: row.skills,
    issuedAt: row.issued_at,
    revoked: row.revoked,
  };
}
