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
import { message, messagePattern } from "./helpers/messages";

async function onboard(page: Page, name: string) {
  const alias = `p_${Date.now().toString(36).slice(-7)}`;
  await page.goto("/onboarding");
  await page.getByLabel("Nombre para mostrar").fill(name);
  await page.getByLabel("Alias").fill(alias);
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
  return alias;
}

/** Journeys 9–10: manual transfer → admin approval → premium access; plus webhook security. */
test.describe("payments and entitlements", () => {
  test.skip(!hasLocalSupabase, "Requires a local Supabase stack (E2E_SUPABASE=1).");
  test.describe.configure({ mode: "serial" });

  let learner: TestUser;
  let admin: TestUser;
  let learnerAlias = "";

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
      const alias = await onboard(page, u === admin ? "Admin Prueba" : "Learner Prueba");
      if (u === learner) learnerAlias = alias;
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
    await expect(
      page.getByRole("heading", { level: 2, name: messagePattern("workspace.locked.title") }),
    ).toBeVisible();

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
    // The justification is asked for in an accessible <dialog>, not in window.prompt, so a
    // `page.on("dialog")` handler never fires and the approval never ran. Approve the row that
    // belongs to *this* learner: earlier runs leave their own pending transfers behind, and
    // `.first()` silently approved someone else's.
    const approve = message("admin.access.pending.approve");
    const row = adminPage.getByRole("row", { name: new RegExp(learnerAlias) });
    await row.getByRole("button", { name: approve }).click();
    const reason = adminPage.getByRole("dialog", { name: approve });
    await reason
      .getByRole("textbox", { name: message("admin.access.notePrompt") })
      .fill("comprobante ok");
    await reason.getByRole("button", { name: approve }).click();
    await expect(adminPage.getByText(message("admin.access.approved"))).toBeVisible();
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
