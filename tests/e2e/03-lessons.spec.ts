import { expect, test } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  hasLocalSupabase,
  signInAs,
  type TestUser,
} from "./helpers/auth";

test.describe("curriculum and lessons", () => {
  test("public curriculum lists all sections", async ({ page }) => {
    test.skip(!hasLocalSupabase, "Requires a local Supabase stack (E2E_SUPABASE=1).");
    await page.goto("/curriculo");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Currículo");
    await expect(page.getByText("Sección 39")).toBeVisible();
    await expect(page.getByText("Próximamente").first()).toBeVisible();
  });

  test.describe("as an onboarded learner", () => {
    test.skip(!hasLocalSupabase, "Requires a local Supabase stack (E2E_SUPABASE=1).");
    let user: TestUser;
    test.beforeEach(async ({ context, page }) => {
      user = await createTestUser();
      await signInAs(context, user);
      // Complete onboarding quickly through the UI (journey 2 is covered in 02-onboarding).
      await page.goto("/onboarding");
      await page.getByLabel("Nombre para mostrar").fill("Eva Prueba");
      await page.getByLabel("Alias").fill(`eva_${Date.now().toString(36).slice(-6)}`);
      await expect(page.getByText("Disponible")).toBeVisible();
      await page.getByRole("button", { name: "Siguiente" }).click();
      await page.getByLabel("Fecha de nacimiento").fill("1992-02-02");
      await page.getByRole("button", { name: "Siguiente" }).click();
      await page.getByLabel(/Términos y condiciones/).check();
      await page.getByLabel(/Política de privacidad/).check();
      await page.getByRole("button", { name: "Terminar y empezar" }).click();
      await expect(page).toHaveURL(/\/aprender/);
    });
    test.afterEach(async () => {
      if (user) await deleteTestUser(user.id);
    });

    test("reads a free lesson and marks it complete", async ({ page }) => {
      await page.goto("/ruta");
      await page.getByRole("link", { name: /SELECT: elegir columnas/ }).click();
      await expect(page).toHaveURL(/\/leccion\/select-columnas/);
      await expect(page.getByRole("heading", { level: 1 })).toContainText("SELECT");
      await expect(page.locator("pre code").first()).toBeVisible();
      await page.getByRole("button", { name: "Marcar como completada" }).click();
      await expect(page.getByRole("status")).toContainText("Lección completada");

      await page.goto("/ruta");
      await expect(page.getByText("Completada").first()).toBeVisible();
    });

    test("quiz lessons show the question count and unpublished lessons 404", async ({ page }) => {
      await page.goto("/leccion/select-quiz");
      await expect(page.getByText(/10 preguntas/)).toBeVisible();
      // The route streams its shell before notFound() runs, so the HTTP status stays 200;
      // what matters to the learner is that the not-found page is rendered.
      await page.goto("/leccion/no-existe");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/no encontr/i);
    });
  });
});
