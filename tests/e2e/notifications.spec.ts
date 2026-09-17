import { expect, test, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { hashQrToken } from "@/lib/qr/token";

const suffix = crypto.randomUUID();
const password = "Inbox-Test-123!";
const token = crypto.randomUUID();
const participantEmail = `inbox-${suffix}@example.test`;
const organizerEmail = `inbox-btc-${suffix}@example.test`;
const userIds: string[] = [];
let eventId: string;
const eventName = `Ngày hội QPass ${suffix}`;

test.beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 12);
  for (const [email, role] of [[organizerEmail, "ORGANIZER"], [participantEmail, "PARTICIPANT"], [`other-${participantEmail}`, "PARTICIPANT"]] as const) {
    const user = await prisma.user.create({ data: { name: "Inbox Test", email, role, passwordHash } });
    userIds.push(user.id);
  }
  const now = Date.now();
  const event = await prisma.event.create({ data: {
    name: eventName, slug: `inbox-${suffix}`, status: "PUBLISHED", createdBy: userIds[0], codePrefix: "INBOX",
    startTime: new Date(now + 86400000), endTime: new Date(now + 172800000),
    registrationOpenAt: new Date(now - 86400000), registrationCloseAt: new Date(now + 86400000),
    checkinOpenAt: new Date(now - 3600000), checkinCloseAt: new Date(now + 172800000)
  } });
  eventId = event.id;
});

test.afterAll(async () => {
  if (eventId) await prisma.event.delete({ where: { id: eventId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

async function login(page: Page, staff = false) {
  await page.goto(staff ? "/admin/login" : "/login");
  await page.getByLabel("Email", { exact: true }).fill(staff ? organizerEmail : participantEmail);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(staff ? "/admin/events" : "/events");
}

test("inbox persists reads, isolates accounts, and receives successful QR check-ins", async ({ page, browser, request }) => {
  test.setTimeout(120_000);
  expect((await request.get("/api/notifications")).status()).toBe(401);
  expect((await request.patch("/api/notifications", { data: { action: "read-all", before: new Date().toISOString() } })).status()).toBe(401);
  await login(page);
  const bell = page.getByRole("button", { name: /^Thông báo/ });
  await bell.click();
  await expect(page.getByText("Chưa có thông báo", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(bell).toBeFocused();

  const createRegistration = (userId: string, email: string, own: boolean) => prisma.registration.create({ data: {
    eventId, userId, fullName: "Inbox Test", studentId: `IN-${userId}`, email,
    registrationCode: `IN-${userId}`, qrTokenHash: hashQrToken(own ? token : crypto.randomUUID())
  } });
  const own = await createRegistration(userIds[1], participantEmail, true);
  const other = await createRegistration(userIds[2], `other-${participantEmail}`, false);
  await bell.click();
  await expect(bell).toHaveAccessibleName("Thông báo, 1 chưa đọc");
  const dialog = page.getByRole("dialog", { name: "Thông báo", exact: true });
  await expect(dialog.getByText("Đăng ký thành công", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("link")).toHaveCount(1);
  const response = await page.request.get("/api/notifications");
  expect(response.headers()["cache-control"]).toContain("no-store");
  const initial = (await response.json()).data;
  expect(initial.items.map((item: { registrationId: string }) => item.registrationId)).toEqual([own.id]);
  expect((await page.request.patch("/api/notifications", { data: { action: "read", registrationId: other.id, kind: "registration" } })).status()).toBe(200);
  expect((await prisma.registration.findUniqueOrThrow({ where: { id: other.id } })).registrationNoticeReadAt).toBeNull();
  // A forged early read cannot suppress a future check-in notification.
  await page.request.patch("/api/notifications", { data: { action: "read", registrationId: own.id, kind: "checkin" } });
  expect((await prisma.registration.findUniqueOrThrow({ where: { id: own.id } })).checkinNoticeReadAt).toBeNull();
  expect((await page.request.patch("/api/notifications", { data: { action: "read", registrationId: "invalid", kind: "registration" } })).status()).toBe(422);
  expect((await page.request.patch("/api/notifications", { headers: { Origin: "https://unrelated.example" }, data: { action: "read-all", before: initial.asOf } })).status()).toBe(403);

  await dialog.getByRole("link").click();
  await expect(page).toHaveURL(`/events/inbox-${suffix}`);
  await expect(bell).toHaveAccessibleName("Thông báo", { timeout: 15_000 });
  await page.reload();
  await bell.click();
  await expect(dialog.getByRole("link")).toHaveCount(1);
  await expect(dialog.getByText("Chưa đọc", { exact: true })).toHaveCount(0);
  const snapshot = (await (await page.request.get("/api/notifications")).json()).data;

  const staffContext = await browser.newContext();
  try {
    const staff = await staffContext.newPage();
    await login(staff, true);
    for (const status of ["SUCCESS", "ALREADY_CHECKED_IN"]) {
      const checkin = await staff.request.post(`/api/admin/events/${eventId}/checkins/qr`, { data: { token } });
      expect(checkin.status()).toBe(200);
      expect((await checkin.json()).data.status).toBe(status);
    }
    await page.request.patch("/api/notifications", { data: { action: "read-all", before: snapshot.asOf } });
    expect((await prisma.registration.findUniqueOrThrow({ where: { id: own.id } })).checkinNoticeReadAt).toBeNull();
    await page.bringToFront();
    await expect(dialog.getByText("Check-in thành công", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByRole("link")).toHaveCount(2);
    await expect(bell).toHaveAccessibleName("Thông báo, 1 chưa đọc");
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const box = await dialog.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `test-results/inbox-${width}.png`, animations: "disabled" });
    }
    await dialog.getByRole("button", { name: "Đánh dấu tất cả đã đọc" }).click();
    await expect(bell).toHaveAccessibleName("Thông báo");
    await page.context().clearCookies();
    await login(page);
    await bell.click();
    await expect(dialog.getByRole("link")).toHaveCount(2);
    await expect(dialog.getByText("Chưa đọc", { exact: true })).toHaveCount(0);
    expect((await prisma.registration.findUniqueOrThrow({ where: { id: other.id } })).registrationNoticeReadAt).toBeNull();
  } finally {
    await staffContext.close();
  }
});
