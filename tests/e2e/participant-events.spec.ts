import { expect, test } from "@playwright/test";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { hashQrToken } from "@/lib/qr/token";

const suffix = crypto.randomUUID();
const email = `catalog-${suffix}@example.test`;
const password = "Catalog-Test-123!";
const search = `catalog-${suffix}`;
const ownCode = `OWN-${suffix}`;
const otherCode = `OTHER-${suffix}`;
let creatorId: string;
const userIds: string[] = [];
let openSlug: string;

test.beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 12);
  for (const [index, role] of ["ORGANIZER", "PARTICIPANT", "PARTICIPANT"].entries()) {
    const user = await prisma.user.create({ data: {
      name: "Catalog Test", email: index === 1 ? email : `${index}-${email}`,
      passwordHash, role: role as "ORGANIZER" | "PARTICIPANT"
    } });
    userIds.push(user.id);
  }
  creatorId = userIds[0];
  const now = Date.now();
  const day = 86_400_000;
  for (const kind of ["open", "full", "closed", "draft", "past", "cancelled"] as const) {
    const event = await prisma.event.create({ data: {
      name: `Catalog ${kind}`, slug: `${search}-${kind}`, location: search,
      status: kind === "draft" ? "DRAFT" : kind === "cancelled" ? "CANCELLED" : "PUBLISHED",
      startTime: new Date(now + (kind === "past" ? -2 : 2) * day),
      endTime: new Date(now + (kind === "past" ? -1 : 3) * day),
      registrationOpenAt: new Date(now - 4 * day),
      registrationCloseAt: new Date(now + (["closed", "past"].includes(kind) ? -3 : 1) * day),
      checkinOpenAt: new Date(now), checkinCloseAt: new Date(now + 3 * day),
      capacity: kind === "full" ? 1 : 20, codePrefix: "CATALOG", createdBy: creatorId
    } });
    if (kind === "open") openSlug = event.slug;
    if (["full", "past"].includes(kind)) {
      const own = kind === "past";
      await prisma.registration.create({ data: {
        eventId: event.id, userId: userIds[own ? 1 : 2],
        fullName: own ? "Catalog Test" : "Another Participant", studentId: `STUDENT-${kind}-${suffix}`,
        email: own ? email : `2-${email}`, registrationCode: own ? ownCode : otherCode,
        qrTokenHash: hashQrToken(crypto.randomUUID())
      } });
    }
  }
});

test.afterAll(async () => {
  if (creatorId) await prisma.event.deleteMany({ where: { createdBy: creatorId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

test("participant catalog filters events and exposes only the account's registrations", async ({ page }) => {
  await page.goto(`/events?search=${search}`);
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(`/events?search=${search}`);
  await expect(page.locator("article")).toHaveCount(3);
  const open = page.locator("article").filter({ has: page.getByRole("heading", { name: "Catalog open", exact: true }) });
  await expect(open.getByRole("link", { name: "Đăng ký tham dự" })).toHaveAttribute("href", `/events/${openSlug}/register`);
  for (const name of ["Catalog full", "Catalog closed"]) {
    const card = page.locator("article").filter({ has: page.getByRole("heading", { name, exact: true }) });
    await expect(card.getByRole("link", { name: "Đăng ký tham dự" })).toHaveCount(0);
    await expect(card.getByRole("link", { name: "Xem chi tiết" })).toBeVisible();
  }
  await expect(page.getByText(otherCode, { exact: false })).toHaveCount(0);
  await page.getByLabel("Tìm sự kiện", { exact: true }).fill(`missing-${suffix}`);
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Không tìm thấy sự kiện phù hợp" })).toBeVisible();
  await page.goto("/events?view=registered");
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Catalog past", exact: true })).toBeVisible();
  await expect(page.getByText(`Mã đăng ký: ${ownCode}`, { exact: true })).toBeVisible();
  await expect(page.getByText(otherCode, { exact: false })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(`Mã đăng ký: ${ownCode}`, { exact: true })).toBeVisible();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});
