import { expect, test } from "@playwright/test";

/**
 * Browser engine (PGlite in a Web Worker) on the public demo page. No database needed:
 * the dataset snapshot and PGlite assets are static files.
 */
test.describe("browser SQL sandbox (demo)", () => {
  test.describe.configure({ mode: "serial" });
  test("loads the dataset and runs the sample query locally", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/demo");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("navegador");
    await expect(page.getByTestId("engine-state")).toHaveText(/listo/i, { timeout: 90_000 });
    await page.getByRole("button", { name: "Ejecutar" }).click();
    const table = page.getByRole("table", { name: /demostración/ });
    await expect(table).toBeVisible({ timeout: 30_000 });
    await expect(table.locator("th", { hasText: "country" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /filas/ })).toContainText(
      "Vista previa",
    );
  });

  test("shows Postgres errors and blocks denied functions", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/demo");
    await expect(page.getByTestId("engine-state")).toHaveText(/listo/i, { timeout: 90_000 });
    const editor = page.getByRole("textbox", { name: /demostración/ });
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("select pg_sleep(1)");
    await page.getByRole("button", { name: "Ejecutar" }).click();
    // The engine can still be warming up on the slower mobile project, so give the gate its own
    // window rather than the default 5 s.
    await expect(page.getByRole("alert").filter({ hasText: "pg_sleep" })).toBeVisible({
      timeout: 60_000,
    });

    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("select nombre from customers");
    await page.getByRole("button", { name: "Ejecutar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "nombre" })).toBeVisible({
      timeout: 60_000,
    });
    // The engine's message is Postgres's; the line under it is the one a learner can act on.
    await expect(page.getByText(/La columna nombre no existe/)).toBeVisible();
  });

  test("runs with the session time zone pinned to UTC", async ({ page }) => {
    test.setTimeout(120_000);
    // D-20: PGlite takes `TimeZone` from the host, and the browser's host is the learner's own
    // machine — anywhere in LATAM. Unpinned, the preview would disagree with the graded engine on
    // any timestamptz result, which is worse than being wrong: it is wrong only for some learners.
    await page.goto("/demo");
    await expect(page.getByTestId("engine-state")).toHaveText(/listo/i, { timeout: 90_000 });
    const editor = page.getByRole("textbox", { name: /demostración/ });
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type(
      "select (timestamptz '2025-07-01 00:00:00+00' + interval '1 month')::text as t",
    );
    await page.getByRole("button", { name: "Ejecutar" }).click();
    const table = page.getByRole("table", { name: /demostración/ });
    await expect(table).toBeVisible({ timeout: 30_000 });
    // The first cell is the row number, so match on the table: the value is unambiguous.
    await expect(table).toContainText("2025-08-01 00:00:00+00");
    // What Etc/GMT+3 returned before the pin — the failure this test exists to rule out.
    await expect(table).not.toContainText("2025-07-31 21:00:00-03");
  });
});
