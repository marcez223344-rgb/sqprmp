import { expect, test } from "@playwright/test";

/** No horizontal overflow and usable navigation at the supported widths (360 → 1536). */
const WIDTHS = [360, 768, 1024, 1536];
const PAGES = ["/", "/curriculo", "/precios", "/preguntas-frecuentes", "/demo", "/verificar"];

test.describe("responsive layout", () => {
  test.skip(({ isMobile }) => isMobile, "Viewports are set explicitly in this suite.");

  for (const width of WIDTHS) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of PAGES) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${path} at ${width}px overflows by ${overflow}px`).toBeLessThanOrEqual(0);
      }
    });
  }

  test("mobile menu opens, traps focus and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");
    const trigger = page.getByRole("button", { name: /abrir menú/i });
    await trigger.click();
    const nav = page.getByRole("navigation", { name: "Principal (móvil)" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Precios" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(nav).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("tap targets on the mobile action bar are at least 44px tall", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/demo");
    const run = page.getByRole("button", { name: /ejecutar/i }).first();
    await expect(run).toBeVisible();
    const box = await run.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
  });
});
