import { expect, test, type Page } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  hasLocalSupabase,
  signInAs,
  type TestUser,
} from "./helpers/auth";
import { message, messagePattern } from "./helpers/messages";

async function onboard(page: Page, name: string) {
  await page.goto("/onboarding");
  await page.getByLabel("Nombre para mostrar").fill(name);
  await page.getByLabel("Alias").fill(`u_${Date.now().toString(36).slice(-7)}`);
  // The availability check is debounced (450 ms) and then round-trips to the server; on a
  // loaded machine that exceeds the 5 s default and the helper fails before the journey
  // under test starts. 02-onboarding.spec.ts is where this check is the subject.
  await expect(page.getByText(message("onboarding.aliasStatus.available"))).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("Fecha de nacimiento").fill("1991-05-05");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel(/Términos y condiciones/).check();
  await page.getByLabel(/Política de privacidad/).check();
  await page.getByRole("button", { name: "Terminar y empezar" }).click();
  await expect(page).toHaveURL(/\/aprender/);
}

async function typeSql(page: Page, sql: string) {
  const editor = page.getByRole("textbox", { name: "Editor de SQL" });
  await editor.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type(sql);
}

test.describe("exercise workspace (journeys 3–8)", () => {
  test.skip(!hasLocalSupabase, "Requires a local Supabase stack (E2E_SUPABASE=1).");
  test.describe.configure({ mode: "serial" });

  let user: TestUser;
  test.beforeAll(async ({ browser }) => {
    user = await createTestUser();
    const context = await browser.newContext();
    await signInAs(context, user);
    const page = await context.newPage();
    await onboard(page, "Fede Prueba");
    await context.close();
  });
  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });
  test.beforeEach(async ({ context }) => {
    await signInAs(context, user);
  });

  test("incorrect submission gets categorized feedback, hints unlock, correct submission completes", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto("/ejercicio/explorar-clientes");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Explorar la tabla de clientes",
    );
    // explorar-clientes is in an always-free section: it shows the free-section badge and its
    // explanation, not the allowance counter (the two regimes are mutually exclusive in the header).
    await expect(page.getByText(message("workspace.regime.freeBadge"))).toBeVisible();
    await expect(page.getByText(message("workspace.regime.freeDetail"))).toBeVisible();
    await expect(page.getByText(messagePattern("workspace.regime.countedBadge"))).toHaveCount(0);

    // The expected-column checklist ticks as the local run produces the columns.
    await expect(page.getByRole("code").filter({ hasText: "full_name" }).first()).toBeVisible();

    // Wrong columns → blocking feedback naming the missing columns.
    await typeSql(page, "select id from customers order by id limit 10");
    await page.getByRole("button", { name: "Enviar respuesta" }).click();
    const feedback = page.getByRole("region", { name: message("workspace.feedback.title") });
    await expect(feedback.getByText(message("workspace.feedback.incorrect"))).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/Faltan columnas.*full_name/)).toBeVisible();

    // Hints unlock sequentially and show Markdown; they sit under the results, not behind a tab.
    await page.getByRole("button", { name: "Ver pista 1" }).click();
    await expect(page.getByText("Pista 1")).toBeVisible();
    await page.getByRole("button", { name: "Ver pista 2" }).click();
    await expect(page.getByText("Pista 2")).toBeVisible();

    // Solution unlocks after 2 hints; it lives in a collapsed panel.
    // Open the disclosure by its own state rather than by clicking a label that also appears in
    // the panel body; a click that lands while the panel is re-rendering toggles it shut again.
    const solutionPanel = page.locator("details", { has: page.locator("summary") }).filter({
      hasText: "Solución",
    });
    await solutionPanel.evaluate((el: HTMLDetailsElement) => (el.open = true));
    await page.getByRole("button", { name: "Ver la solución explicada" }).click();
    // The alternatives carry their own <pre> and may use the same clause, so match the reference
    // solution by position — the panel's own <pre> — rather than by text that is not unique.
    await expect(solutionPanel.locator("> div > pre")).toHaveText(/ORDER BY id/);

    // Correct submission (order matters here).
    await typeSql(page, "SELECT id, full_name, country FROM customers ORDER BY id LIMIT 10");
    await page.getByRole("button", { name: "Enviar respuesta" }).click();
    // The same sentence is announced three times (the status line, the verdict and the feedback
    // panel), so scope it to the panel instead of matching it page-wide.
    await expect(feedback.getByText(message("workspace.feedback.correct"))).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(message("workspace.completedBanner"))).toBeVisible();
    // Solution was revealed → 25% of 10 XP = 3 XP, 0 coins (docs/CONTENT_GUIDELINES.md §6).
    await expect(
      page.getByText(message("workspace.rewardEarned", { xp: 3, coins: 0 })),
    ).toBeVisible();

    // Progress is reflected on the path and the dashboard.
    await page.goto("/ruta");
    await expect(page.getByText("Completada").first()).toBeVisible();
    await page.goto("/aprender");
    await expect(page.getByText("1 día")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continuar" })).toBeVisible();
    await page.goto("/logros");
    await expect(page.getByText("Primera consulta")).toBeVisible();
    await page.goto("/historial");
    await expect(page.getByText("Correcto").first()).toBeVisible();
  });

  test("the sixth gated exercise is locked server-side (free limit)", async ({ page }) => {
    test.setTimeout(180_000);
    // Every exercise here must come from a gated section: those in `limits.freeExerciseSections`
    // are always free and never consume the allowance, so opening five of them locks nothing.
    for (const slug of [
      "clientes-de-uruguay",
      "paises-con-clientes",
      "tiendas-en-espanol",
      "pedidos-problematicos-del-partner",
      "ultimos-clientes-registrados",
    ]) {
      await page.goto(`/ejercicio/${slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    await page.goto("/ejercicio/productos-agotados-activos");
    // The paywall is a labelled region with its own heading; assert the heading, not a sentence.
    await expect(
      page.getByRole("heading", { level: 2, name: messagePattern("workspace.locked.title") }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: message("workspace.locked.cta") })).toBeVisible();
    // Previously started exercises remain accessible.
    await page.goto("/ejercicio/clientes-de-uruguay");
    await expect(page.getByRole("button", { name: "Enviar respuesta" })).toBeVisible();
  });
});
