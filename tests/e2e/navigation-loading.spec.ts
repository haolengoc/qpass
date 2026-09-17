import { expect, test } from "@playwright/test";

test("shows corner feedback while navigation is waiting for the server", async ({ page }) => {
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
  await page.route((url) => url.pathname === "/login", async (route) => {
    if (route.request().headers().rsc === "1") await responseGate;
    await route.continue();
  });

  try {
    await page.goto("/");
    await expect(page.locator("#home-title")).toBeVisible();
    await expect(page.locator("[data-navigation-indicator]")).toHaveCount(0);
    const loginLink = page.locator('main a[href="/login"]');
    await loginLink.focus();
    await page.keyboard.press("Enter");

    const indicator = page.locator("[data-navigation-indicator]");
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveText("Đang tải…");
    await expect(indicator).toHaveAttribute("role", "status");
    // Check the portal stays in the viewport even inside an animated button.
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const box = await indicator.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x).toBeLessThan(40);
      expect(box!.y).toBeGreaterThan(800);
      expect(box!.y + box!.height).toBeLessThanOrEqual(900);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".qpass-navigation-spinner")).toHaveCSS("animation-name", "none");
    await page.screenshot({ path: "test-results/navigation-loading.png", animations: "disabled" });

    releaseResponse();
    await expect(page.getByLabel("Mật khẩu", { exact: true })).toBeVisible();
    await expect(indicator).toHaveCount(0);
  } finally {
    releaseResponse();
  }
});

test("hash links, current-page links, and new tabs do not leave loading feedback", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#home-title")).toBeVisible();
  await page.locator('header a[href="#upcoming-events"]').click();
  await expect(page).toHaveURL(/#upcoming-events$/);
  await expect(page.locator("[data-navigation-indicator]")).toHaveCount(0);

  await page.getByRole("link", { name: "QPass — Trang chủ", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.locator("[data-navigation-indicator]")).toHaveCount(0);
  await page.getByRole("link", { name: "QPass — Trang chủ", exact: true }).click();
  await expect(page.locator("[data-navigation-indicator]")).toHaveCount(0);

  const popupPromise = page.context().waitForEvent("page");
  await page.locator('main a[href="/login"]').click({ modifiers: ["ControlOrMeta"] });
  const popup = await popupPromise;
  await expect(page).toHaveURL("/");
  await expect(page.locator("[data-navigation-indicator]")).toHaveCount(0);
  await popup.close();
});
