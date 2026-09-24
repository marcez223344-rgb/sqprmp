import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createTestUser,
  deleteTestUser,
  e2eSupabase,
  hasLocalSupabase,
  signInAs,
  type TestUser,
} from "./helpers/auth";
import { message, messagePattern } from "./helpers/messages";

async function onboard(page: Page, name: string) {
  await page.goto("/onboarding");
  await page.getByLabel("Nombre para mostrar").fill(name);
  await page.getByLabel("Alias").fill(`q_${Date.now().toString(36).slice(-7)}`);
  // The availability check is debounced (450 ms) and then round-trips to the server; on a
  // loaded machine that exceeds the 5 s default and the helper fails before the journey
  // under test starts. 02-onboarding.spec.ts is where this check is the subject.
  await expect(page.getByText(message("onboarding.aliasStatus.available"))).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("Fecha de nacimiento").fill("1990-09-09");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel(/Términos y condiciones/).check();
  await page.getByLabel(/Política de privacidad/).check();
  await page.getByRole("button", { name: "Terminar y empezar" }).click();
  await expect(page).toHaveURL(/\/aprender/);
}

const QUIZ_SLUG = "introduccion-bases-de-datos-quiz";
/** Option labels render Markdown; match on a plain-text prefix of the body. */
// Strips markdown that the renderer drops, but never underscores: they are part of identifiers
// like customer_id, and removing them made the locator search for "customerid".
const plainPrefix = (md: string | null) => (md ?? "").replace(/[`*]/g, "").slice(0, 30);
const REQUIREMENT = "e2e-intro";

/**
 * Answers the currently shown question using the answer key read with the service role (the
 * browser never receives it). Returns the question id, which is what the runner uses to identify
 * the verdict block once the server has graded it.
 */
async function answerCurrent(page: Page, service: SupabaseClient, correct: boolean) {
  const section = page.locator("section[data-question-id]");
  await expect(section).toBeVisible();
  const id = await section.getAttribute("data-question-id");
  if (!id) throw new Error("question id missing");
  const [{ data: q }, { data: opts }] = await Promise.all([
    service.from("theory_questions").select("type, answer, pairs").eq("id", id).single(),
    service.from("question_options").select("key, body_md, is_correct").eq("question_id", id),
  ]);
  const options = opts ?? [];
  const pick = (want: boolean) => options.filter((o) => o.is_correct === want);
  switch (q?.type) {
    case "fill_blank": {
      const accepted = (q.answer as { accepted?: string[] } | null)?.accepted ?? [];
      await section
        .getByRole("textbox")
        .fill(correct ? (accepted[0] ?? "") : "respuesta-incorrecta");
      return id;
    }
    case "matching": {
      const pairs = (q.pairs as { left: string; right: string }[] | null) ?? [];
      for (const [i, p] of pairs.entries()) {
        const wrong = pairs[(i + 1) % pairs.length]?.right ?? p.right;
        await section
          .getByRole("combobox")
          .nth(i)
          .selectOption(correct ? p.right : wrong);
      }
      return id;
    }
    case "multiple": {
      const targets = correct ? pick(true) : [pick(false)[0] ?? options[0]];
      for (const o of targets) {
        if (!o) continue;
        await section.getByRole("checkbox", { name: plainPrefix(o.body_md) }).check();
      }
      return id;
    }
    default: {
      const o = correct ? pick(true)[0] : pick(false)[0];
      if (!o) throw new Error(`no ${correct ? "correct" : "incorrect"} option for ${id}`);
      await section.getByRole("radio", { name: plainPrefix(o.body_md) }).check();
      return id;
    }
  }
}

/**
 * D-34: one question at a time, each graded by the server before the next one is shown, and one
 * single button whose label cycles check -> next question -> see result (D-37 made the number of
 * cycles per section, so the loop can never assume a length).
 *
 * The advance button has to be located again on every iteration *by its current label*: it is the
 * same element throughout, so a locator captured once stops matching as soon as the label changes.
 * The loop also waits for this question's verdict block (`#verdict-<id>`) rather than for a
 * `role="status"` — the running tally is a status too, and it is already on screen from question 2
 * onwards, so waiting on it let the loop decide "is this the last question?" before the server had
 * answered. On the last question that raced into a 30 s wait for a "Siguiente pregunta" button that
 * was never going to appear, which is exactly how this test was failing in CI.
 */
async function runQuiz(page: Page, service: SupabaseClient, correct: boolean) {
  await page.goto(`/leccion/${QUIZ_SLUG}`);
  const button = (key: "check" | "nextQuestion" | "seeResult") =>
    page.getByRole("button", { name: message(`quiz.${key}`) });
  await expect(button("check")).toBeVisible();
  for (;;) {
    const id = await answerCurrent(page, service, correct);
    await button("check").click();
    // The verdict is server-rendered feedback for this exact question: once it is on screen the
    // answer has been recorded and the button has settled into its next state.
    await expect(page.locator(`#verdict-${id}`)).toBeVisible();
    const finish = button("seeResult");
    if (await finish.isVisible()) {
      await finish.click();
      break;
    }
    await button("nextQuestion").click();
  }
  // The result panel is the focused status region.
  await expect(page.locator("#quiz-resultado")).toBeVisible();
}

/** Journeys 11–12: quiz → section completion → certificate → public verification. */
test.describe("quizzes and certificates", () => {
  test.skip(!hasLocalSupabase, "Requires a local Supabase stack (E2E_SUPABASE=1).");
  test.describe.configure({ mode: "serial" });

  let learner: TestUser;
  let service: SupabaseClient;

  test.beforeAll(async ({ browser }) => {
    service = createClient(e2eSupabase.url, e2eSupabase.secretKey, {
      auth: { persistSession: false },
    });
    learner = await createTestUser("quiz");
    const context = await browser.newContext();
    await signInAs(context, learner);
    await onboard(await context.newPage(), "Quiz Prueba");
    await context.close();
    // A requirement scoped to the free intro section keeps the journey short.
    await service.from("certificate_requirements").upsert(
      {
        slug: REQUIREMENT,
        title: "Introducción (E2E)",
        skills: ["Bases de datos relacionales"],
        rules: { sections: ["introduccion-bases-de-datos"], min_quiz_score_percent: 80 },
        sort_order: 99,
        is_active: true,
      },
      { onConflict: "slug" },
    );
  });
  test.afterAll(async () => {
    if (learner) await deleteTestUser(learner.id);
    await service.from("certificate_requirements").delete().eq("slug", REQUIREMENT);
  });

  test("failing a quiz shows explanations and feeds the review page", async ({ context, page }) => {
    await signInAs(context, learner);
    await runQuiz(page, service, false);
    // Verdict copy carries the score and the threshold, both computed at runtime.
    await expect(page.getByText(messagePattern("quiz.failed"))).toBeVisible();
    await expect(page.getByText(message("quiz.correctAnswer")).first()).toBeVisible();
    await page.goto("/repaso");
    await expect(page.getByText(/preguntas para repasar/)).toBeVisible();
  });

  test("passing the quiz completes the section and unlocks the certificate", async ({
    context,
    page,
  }) => {
    await signInAs(context, learner);
    await runQuiz(page, service, true);
    await expect(page.getByText(messagePattern("quiz.passed"))).toBeVisible();
    await expect(page.getByText(message("quiz.sectionCompleted"))).toBeVisible();

    await page.goto("/certificados");
    const card = page.locator("li", { hasText: "Introducción (E2E)" });
    await expect(card.getByText("Listo para emitir")).toBeVisible();
    await card.getByLabel("Nombre completo para el certificado").fill("Quiz Prueba");
    await card.getByRole("button", { name: "Emitir certificado" }).click();
    await expect(card.getByText("Emitido", { exact: true })).toBeVisible();
    await expect(card.getByText(/DMSA-\d{4}-[A-Z0-9]{8}/)).toBeVisible();

    const pdf = await page.request.get(
      (await card.getByRole("link", { name: "Descargar PDF" }).getAttribute("href")) ?? "",
    );
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
  });

  test("anyone can verify by code; unknown codes are rejected", async ({ page }) => {
    const { data: cert } = await service
      .from("certificates")
      .select("verification_code")
      .eq("user_id", learner.id)
      .single();
    await page.goto("/verificar");
    await page.getByLabel("Código de verificación").fill(cert?.verification_code ?? "");
    await page.getByRole("button", { name: "Verificar" }).click();
    await expect(page.getByText("Certificado válido")).toBeVisible();
    await expect(page.getByText("Quiz Prueba")).toBeVisible();

    await page.goto("/verificar/aaaaaaaaaaaaaaaaaaaa");
    await expect(page.getByText("No encontramos un certificado")).toBeVisible();
  });
});
