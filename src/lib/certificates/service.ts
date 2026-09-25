import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { limits } from "@/config/limits";
import { track } from "@/lib/analytics/track";
import {
  requirementPercent,
  summarizeSectionProgress,
  type SectionProgressSummary,
} from "@/lib/certificates/progress";
import { displayedProgramHours } from "@/lib/certificates/program-hours";
import { getLearningPath } from "@/lib/curriculum/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export interface RequirementStatus {
  slug: string;
  title: string;
  skills: string[];
  sections: {
    slug: string;
    title: string;
    number: number;
    completed: boolean;
    /** Partial progress, for display only; `completed` is still what eligibility is built on. */
    progress: SectionProgressSummary;
  }[];
  /** Share of the requirement's published lessons already completed (display only). */
  percent: number;
  /** D-42: program hours, the same for every holder; 0 where the certificate does not show them. */
  programHours: number;
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
  const [{ data: reqs }, { data: sections }, { data: progress }, { data: certs }, path] =
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
      // The same per-section progress /ruta reads, so the two pages can never disagree.
      getLearningPath(profile.id),
    ]);
  const done = new Set((progress ?? []).map((p) => p.section_id));
  const pathBySlug = new Map(path.map((p) => [p.slug, p]));
  const bySlug = new Map((sections ?? []).map((s) => [s.slug, s]));
  const admin = createAdminClient();
  return Promise.all(
    (reqs ?? []).map(async (r) => {
      const rules = (r.rules ?? {}) as RequirementRules;
      const secs = (rules.sections ?? []).flatMap((slug) => {
        const s = bySlug.get(slug);
        if (!s) return [];
        return [
          {
            slug,
            title: s.title,
            number: s.number,
            completed: done.has(s.id),
            progress: summarizeSectionProgress(pathBySlug.get(slug)?.lessons ?? []),
          },
        ];
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
        percent: requirementPercent(secs.map((x) => x.progress)),
        programHours: displayedProgramHours(r.slug, rules.sections ?? []),
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
  /** D-42 program hours; 0 when not shown for this certificate or unknown (line omitted). */
  programHours: number;
}

/** Owner-only detail (RLS restricts to the learner's own rows or admins). */
export async function getOwnCertificate(publicId: string): Promise<CertificateDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select(
      "public_id, verification_code, recipient_name, issued_at, revoked_at, certificate_requirements ( slug, title, skills, rules )",
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
    programHours: req
      ? displayedProgramHours(req.slug, ((req.rules ?? {}) as RequirementRules).sections ?? [])
      : 0,
  };
}

export interface VerificationResult {
  publicId: string;
  recipientName: string;
  title: string;
  skills: string[];
  issuedAt: string;
  revoked: boolean;
  /** D-42 program hours; 0 when not shown for this certificate or unknown (row omitted). */
  programHours: number;
}

/**
 * Per-IP token bucket for the public verifier (codes are 20-char random, but scraping the
 * endpoint should still be bounded). The IP is hashed; nothing identifying is stored.
 */
export async function verificationRateLimited(): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const key = `verify:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
  const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
    p_key: key,
    p_capacity: limits.rateLimits.verification.capacity,
    p_refill_per_second: limits.rateLimits.verification.refillPerSecond,
  });
  return Boolean(error) || data === false;
}

/** Public verification by code: minimal data, no user identifiers. */
export async function verifyCertificate(code: string): Promise<VerificationResult | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_certificate", { p_code: code });
  const row = data?.[0];
  if (!row) return null;
  // `verify_certificate` returns the requirement's title, not its slug or rules, so the sections
  // are read from the requirement with that title (titles are unique in practice, and active
  // requirements are readable by anyone under RLS). An inactive or renamed requirement yields 0
  // hours and the page omits the row rather than guessing.
  const { data: req } = await supabase
    .from("certificate_requirements")
    .select("slug, rules")
    .eq("title", row.title)
    .limit(1)
    .maybeSingle();
  return {
    publicId: row.public_id,
    recipientName: row.recipient_name,
    title: row.title,
    skills: row.skills,
    issuedAt: row.issued_at,
    revoked: row.revoked,
    programHours: req
      ? displayedProgramHours(req.slug, ((req.rules ?? {}) as RequirementRules).sections ?? [])
      : 0,
  };
}
