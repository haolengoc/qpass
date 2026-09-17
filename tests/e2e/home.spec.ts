import { expect, test } from "@playwright/test";

test("home links to both login audiences and upcoming events", async ({ page }) => {
  await page.goto("/");
  await page.locator('header a[href="#upcoming-events"]').click();
  await expect(page).toHaveURL(/#upcoming-events$/);
  await expect(page.locator("#events-title")).toBeInViewport();

  await page.locator('main a[href="/login"]').click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('input[type="password"]')).toBeVisible();

  await page.goto("/");
  await page.locator('main a[href="/admin/login"]').click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("home image, actions and next section fit each viewport", async ({ page }) => {
  for (const [width, height] of [[320, 667], [375, 667], [768, 900], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.locator("main img").evaluate((image: HTMLImageElement) => image.decode());
    await expect(page.locator("#home-title")).toBeInViewport();
    await expect(page.locator('main a[href="/login"]')).toBeInViewport();
    await expect(page.locator('main a[href="/admin/login"]')).toBeInViewport();
    await expect(page.locator("#events-title")).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
  }
});
