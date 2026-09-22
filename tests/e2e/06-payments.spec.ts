import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  createTestUser,
  deleteTestUser,
  e2eSupabase,
  hasLocalSupabase,
  signInAs,
  type TestUser,
} from "./helpers/auth";

async function onboard(page: Page, name: string) {
  await page.goto("/onboarding");
  await page.getByLabel("Nombre para mostrar").fill(name);
  await page.getByLabel("Alias").fill(`p_${Date.now().toString(36).slice(-7)}`);
  await expect(page.getByText("Disponible")).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("Fecha de nacimiento").fill("1990-09-09");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel(/Términos y condiciones/).check();
  await page.getByLabel(/Política de privacidad/).check();
  await page.getByRole("button", { name: "Terminar y empezar" }).click();
  await expect(page).toHaveURL(/\/aprender/);
}

/** Journeys 9–10: manual transfer → admin approval → premium access; plus webhook security. */
test.describe("payments and entitlements", () => {
  test.skip(!hasLocalSupabase, "Requires a local Supabase stack (E2E_SUPABASE=1).");
  test.describe.configure({ mode: "serial" });

  let learner: TestUser;
  let admin: TestUser;

  test.beforeAll(async ({ browser }) => {
    learner = await createTestUser("learner");
    admin = await createTestUser("admin");
    const service = createClient(e2eSupabase.url, e2eSupabase.secretKey, {
      auth: { persistSession: false },
    });
    for (const u of [learner, admin]) {
      const context = await browser.newContext();
      await signInAs(context, u);
      const page = await context.newPage();
      await onboard(page, u === admin ? "Admin Prueba" : "Learner Prueba");
      await context.close();
    }
    await service.from("profiles").update({ role: "admin" }).eq("id", admin.id);
  });
  test.afterAll(async () => {
    for (const u of [learner, admin]) if (u) await deleteTestUser(u.id);
  });

  test("learner requests a manual purchase and sees it pending", async ({ context, page }) => {
    await signInAs(context, learner);
    // Exhaust the free allowance first so the paywall is real. These must be *gated* exercises:
    // the intro sections are always free and never touch the allowance.
    for (const slug of [
      "codigos-de-categoria",
      "neto-y-porcentaje-de-envio",
      "tiendas-en-espanol",
      "categorias-padre",
      "cobertura-de-transportistas",
    ]) {
      await page.goto(`/ejercicio/${slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    await page.goto("/ejercicio/paises-con-clientes");
    await expect(page.getByText("Alcanzaste el límite gratuito")).toBeVisible();

    await page.goto("/precios");
    await page.getByRole("button", { name: "Wallbit (USD)" }).click();
    await page.getByRole("button", { name: "Ya pagué" }).click();
    await expect(page.getByText(/Tu código de referencia: DM-/)).toBeVisible();
    await page.goto("/acceso");
    await expect(page.getByText("Pago pendiente de revisión")).toBeVisible();
  });

  test("admin approves the transfer and the learner gains access", async ({
    browser,
    context,
    page,
  }) => {
    const adminContext = await browser.newContext();
    await signInAs(adminContext, admin);
    const adminPage = await adminContext.newPage();
    await adminPage.goto("/admin/accesos");
    await expect(adminPage.getByRole("heading", { level: 1 })).toContainText("Accesos");
    adminPage.once("dialog", (d) => d.accept("comprobante ok"));
    await adminPage.getByRole("button", { name: "Aprobar" }).first().click();
    await expect(adminPage.getByText("Pago aprobado")).toBeVisible();
    await adminContext.close();

    await signInAs(context, learner);
    await page.goto("/acceso");
    await expect(page.getByText("Acceso completo de por vida")).toBeVisible();
    await page.goto("/ejercicio/paises-con-clientes");
    await expect(page.getByRole("button", { name: "Enviar respuesta" })).toBeVisible();
  });

  test("non-admins cannot open admin pages; webhooks reject bad tokens", async ({
    context,
    page,
    request,
  }) => {
    await signInAs(context, learner);
    await page.goto("/admin/accesos");
    await expect(page).toHaveURL(/\/aprender/);
    const res = await request.post("/api/webhooks/hotmart", {
      headers: { "content-type": "application/json", "x-hotmart-hottok": "wrong" },
      data: {
        id: "evt-e2e",
        event: "PURCHASE_APPROVED",
        data: { purchase: { transaction: "HPX" } },
      },
    });
    expect(res.status()).toBe(401);
  });
});
