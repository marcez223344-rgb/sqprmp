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
import { message } from "./helpers/messages";

async function onboard(page: Page, name: string, aliasPrefix: string) {
  const alias = `${aliasPrefix}_${Date.now().toString(36).slice(-6)}`;
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

/** Journey 13 (admin tools): metrics, users, flags, promo codes, audit log; learners are kept out. */
test.describe("admin tools", () => {
  test.skip(!hasLocalSupabase, "Requires a local Supabase stack (E2E_SUPABASE=1).");
  test.describe.configure({ mode: "serial" });

  let admin: TestUser;
  let learner: TestUser;
  let service: SupabaseClient;
  let learnerAlias = "";
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
      const alias = await onboard(
        await context.newPage(),
        prefix === "adm" ? "Admin E2E" : "Learner E2E",
        prefix,
      );
      if (prefix === "lrn") learnerAlias = alias;
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

  test("the user directory lists learners by default and opens a detail", async ({
    context,
    page,
  }) => {
    await signInAs(context, admin);
    await page.goto("/admin/usuarios");
    // Since 20260923150000_admin_user_directory the page is a directory, not a search box: every
    // learner is listed without typing anything, newest first.
    const table = page.getByRole("region", { name: message("admin.users.table.caption") });
    await expect(table.getByRole("row", { name: new RegExp(learnerAlias) })).toBeVisible();

    // The search box still resolves an exact email through admin_find_user, and that match is the
    // only place an email is ever rendered.
    await page.getByLabel(message("admin.users.query")).fill(learner.email);
    await page.getByRole("button", { name: message("admin.users.filters.apply") }).click();
    const match = page.getByRole("link", { name: message("admin.users.open"), exact: true });
    await expect(match).toBeVisible();
    await match.click();

    await expect(page.getByText("Learner E2E").first()).toBeVisible();
    await expect(
      page.getByText(message("admin.users.progressValue", { completed: 0, started: 0 })),
    ).toBeVisible();
  });

  test("feature flag change is saved and audited", async ({ context, page }) => {
    await signInAs(context, admin);
    await page.goto("/admin/flags");
    const key = "leaderboards";
    const save = message("admin.flags.save");
    const row = page.getByRole("row", { name: new RegExp(key) });
    // "Guardar" only enables when the row is dirty. An aborted earlier run can leave the flag
    // already enabled in the database, and `check()` on an enabled box changes nothing, so the
    // button stayed disabled forever. Toggle to the opposite of whatever is stored.
    const toggle = row.getByLabel(message("admin.flags.enabledFor", { key }));
    await toggle.setChecked(!(await toggle.isChecked()));
    // Privileged mutations ask for their audit reason in an accessible <dialog>; window.prompt is
    // gone, so a `page.on("dialog")` handler is never called and the save never happened.
    await row.getByRole("button", { name: save }).click();
    const reason = page.getByRole("dialog", { name: message("admin.flags.reasonTitle", { key }) });
    await reason
      .getByRole("textbox", { name: message("admin.flags.reasonPrompt") })
      .fill("prueba e2e");
    await reason.getByRole("button", { name: save }).click();
    await expect(row.getByText(message("admin.flags.saved"))).toBeVisible();
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
    // Owner feedback item 19: the code is generated by default, so the code field only exists
    // after opting into writing one. `exact` matters — "Escribir un código propio" also contains
    // the word the code field is labelled with.
    await page.getByLabel(message("admin.promos.form.customCode")).check();
    await page.getByLabel(message("admin.promos.form.code"), { exact: true }).fill(promo);
    await page.getByLabel(message("admin.promos.form.accessDays")).fill("30");
    // D-39: the cap arrives pre-filled with 1 and unlimited needs its own tick, so the code you
    // get by not touching the field is the safe one.
    const cap = page.getByLabel(message("admin.promos.form.maxRedemptions"));
    await expect(cap).toHaveValue("1");
    const unlimited = page.getByLabel(message("admin.promos.form.unlimited"));
    await unlimited.check();
    await expect(cap).toBeDisabled();
    await unlimited.uncheck();
    await expect(cap).toBeEnabled();
    await page.getByRole("button", { name: message("admin.promos.form.submit") }).click();
    await expect(page.getByText(message("admin.promos.form.done"))).toBeVisible();
    const row = page.getByRole("row", { name: new RegExp(promo) });
    await row.getByRole("button", { name: message("admin.promos.deactivate") }).click();
    await expect(row.getByText(message("admin.promos.updated"))).toBeVisible();

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
