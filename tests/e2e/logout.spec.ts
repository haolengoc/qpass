import { expect, type Page, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

const suffix = crypto.randomUUID();
const password = "Logout-Test-123!";
const roles = ["PARTICIPANT", "ORGANIZER", "ADMIN"] as const;
type Role = typeof roles[number];
const email = (role: Role) => `logout-${role.toLowerCase()}-${suffix}@example.test`;

test.beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.createMany({ data: roles.map(role => ({
    name: `Logout ${role}`, email: email(role), passwordHash, role
  })) });
});

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: roles.map(email) } } });
  await prisma.$disconnect();
});

async function login(page: Page, role: Role) {
  await page.goto(role === "PARTICIPANT" ? "/login" : "/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(email(role));
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(role === "PARTICIPANT" ? "/events" : "/admin/events");
}

async function expectSignedOut(page: Page, origin: string, expectToast = true) {
  await expect(page).toHaveURL(`${origin}/`);
  await expect(page.locator("#home-title")).toBeVisible();
  await expect(page.locator('main a[href="/login"]')).toBeVisible();
  if (expectToast) {
    await expect(page.getByRole("status").filter({ hasText: "Đăng xuất thành công" })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toHaveCount(0);
  expect(await (await page.request.get("/api/auth/session")).json()).not.toHaveProperty("user");
  expect((await page.request.get("/api/admin/events")).status()).toBe(401);
  await page.reload();
  await expect(page.locator('main a[href="/login"]')).toBeVisible();
}

for (const role of roles) {
  test(`${role}: logo opens home without losing session; logout stays on the current origin`, async ({ page }) => {
    await login(page, role);
    const origin = new URL(page.url()).origin;
    await page.getByRole("link", { name: "QPass — Trang chủ", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/`);
    await expect(page.locator("#home-title")).toBeVisible();
    await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toBeVisible();
    await expect(page.locator("main").getByRole("link", {
      name: role === "PARTICIPANT" ? "Khám phá sự kiện" : "Quản lý sự kiện", exact: true
    })).toHaveAttribute("href", role === "PARTICIPANT" ? "/events" : "/admin/events");
    expect((await (await page.request.get("/api/auth/session")).json()).user.email).toBe(email(role));

    await page.evaluate(() => {
      sessionStorage.setItem("registration-success:test", "receipt");
      sessionStorage.setItem("registration-receipt:test", "receipt");
      sessionStorage.setItem("unrelated-preference", "keep");
    });
    // Preserve the real server's cookie deletion, but simulate a stale configured origin.
    await page.route("**/api/auth/signout", async route => {
      const response = await route.fetch();
      await route.fulfill({ response, json: { url: "http://127.0.0.1:1/" } });
    });
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    await expectSignedOut(page, origin);
    expect(await page.evaluate(() => ({
      success: sessionStorage.getItem("registration-success:test"),
      receipt: sessionStorage.getItem("registration-receipt:test"),
      preference: sessionStorage.getItem("unrelated-preference")
    }))).toEqual({ success: null, receipt: null, preference: "keep" });
    await page.goto(role === "PARTICIPANT" ? "/events" : "/admin/events");
    await expect(page).toHaveURL(role === "PARTICIPANT" ? /\/login\?/ : /\/admin\/login\?/);
  });
}

test("failed logout allows retry and unavailable browser storage does not block sign-out", async ({ page }) => {
  await login(page, "PARTICIPANT");
  const origin = new URL(page.url()).origin;
  await page.route("**/api/auth/signout", route => route.fulfill({
    status: 503, contentType: "application/json", body: JSON.stringify({ error: "Unavailable" })
  }));
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page.locator("header").getByRole("alert")).toHaveText("Chưa thể đăng xuất. Bạn thử lại nhé.");
  await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toBeEnabled();
  expect((await (await page.request.get("/api/auth/session")).json()).user.email).toBe(email("PARTICIPANT"));
  await page.unroute("**/api/auth/signout");
  await page.evaluate(() => {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get() { throw new DOMException("Storage is blocked", "SecurityError"); }
    });
  });
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expectSignedOut(page, origin, false);
});
