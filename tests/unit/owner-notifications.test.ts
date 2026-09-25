import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { limits } from "@/config/limits";
import { notifications } from "@/config/notifications";
import {
  buildOwnerEmail,
  escapeHtml,
  truncateText,
  type OwnerEvent,
} from "@/lib/notifications/owner-email";

/**
 * D-43: owner-only email alerts. The email carries the learner's alias and what happened, never
 * their SQL, email address or name; learner text is escaped; a missing key is a silent no-op; a
 * global hourly cap stops a flood; and nothing here can fail the learner's action.
 */

const SITE = "https://academia.example";

const report: Extract<OwnerEvent, { type: "exercise_report" }> = {
  type: "exercise_report",
  alias: "ana_datos",
  exerciseTitle: "Ventas por región",
  exerciseSlug: "ventas-por-region",
  category: "marked_wrong",
  note: "Mi consulta devuelve lo mismo que la solución.",
};

const promo: Extract<OwnerEvent, { type: "promo_redemption" }> = {
  type: "promo_redemption",
  alias: "beto_sql",
  code: "BECA-7KQF-2XMR",
  kind: "scholarship",
  accessDays: 90,
  discountPercent: null,
  maxRedemptions: 5,
  redemptionsCount: 2,
};

describe("buildOwnerEmail — exercise report", () => {
  it("names the exercise, the category in words, the alias and links to /admin/reportes", () => {
    const email = buildOwnerEmail(report, `${SITE}/`);
    expect(email.subject).toBe("Nuevo reporte: Ventas por región");
    expect(email.text).toContain("@ana_datos reportó un problema");
    expect(email.text).toContain("Ventas por región (ventas-por-region)");
    expect(email.text).toContain("Mi respuesta era correcta y se marcó como incorrecta");
    expect(email.text).toContain(report.note);
    expect(email.text).toContain(`${SITE}/admin/reportes`);
    expect(email.html).toContain(`href="${SITE}/admin/reportes"`);
  });

  it("escapes learner text in the HTML part and keeps it literal in the text part", () => {
    const note = `<script>alert("x")</script> & <img src=x onerror=alert(1)>`;
    const email = buildOwnerEmail({ ...report, note }, SITE);
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &lt;img");
    expect(email.text).toContain(note);
  });

  it("does not interpret ICU syntax typed by the learner", () => {
    const note = "El total da {count, plural, one {#} other {#}} y no coincide.";
    expect(buildOwnerEmail({ ...report, note }, SITE).text).toContain(note);
  });

  it("truncates a long note and says so", () => {
    const max = limits.ownerNotifications.noteExcerptChars;
    const note = "a".repeat(max + 50);
    const email = buildOwnerEmail({ ...report, note }, SITE);
    expect(email.text).toContain(`${"a".repeat(max)}…`);
    expect(email.text).not.toContain("a".repeat(max + 1));
    expect(email.text).toContain("nota recortada");
  });

  it("carries no PII beyond the alias", () => {
    const email = buildOwnerEmail(report, SITE);
    const all = `${email.subject}\n${email.text}\n${email.html}`;
    expect(all).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/); // no email address
    expect(all).not.toMatch(/\bselect\b/i); // no SQL
  });

  it("falls back to the slug without a title, to a neutral phrase without an alias", () => {
    const email = buildOwnerEmail({ ...report, exerciseTitle: null, alias: null }, SITE);
    expect(email.subject).toBe("Nuevo reporte: ventas-por-region");
    expect(email.text).toContain("Un estudiante sin alias reportó");
    expect(email.text).not.toContain("@null");
  });

  it("keeps the subject on one line", () => {
    const email = buildOwnerEmail({ ...report, exerciseTitle: "Ventas\r\nBcc: x" }, SITE);
    expect(email.subject).not.toMatch(/[\r\n]/);
  });
});

describe("buildOwnerEmail — code redemption", () => {
  it("states what a scholarship granted and the uses left, linking to /admin/promos", () => {
    const email = buildOwnerEmail(promo, SITE);
    expect(email.subject).toBe("Código de beca usado: BECA-7KQF-2XMR");
    expect(email.text).toContain("@beto_sql canjeó el código BECA-7KQF-2XMR.");
    expect(email.text).toContain("90 días de acceso completo");
    expect(email.text).toContain("Usos: 2 de 5 (quedan 3 canjes).");
    expect(email.text).toContain(`${SITE}/admin/promos`);
  });

  it("says when a capped code is used up, and when a code has no cap", () => {
    expect(buildOwnerEmail({ ...promo, redemptionsCount: 5 }, SITE).text).toContain(
      "ya no quedan canjes",
    );
    expect(buildOwnerEmail({ ...promo, redemptionsCount: 4 }, SITE).text).toContain(
      "queda 1 canje",
    );
    expect(buildOwnerEmail({ ...promo, maxRedemptions: null }, SITE).text).toContain(
      "sin límite de canjes",
    );
  });

  it("describes a discount code as a discount", () => {
    const email = buildOwnerEmail(
      { ...promo, kind: "discount", accessDays: null, discountPercent: 30 },
      SITE,
    );
    expect(email.subject).toBe("Código de descuento usado: BECA-7KQF-2XMR");
    expect(email.text).toContain("30 % de descuento");
  });
});

