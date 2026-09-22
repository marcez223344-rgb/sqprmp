import { expect, test } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  hasLocalSupabase,
  signInAs,
  type TestUser,
} from "./helpers/auth";

test.describe("identity and onboarding (journeys 1–2)", () => {
  test.skip(!hasLocalSupabase, "Requires a local Supabase stack (E2E_SUPABASE=1).");

  let user: TestUser;
  test.beforeEach(async ({ context }) => {
    user = await createTestUser();
    await signInAs(context, user);
  });
  test.afterEach(async () => {
    if (user) await deleteTestUser(user.id);
  });

  test("new user is sent to onboarding and completes it", async ({ page }) => {
    await page.goto("/aprender");
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Configura tu perfil");

    // Step 1 — identity
    const alias = `prueba_${Date.now().toString(36).slice(-6)}`;
    await page.getByLabel("Nombre para mostrar").fill("Persona Prueba");
    await page.getByLabel("Alias").fill(alias);
    await expect(page.getByText("Disponible")).toBeVisible();
    await page.getByRole("button", { name: "Siguiente" }).click();

    // Step 2 — about
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Sobre ti");
    await page.getByLabel("País").selectOption("MX");
    await page.getByLabel("Fecha de nacimiento").fill("1994-06-15");
    await page.getByLabel("Tu nivel de SQL hoy").selectOption("intermediate");
    await page.getByRole("button", { name: "Siguiente" }).click();

    // Step 3 — consent: submitting without consent shows errors
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Consentimiento");
    await page.getByRole("button", { name: "Terminar y empezar" }).click();
    await expect(page.getByRole("alert").first()).toContainText("aceptación");
    await page.getByLabel(/Términos y condiciones/).check();
    await page.getByLabel(/Política de privacidad/).check();
    await page.getByRole("button", { name: "Terminar y empezar" }).click();

    await expect(page).toHaveURL(/\/aprender/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hola, Persona Prueba");

    // Profile page shows data and privacy controls
    await page.goto("/perfil");
    // The header badge is hidden below sm, so assert the alias inside the profile page itself.
    await expect(page.getByRole("main").getByText(`@${alias}`).first()).toBeVisible();
    await expect(page.getByLabel("Nombre para mostrar")).toHaveValue("Persona Prueba");
    await page.getByRole("button", { name: "Solicitar exportación" }).click();
    await expect(page.getByRole("status").last()).toContainText("registrada");

    // Sign out
    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/\/$/);
    const res = await page.goto("/perfil");
    expect(res?.url()).toContain("/ingresar");
  });

  test("rejects a blocklisted alias", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel("Alias").fill("admin_x");
    await expect(page.getByText("No disponible")).toBeVisible();
  });
});
