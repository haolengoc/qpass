import { expect, test } from "@playwright/test";
import { prisma } from "@/lib/db/prisma";

const email = `access-${crypto.randomUUID()}@example.test`;
const password = "Participant-Access-Test-123!";

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

test("anonymous access is blocked and signup cannot grant staff privileges", async ({ page, request }) => {
  for (const path of ["/admin", "/admin/events", "/admin/events/new"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain("/admin/login");
  }
  expect((await request.post("/api/events/00000000-0000-0000-0000-000000000000/registrations", { data: {} })).status()).toBe(401);
  const signup = await request.post("/api/accounts", {
    data: { name: "Access Test Participant", email, password, role: "ADMIN" }
  });
  expect(signup.status()).toBe(201);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  expect(user.role).toBe("PARTICIPANT");
  expect(user.passwordHash).not.toBe(password);
  expect((await request.post("/api/accounts", {
    data: { name: "Duplicate", email: email.toUpperCase(), password }
  })).status()).toBe(409);

  await page.goto("/login?callbackUrl=//example.com");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL("/events");
  for (const path of ["/login", "/signup"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/events");
    await expect(page.getByRole("link", { name: "Đăng nhập người tham gia", exact: true })).toHaveCount(0);
  }
  expect((await page.request.get("/api/admin/events")).status()).toBe(403);

  // A current database role, not just the JWT role, controls admin API access.
  await prisma.user.update({ where: { id: user.id }, data: { role: "ORGANIZER" } });
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL("/admin/events");
  for (const path of ["/login", "/admin/login", "/signup"]) {
    await page.goto(path);
    await expect(page).toHaveURL("/admin/events");
  }
  expect((await page.request.get("/api/admin/events")).status()).toBe(200);
  await prisma.user.update({ where: { id: user.id }, data: { role: "PARTICIPANT" } });
  expect((await page.request.get("/api/admin/events")).status()).toBe(403);

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/login", "/signup", "/admin/login"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    await page.screenshot({ path: `test-results/auth-${width}.png`, fullPage: true });
  }
});
