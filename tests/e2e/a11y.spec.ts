import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  hasLocalSupabase,
  signInAs,
  type TestUser,
} from "./helpers/auth";

/**
 * Automated WCAG 2.2 AA checks (axe-core) on the key pages. Manual keyboard/screen-reader
 * checks live in docs/reviews/<date>-accessibility.md. Public pages run everywhere; the
 * authenticated ones need the local Supabase stack.
 */
const PUBLIC_PAGES = [
  "/",
  "/curriculo",
  "/precios",
  "/como-funciona",
  "/nosotros",
  "/preguntas-frecuentes",
  "/terminos",
  "/privacidad",
  "/verificar",
  "/ingresar",
  "/demo",
];

async function expectNoViolations(page: Page, path: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    // CodeMirror's contenteditable and results grid are reviewed manually.
    .exclude(".cm-editor")
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`,
  );
  expect(summary, `${path} should have no axe violations`).toEqual([]);
}

test.describe("accessibility — public pages", () => {
  for (const path of PUBLIC_PAGES) {
    test(`axe: ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoViolations(page, path);
    });
  }
});

test.describe("accessibility — learner pages", () => {
  test.skip(!hasLocalSupabase, "Requires a local Supabase stack (E2E_SUPABASE=1).");
  let user: TestUser;
  test.beforeAll(async () => {
    user = await createTestUser("a11y");
  });
  test.afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("axe: onboarding", async ({ context, page }) => {
    await signInAs(context, user);
    await page.goto("/onboarding");
    await expectNoViolations(page, "/onboarding");
  });

  test("axe: dashboard, path, lesson, exercise, certificates", async ({ context, page }) => {
    await signInAs(context, user);
    await page.goto("/onboarding");
    await page.getByLabel("Nombre para mostrar").fill("A11y Prueba");
    await page.getByLabel("Alias").fill(`ax_${Date.now().toString(36).slice(-6)}`);
    await expect(page.getByText("Disponible")).toBeVisible();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByLabel("Fecha de nacimiento").fill("1990-09-09");
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByLabel(/Términos y condiciones/).check();
    await page.getByLabel(/Política de privacidad/).check();
    await page.getByRole("button", { name: "Terminar y empezar" }).click();
    await expect(page).toHaveURL(/\/aprender/);
    for (const path of [
      "/aprender",
      "/ruta",
      "/leccion/select-columnas",
      "/ejercicio/catalogo-de-categorias",
      "/certificados",
      "/acceso",
      "/perfil",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoViolations(page, path);
    }
  });
});
