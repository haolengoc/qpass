import { expect, test, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { encryptQrToken, hashQrToken } from "@/lib/qr/token";

const suffix = crypto.randomUUID();
const password = "Participant-QR-123!";
const participantEmail = `qr-${suffix}@example.test`;
const otherEmail = `qr-other-${suffix}@example.test`;
const organizerEmail = `qr-btc-${suffix}@example.test`;
const ids: string[] = [];
let creatorId: string;
let participantId: string;
let currentRegistrationId: string;
let legacyRegistrationId: string;
let currentEventId: string;
let legacyEventId: string;
const currentToken = crypto.randomUUID();
const legacyToken = crypto.randomUUID();
const currentCode = `CURRENT-${suffix}`;

test.beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 12);
  for (const [email, role] of [[organizerEmail, "ORGANIZER"], [participantEmail, "PARTICIPANT"], [otherEmail, "PARTICIPANT"]] as const) {
    const user = await prisma.user.create({ data: { name: role === "ORGANIZER" ? "QR BTC" : "QR Participant", email, role, passwordHash } });
    ids.push(user.id);
  }
  [creatorId, participantId] = ids;
  const now = Date.now();
  for (const kind of ["current", "legacy"] as const) {
    const event = await prisma.event.create({ data: {
      name: `QR ${kind} ${suffix}`, slug: `qr-${kind}-${suffix}`, status: "PUBLISHED", createdBy: creatorId,
      codePrefix: "QR", location: "Sảnh QPass", startTime: new Date(now + 86_400_000), endTime: new Date(now + 172_800_000),
      registrationOpenAt: new Date(now - 86_400_000), registrationCloseAt: new Date(now + 86_400_000),
      checkinOpenAt: new Date(now - 3_600_000), checkinCloseAt: new Date(now + 172_800_000)
    } });
    const code = kind === "current" ? currentCode : `LEGACY-${suffix}`;
    const token = kind === "current" ? currentToken : legacyToken;
    const registration = await prisma.registration.create({ data: {
      eventId: event.id, userId: participantId, fullName: "QR Participant", studentId: `QR-${kind}-${suffix}`,
      email: participantEmail, registrationCode: code, qrTokenHash: hashQrToken(token),
      qrTokenEncrypted: kind === "current" ? encryptQrToken(token, code) : null
    } });
    if (kind === "current") {
      currentEventId = event.id;
      currentRegistrationId = registration.id;
    } else {
      legacyEventId = event.id;
      legacyRegistrationId = registration.id;
    }
  }
});

test.afterAll(async () => {
  await prisma.event.deleteMany({ where: { id: { in: [currentEventId, legacyEventId].filter(Boolean) } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

async function login(page: Page, email = participantEmail, staff = false) {
  await page.goto(staff ? "/admin/login" : "/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(staff ? "/admin/events" : "/events");
}

test("keeps QR codes after refresh, rotates legacy hashes, and shows live check-in success", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await login(page);
  await page.goto("/events/qr-codes");
  await expect(page.getByRole("heading", { name: "Mã QR đang chờ check-in" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Mã QR check-in/ })).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Mã QR", exact: true })).toBeVisible();

  const currentResponse = await page.request.get(`/api/registrations/${currentRegistrationId}/qr`);
  expect(currentResponse.status()).toBe(200);
  expect((await currentResponse.json()).data.qrToken).toBe(currentToken);
  const legacyResponse = await page.request.get(`/api/registrations/${legacyRegistrationId}/qr`);
  const rotatedToken = (await legacyResponse.json()).data.qrToken as string;
  expect(rotatedToken).not.toBe(legacyToken);
  expect((await prisma.registration.findUniqueOrThrow({ where: { id: legacyRegistrationId } })).qrTokenHash).toBe(hashQrToken(rotatedToken));

  await page.reload();
  await expect(page.getByRole("img", { name: /Mã QR check-in/ })).toHaveCount(2);
  expect((await (await page.request.get(`/api/registrations/${legacyRegistrationId}/qr`)).json()).data.qrToken).toBe(rotatedToken);
  await page.goto(`/events/qr-current-${suffix}/registration/success`);
  await expect(page.getByRole("img", { name: /Mã QR check-in/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("img", { name: /Mã QR check-in/ })).toBeVisible();

  const otherContext = await browser.newContext();
  const staffContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await login(other, otherEmail);
    expect((await other.request.get(`/api/registrations/${currentRegistrationId}/qr`)).status()).toBe(404);

    const staff = await staffContext.newPage();
    await login(staff, organizerEmail, true);
    const checkin = await staff.request.post(`/api/admin/events/${currentEventId}/checkins/qr`, { data: { token: currentToken } });
    expect(checkin.status()).toBe(200);
    expect((await checkin.json()).data.status).toBe("SUCCESS");

    await page.bringToFront();
    await expect(page.getByRole("heading", { name: "Bạn đã check-in thành công!" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("img", { name: /Mã QR check-in/ })).toHaveCount(0);
    const stored = await prisma.registration.findUniqueOrThrow({ where: { id: currentRegistrationId } });
    expect(stored.qrTokenEncrypted).toBeNull();
    const checkedPayload = (await (await page.request.get(`/api/registrations/${currentRegistrationId}/qr`)).json()).data;
    expect(checkedPayload.checkedIn).toBe(true);
    expect(checkedPayload).not.toHaveProperty("qrToken");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Bạn đã check-in thành công!" })).toBeVisible();

    await page.goto("/events/qr-codes");
    await expect(page.getByText(`QR current ${suffix}`, { exact: true })).toHaveCount(0);
    await expect(page.getByText(`QR legacy ${suffix}`, { exact: true })).toBeVisible();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
  } finally {
    await otherContext.close();
    await staffContext.close();
  }
});
