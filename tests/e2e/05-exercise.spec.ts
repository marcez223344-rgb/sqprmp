import { expect, test, type Page } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  hasLocalSupabase,
  signInAs,
  type TestUser,
} from "./helpers/auth";

async function onboard(page: Page, name: string) {
  await page.goto("/onboarding");
  await page.getByLabel("Nombre para mostrar").fill(name);
  await page.getByLabel("Alias").fill(`u_${Date.now().toString(36).slice(-7)}`);
  await expect(page.getByText("Disponible")).toBeVisible();
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
    // explorar-clientes is in an always-free section: it shows the free badge, not the counter.
    await expect(page.getByText("Ejercicio gratis")).toBeVisible();

    // The expected-column checklist ticks as the local run produces the columns.
    await expect(page.getByRole("code").filter({ hasText: "full_name" }).first()).toBeVisible();

    // Wrong columns → blocking feedback naming the missing columns.
    await typeSql(page, "select id from customers order by id limit 10");
    await page.getByRole("button", { name: "Enviar respuesta" }).click();
    const feedback = page.getByRole("region", { name: "Retroalimentación" });
    await expect(feedback.getByText("Todavía no", { exact: false }).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/Faltan columnas.*full_name/)).toBeVisible();

    // Hints unlock sequentially and show Markdown; they sit under the results, not behind a tab.
    await page.getByRole("button", { name: "Ver pista 1" }).click();
    await expect(page.getByText("Pista 1")).toBeVisible();
    await page.getByRole("button", { name: "Ver pista 2" }).click();
    await expect(page.getByText("Pista 2")).toBeVisible();

    // Solution unlocks after 2 hints; it lives in a collapsed panel.
    await page.locator("summary").filter({ hasText: "Solución" }).click();
    await page.getByRole("button", { name: "Ver la solución explicada" }).click();
    await expect(page.locator("pre", { hasText: "ORDER BY id" })).toBeVisible();

    // Correct submission (order matters here).
    await typeSql(page, "SELECT id, full_name, country FROM customers ORDER BY id LIMIT 10");
    await page.getByRole("button", { name: "Enviar respuesta" }).click();
    await expect(page.getByText("¡Correcto!")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Ejercicio completado")).toBeVisible();
    // Solution was revealed → 25% of 10 XP = 3 XP, 0 coins (docs/CONTENT_GUIDELINES.md §6).
    await expect(page.getByText("+3 XP · +0 monedas")).toBeVisible();

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
    for (const slug of [
      "tipos-en-pedidos",
      "catalogo-de-categorias",
      "vendedores-basico",
      "columnas-en-orden",
    ]) {
      await page.goto(`/ejercicio/${slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    await page.goto("/ejercicio/explorar-productos");
    await expect(page.getByText("Alcanzaste el límite gratuito")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver precios" })).toBeVisible();
    // Previously started exercises remain accessible.
    await page.goto("/ejercicio/columnas-en-orden");
    await expect(page.getByRole("button", { name: "Enviar respuesta" })).toBeVisible();
  });
});
