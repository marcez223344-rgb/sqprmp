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

async function onboard(page: Page, name: string, aliasPrefix: string) {
  await page.goto("/onboarding");
  await page.getByLabel("Nombre para mostrar").fill(name);
  await page.getByLabel("Alias").fill(`${aliasPrefix}_${Date.now().toString(36).slice(-6)}`);
  await expect(page.getByText("Disponible")).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel("Fecha de nacimiento").fill("1990-09-09");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByLabel(/Términos y condiciones/).check();
  await page.getByLabel(/Política de privacidad/).check();
  await page.getByRole("button", { name: "Terminar y empezar" }).click();
  await expect(page).toHaveURL(/\/aprender/);
}

/** Journey 13 (admin tools): metrics, users, flags, promo codes, audit log; learners are kept out. */
test.describe("admin tools", () => {
  test.skip(!hasLocalSupabase, "Requires a local Supabase stack (E2E_SUPABASE=1).");
  test.describe.configure({ mode: "serial" });

  let admin: TestUser;
  let learner: TestUser;
  let service: SupabaseClient;
  const promo = `E2E-${Date.now().toString(36).toUpperCase()}`;

  test.beforeAll(async ({ browser }) => {
    service = createClient(e2eSupabase.url, e2eSupabase.secretKey, {
      auth: { persistSession: false },
    });
    admin = await createTestUser("adm");
    learner = await createTestUser("lrn");
    for (const [u, prefix] of [
      [admin, "adm"],
      [learner, "lrn"],
    ] as const) {
      const context = await browser.newContext();
      await signInAs(context, u);
      await onboard(
        await context.newPage(),
        prefix === "adm" ? "Admin E2E" : "Learner E2E",
        prefix,
      );
      await context.close();
    }
    await service.from("profiles").update({ role: "admin" }).eq("id", admin.id);
  });
  test.afterAll(async () => {
    await service.from("promo_codes").delete().eq("code", promo);
    await service.from("feature_flags").delete().eq("key", "leaderboards");
    for (const u of [admin, learner]) if (u) await deleteTestUser(u.id);
  });

  test("hub and metrics render for admins", async ({ context, page }) => {
    await signInAs(context, admin);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Administración");
    await expect(page.getByRole("link", { name: "Métricas" })).toBeVisible();
    await page.goto("/admin/metricas");
    await expect(page.getByText("Altas últimos 7 días")).toBeVisible();
    await expect(page.getByText("Retención D7")).toBeVisible();
  });

  test("user lookup shows a learner's detail", async ({ context, page }) => {
    await signInAs(context, admin);
    await page.goto("/admin/usuarios");
    await page.getByLabel("Alias, email o id").fill(learner.email);
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByRole("link", { name: "Ver detalle" }).first().click();
    await expect(page.getByText("Learner E2E")).toBeVisible();
    await expect(page.getByText("0 completados de 0 iniciados")).toBeVisible();
  });

  test("feature flag change is saved and audited", async ({ context, page }) => {
    await signInAs(context, admin);
    await page.goto("/admin/flags");
    const row = page.getByRole("row", { name: /leaderboards/ });
    await row.getByLabel("Activar leaderboards").check();
    page.once("dialog", (d) => d.accept("prueba e2e"));
    await row.getByRole("button", { name: "Guardar" }).click();
    await expect(row.getByText("Flag guardado.")).toBeVisible();
    await page.goto("/admin/auditoria?action=feature_flag");
    await expect(page.getByText("feature_flag.set").first()).toBeVisible();
    await expect(page.getByText("prueba e2e").first()).toBeVisible();
  });

  test("promo code can be created, deactivated and is rejected when inactive", async ({
    browser,
    context,
    page,
  }) => {
    await signInAs(context, admin);
    await page.goto("/admin/promos");
    await page.getByLabel("Código").fill(promo);
    await page.getByLabel("Días de acceso").fill("30");
    await page.getByLabel("Canjes máximos").fill("1");
    await page.getByRole("button", { name: "Crear" }).click();
    await expect(page.getByText("Código creado.")).toBeVisible();
    const row = page.getByRole("row", { name: new RegExp(promo) });
    await row.getByRole("button", { name: "Desactivar" }).click();
    await expect(row.getByText("Código actualizado.")).toBeVisible();

    const learnerContext = await browser.newContext();
    await signInAs(learnerContext, learner);
    const learnerPage = await learnerContext.newPage();
    await learnerPage.goto("/acceso");
    await learnerPage.getByLabel("Código", { exact: true }).fill(promo);
    await learnerPage.getByRole("button", { name: "Aplicar" }).click();
    await expect(learnerPage.getByText("El código no existe.")).toBeVisible();
    await learnerContext.close();
  });

  test("learners cannot open admin tools", async ({ context, page }) => {
    await signInAs(context, learner);
    for (const path of ["/admin", "/admin/metricas", "/admin/usuarios", "/admin/flags"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/aprender/);
    }
  });
});