describe("helpers", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });

  it("truncates by characters, never splitting an emoji", () => {
    expect(truncateText("😀😀😀", 2)).toEqual({ text: "😀😀…", truncated: true });
    expect(truncateText("hola", 4)).toEqual({ text: "hola", truncated: false });
  });
});

// --- Transport ------------------------------------------------------------------------------

const FAKE_KEY = "re_test_not_a_real_key_0000";
let envKey: string | undefined;
let limiter: { data: boolean | null; error: { message: string } | null };
const rpcCalls: unknown[] = [];
let scheduledAfter: (() => Promise<void>) | null = null;
let afterThrows = false;

vi.mock("@/lib/env/server", () => ({ serverEnv: () => ({ RESEND_API_KEY: envKey }) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: async (_name: string, args: unknown) => {
      rpcCalls.push(args);
      return limiter;
    },
  }),
}));
vi.mock("next/server", () => ({
  after: (cb: () => Promise<void>) => {
    if (afterThrows) throw new Error("outside request scope");
    scheduledAfter = cb;
  },
}));

const { notifyOwner, notifyOwnerAfterResponse } = await import("@/lib/notifications/owner");

describe("notifyOwner", () => {
  const fetchMock = vi.fn();
  const logs: string[] = [];

  beforeEach(() => {
    envKey = FAKE_KEY;
    limiter = { data: true, error: null };
    rpcCalls.length = 0;
    logs.length = 0;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    for (const level of ["info", "warn", "error"] as const)
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(" "));
      });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("is a no-op with one log line when the key is missing", async () => {
    envKey = undefined;
    expect(await notifyOwner(report)).toBe("disabled");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(rpcCalls).toHaveLength(0);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain("RESEND_API_KEY");
  });

  it("sends one email to the configured owner, authenticated with the key", async () => {
    expect(await notifyOwner(promo)).toBe("sent");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${FAKE_KEY}`);
    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual([notifications.owner.email]);
    expect(body.from).toBe(notifications.owner.from);
    expect(body.subject).toBe("Código de beca usado: BECA-7KQF-2XMR");
  });

  it("applies the per-type hourly cap on a shared bucket", async () => {
    await notifyOwner(report);
    const perHour = limits.ownerNotifications.maxPerHour.exercise_report;
    expect(rpcCalls[0]).toEqual({
      p_key: "owner-email:exercise_report",
      p_capacity: perHour,
      p_refill_per_second: perHour / 3600,
    });
    await notifyOwner(promo);
    expect((rpcCalls[1] as { p_key: string }).p_key).toBe("owner-email:promo_redemption");
  });

  it("skips the email once the cap is reached, and when the limiter is down", async () => {
    limiter = { data: false, error: null };
    expect(await notifyOwner(report)).toBe("rate_limited");
    limiter = { data: null, error: { message: "down" } };
    expect(await notifyOwner(report)).toBe("rate_limited");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never throws, and never logs the key or the email body", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));
    expect(await notifyOwner(report)).toBe("failed");
    fetchMock.mockRejectedValueOnce(new TypeError(`fetch failed ${FAKE_KEY}`));
    expect(await notifyOwner(report)).toBe("failed");
    const all = logs.join("\n");
    expect(all).toContain("HTTP 500");
    expect(all).not.toContain(FAKE_KEY);
    expect(all).not.toContain(report.note);
    expect(all).not.toContain(notifications.owner.email);
  });
});

describe("notifyOwnerAfterResponse", () => {
  beforeEach(() => {
    envKey = undefined;
    scheduledAfter = null;
    afterThrows = false;
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("defers both building and sending until after the response", async () => {
    const load = vi.fn(async () => report);
    notifyOwnerAfterResponse(load);
    expect(load).not.toHaveBeenCalled();
    await scheduledAfter!();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("swallows a failing loader and a failure to schedule", async () => {
    notifyOwnerAfterResponse(async () => {
      throw new Error("db down");
    });
    await expect(scheduledAfter!()).resolves.toBeUndefined();
    afterThrows = true;
    expect(() => notifyOwnerAfterResponse(async () => report)).not.toThrow();
  });
});
