import { expect, type Page, test } from "@playwright/test";
import { prisma } from "@/lib/db/prisma";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(process.env.SEED_ADMIN_EMAIL ?? "admin@example.test");
  await page
    .getByLabel("Mật khẩu")
    .fill(process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeAdmin123!");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL("**/admin/events");
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("key pages fit 375, 768, and 1440 pixel viewports", async ({ page }) => {
  const event = await prisma.event.findUniqueOrThrow({
    where: { slug: "demo-open-event" },
    select: { id: true, slug: true }
  });
  await login(page);

  const routes = [
    "/admin/events",
    "/events",
    `/events/${event.slug}/register`,
    `/admin/events/${event.id}`,
    `/admin/events/${event.id}/participants`,
    `/admin/events/${event.id}/scanner`
  ];

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    for (const route of routes) {
      await page.goto(route);
      await page.locator("[data-app-loading]").waitFor({ state: "detached" });
      await expect(page.getByRole("main")).toBeVisible();
      const documentOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(documentOverflow, `${route} overflows at ${width}px`).toBeLessThanOrEqual(1);
    }
  }
});
