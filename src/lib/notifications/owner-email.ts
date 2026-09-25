import { createTranslator } from "next-intl";
import { brand } from "@/config/brand";
import { limits } from "@/config/limits";
import messages from "@/messages/es-419.json";

/**
 * Owner alert emails (D-43), built as plain data so they can be tested without a network.
 *
 * What an event may carry is deliberately narrow: the learner's alias and what they did. No email
 * address, no display name, no SQL — the email goes through a third party (Resend) and sits in an
 * inbox, so it carries only what the owner needs to decide whether to open the admin panel.
 */

export type OwnerEvent =
  | {
      type: "exercise_report";
      alias: string | null;
      exerciseTitle: string | null;
      exerciseSlug: string;
      /** A `REPORT_CATEGORIES` value; unknown values are shown as they are. */
      category: string;
      note: string;
    }
  | {
      type: "promo_redemption";
      alias: string | null;
      code: string;
      kind: string;
      accessDays: number | null;
      discountPercent: number | null;
      /** Null = uncapped code. */
      maxRedemptions: number | null;
      redemptionsCount: number;
    };

export type OwnerEventType = OwnerEvent["type"];

export interface OwnerEmail {
  subject: string;
  text: string;
  html: string;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]!);
}

/** Cuts by characters (code points), not UTF-16 units, so an emoji is never split in half. */
export function truncateText(value: string, max: number): { text: string; truncated: boolean } {
  const chars = Array.from(value);
  if (chars.length <= max) return { text: value, truncated: false };
  return { text: `${chars.slice(0, max).join("").trimEnd()}…`, truncated: true };
}

/**
 * A subject is one line. Learner-controlled text never reaches it today (exercise titles are
 * authored, codes are `[A-Z0-9-]`), but line breaks and control characters are removed anyway.
 */
function oneLine(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
}

const t = createTranslator({ locale: "es-419", messages, namespace: "ownerEmail" });
const tCategory = createTranslator({
  locale: "es-419",
  messages,
  namespace: "workspace.report.categories",
});

function who(alias: string | null): string {
  return alias ? `@${alias}` : t("noAlias");
}

function categoryLabel(category: string): string {
  return tCategory.has(category as never) ? tCategory(category as never) : category;
}

/** `[paragraph, …]` → text and HTML, escaping every piece exactly once. */
function render(
  subject: string,
  paragraphs: string[],
  cta: { label: string; url: string; line: string },
  preformatted?: { heading: string; body: string; after?: string },
): OwnerEmail {
  const footer = t("footer", { product: brand.productName });
  const textParts = [...paragraphs];
  if (preformatted) {
    textParts.push(`${preformatted.heading}\n${preformatted.body}`);
    if (preformatted.after) textParts.push(preformatted.after);
  }
  textParts.push(cta.line, footer);

  const html = [
    ...paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`),
    ...(preformatted
      ? [
          `<p>${escapeHtml(preformatted.heading)}</p>`,
          `<blockquote style="margin:0 0 1em;padding-left:12px;border-left:3px solid #ccc;white-space:pre-wrap">${escapeHtml(preformatted.body)}</blockquote>`,
          ...(preformatted.after ? [`<p>${escapeHtml(preformatted.after)}</p>`] : []),
        ]
      : []),
    `<p><a href="${escapeHtml(cta.url)}">${escapeHtml(cta.label)}</a></p>`,
    `<p style="color:#666;font-size:12px">${escapeHtml(footer)}</p>`,
  ].join("\n");

  return { subject: oneLine(subject), text: textParts.join("\n\n"), html };
}

export function buildOwnerEmail(event: OwnerEvent, siteUrl: string): OwnerEmail {
  const base = siteUrl.replace(/\/+$/, "");

  if (event.type === "exercise_report") {
    const url = `${base}/admin/reportes`;
    const title = event.exerciseTitle ?? event.exerciseSlug;
    const note = truncateText(event.note.trim(), limits.ownerNotifications.noteExcerptChars);
    return render(
      t("report.subject", { exercise: title }),
      [
        t("report.lead", { who: who(event.alias) }),
        t("report.exercise", { title, slug: event.exerciseSlug }),
        t("report.category", { category: categoryLabel(event.category) }),
      ],
      { label: t("report.ctaLabel"), url, line: t("report.cta", { url }) },
      {
        heading: t("report.note"),
        body: note.text,
        after: note.truncated ? t("report.truncated") : undefined,
      },
    );
  }

  const url = `${base}/admin/promos`;
  const scholarship = event.kind === "scholarship";
  const uses =
    event.maxRedemptions === null
      ? t("promo.usesUnlimited", { used: event.redemptionsCount })
      : t("promo.usesCapped", {
          used: event.redemptionsCount,
          max: event.maxRedemptions,
          remaining: Math.max(0, event.maxRedemptions - event.redemptionsCount),
        });
  return render(
    t(scholarship ? "promo.subjectScholarship" : "promo.subjectDiscount", { code: event.code }),
    [
      t("promo.lead", { who: who(event.alias), code: event.code }),
      scholarship
        ? t("promo.grantedScholarship", { days: event.accessDays ?? 0 })
        : t("promo.grantedDiscount", { percent: event.discountPercent ?? 0 }),
      uses,
    ],
    { label: t("promo.ctaLabel"), url, line: t("promo.cta", { url }) },
  );
}
