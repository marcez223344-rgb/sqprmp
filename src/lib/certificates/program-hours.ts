import { limits } from "@/config/limits";
import { content } from "@/content";
import { quizLengthForSection } from "@/lib/quizzes/length";
import { computeProgramHours, timedItemsFromContent, type ProgramHours } from "./hours";

/**
 * The content-bound entry point for certificate hours (rules in ./hours.ts). The timed items are
 * derived once per server process: content only changes with a deploy.
 */
let cachedItems: ReturnType<typeof timedItemsFromContent> | null = null;

function items() {
  cachedItems ??= timedItemsFromContent(content, quizLengthForSection);
  return cachedItems;
}

export function programHoursForSections(sectionSlugs: readonly string[]): ProgramHours {
  const result = computeProgramHours(sectionSlugs, items());
  if (result.missingSections.length > 0 || result.missingItems.length > 0)
    console.warn("[certificates] program hours computed with missing estimates", {
      missingSections: result.missingSections,
      missingItems: result.missingItems,
    });
  return result;
}

/**
 * The hours a certificate displays: its program hours when the certificate is configured to show
 * them (`limits.certificates.programHoursShownFor`), otherwise 0, which every surface (PDF,
 * verification page, share image, /certificados) treats as "omit the line".
 */
export function displayedProgramHours(
  requirementSlug: string,
  sectionSlugs: readonly string[],
  shownFor: readonly string[] = limits.certificates.programHoursShownFor,
): number {
  if (!shownFor.includes(requirementSlug)) return 0;
  return programHoursForSections(sectionSlugs).hours;
}
