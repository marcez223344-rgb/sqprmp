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
    await expect(page.getByRole("alert").filter({ hasText: "nombre" })).toBeVisible();
  });
});
