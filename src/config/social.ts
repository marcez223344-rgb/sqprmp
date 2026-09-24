/**
 * Social profiles. **Only add a URL that points at a real profile.** A link to a platform's
 * home page is a dead end, which CLAUDE.md rule 9 forbids; `undefined` means "no profile yet"
 * and callers must not render a link for it.
 *
 * Instagram, YouTube and GitHub were placeholders pointing at the bare platform home pages
 * (`https://www.instagram.com/` and so on) until 2026-09-24. Nothing rendered them, so nobody
 * followed one, but they were an accident waiting to be linked from a footer. Fill them in when
 * the profiles exist.
 */
export const social = {
  linkedin: "https://www.linkedin.com/company/data-minds-solutions",
  instagram: undefined,
  youtube: undefined,
  github: undefined,
} as const;
