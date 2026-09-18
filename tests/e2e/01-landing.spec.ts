import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("renders hero, navigation and CTAs", async ({ page, isMobile }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("SQL");
    await expect(page.getByRole("link", { name: /empieza gratis con google/i })).toBeVisible();

    if (isMobile) {
      await page.getByRole("button", { name: /abrir menú/i }).click();
      await expect(page.getByRole("navigation", { name: "Principal (móvil)" })).toBeVisible();
    } else {
      await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
    }
  });

  test("sends security headers", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["content-security-policy"]).toContain("script-src 'self' 'nonce-");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
  });

  test("skip link receives keyboard focus first", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard navigation is verified on desktop.");
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /ir al contenido/i })).toBeFocused();
  });

  test("protected routes redirect to login", async ({ page }) => {
    const res = await page.goto("/aprender");
    expect(res?.url()).toContain("/ingresar?next=%2Faprender");
  });

  test("has no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
