import { expect, type Page, test } from "@playwright/test";
import { prisma } from "@/lib/db/prisma";
import { APP_TIME_ZONE } from "@/lib/time/format";
import { formatInTimeZone } from "date-fns-tz";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const eventName = `E2E Event ${suffix}`;
const slug = `e2e-event-${suffix}`;
const participantName = `E2E Participant ${suffix}`;
const studentId = `E2E-${suffix}`;
const email = `e2e-${suffix}@example.test`;
let createdEventId: string | undefined;

function dateTimeInput(dayOffset: number) {
  return formatInTimeZone(
    new Date(Date.now() + dayOffset * 86_400_000),
    APP_TIME_ZONE,
    "yyyy-MM-dd'T'HH:mm"
  );
}

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
  if (createdEventId) {
    await prisma.event.deleteMany({ where: { id: createdEventId } });
  }
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

test("critical event registration and check-in journey", async ({ page, browser }) => {
  await login(page);
  await expect(page.getByRole("status").filter({ hasText: "Đăng nhập BTC thành công" })).toBeVisible();
  await page.getByRole("button", { name: "Đóng thông báo" }).click();

  await page.goto("/admin/events/new");
  await page.getByLabel("Tên sự kiện").fill(eventName);
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Tiền tố mã đăng ký").fill("E2ETEST");
  await page.getByLabel("Địa điểm").fill("E2E Test Room");
  await page.getByLabel("Sức chứa").fill("10");
  await page.locator("#registrationOpenAt").fill(dateTimeInput(-1));
  await page.locator("#registrationCloseAt").fill(dateTimeInput(1));
  await page.locator("#startTime").fill(dateTimeInput(2));
  await page.locator("#endTime").fill(dateTimeInput(3));
  await page.locator("#checkinOpenAt").fill(dateTimeInput(-1));
  await page.locator("#checkinCloseAt").fill(dateTimeInput(3));
  await page.getByRole("button", { name: "Tạo bản nháp" }).last().click();
  await page.waitForURL(/\/admin\/events\/[^/]+\/edit$/);
  await expect(page.getByRole("status").filter({ hasText: "Đã tạo bản nháp" })).toBeVisible();
  await page.getByRole("button", { name: "Đóng thông báo" }).click();
  createdEventId = page.url().match(/\/events\/([^/]+)\/edit$/)?.[1];
  expect(createdEventId).toBeTruthy();

  const publishButton = page.getByRole("button", { name: "Xuất bản" });
  await publishButton.click();
  await expect(publishButton).toHaveCount(0);

  const participantContext = await browser.newContext();
  const participant = await participantContext.newPage();
  await participant.goto(`/events/${slug}/register`);
  await expect(participant).toHaveURL(/\/login\?callbackUrl=/);
  await participant.getByRole("link", { name: "Tạo tài khoản", exact: true }).click();
  await participant.getByLabel("Họ và tên").fill(participantName);
  await participant.getByLabel("Email", { exact: true }).fill(email);
  await participant.getByLabel("Mật khẩu", { exact: true }).fill("Participant-Test-123!");
  await participant.getByLabel("Xác nhận mật khẩu").fill("Participant-Test-123!");
  await participant.getByRole("button", { name: "Tạo tài khoản" }).click();
  await participant.waitForURL(`**/events/${slug}/register`);
  await expect(participant.getByRole("status").filter({ hasText: "Tạo tài khoản thành công" })).toBeVisible();
  await participant.getByRole("button", { name: "Đóng thông báo" }).click();
  await expect(participant.getByLabel(/^Email/)).toHaveValue(email);
  await expect(participant.getByLabel(/^Email/)).toHaveAttribute("readonly", "");
  await participant.getByLabel(/MSSV/).fill(studentId);
  await participant.route(`**/api/events/${createdEventId}/registrations`, async route => {
    const data = route.request().postDataJSON();
    await route.continue({ postData: JSON.stringify({ ...data, email: "forged@example.test" }) });
  });
  await participant.getByRole("checkbox", { name: /Tôi xác nhận/ }).check();
  await participant.getByRole("button", { name: "Hoàn tất đăng ký" }).click();
  await participant.waitForURL(`**/events/${slug}/registration/success`);
  await expect(participant.getByRole("status").filter({ hasText: "Đăng ký thành công" })).toBeVisible();
  await participant.getByRole("button", { name: "Đóng thông báo" }).click();
  await expect(participant.getByText("Đăng ký thành công")).toBeVisible();
  await expect(participant.getByRole("img", { name: "Mã QR check-in" })).toBeVisible();
  const account = await prisma.user.findUniqueOrThrow({ where: { email } });
  expect(account.role).toBe("PARTICIPANT");
  const registration = await prisma.registration.findUniqueOrThrow({
    where: { eventId_email: { eventId: createdEventId!, email } }
  });
  expect(registration.userId).toBe(account.id);
  await participant.goto("/events?view=registered");
  await expect(participant.getByRole("heading", { name: eventName, exact: true })).toBeVisible();
  await expect(participant.getByText(`Mã đăng ký: ${registration.registrationCode}`, { exact: true })).toBeVisible();
  await participant.goto(`/events/${slug}/register`);
  await expect(participant).toHaveURL(`/events/${slug}`);
  await expect(participant.getByText("Bạn đã đăng ký sự kiện này")).toBeVisible();
  expect((await participant.request.get("/api/admin/events")).status()).toBe(403);
  expect((await participant.request.post("/api/admin/events", { data: {} })).status()).toBe(403);
  await participant.goto("/admin/events/new");
  await expect(participant).toHaveURL(/\/admin\/login/);
  await participant.getByLabel("Email", { exact: true }).fill(email);
  await participant.getByLabel("Mật khẩu", { exact: true }).fill("Participant-Test-123!");
  await participant.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(participant.locator("form").getByRole("alert")).toContainText("không có quyền");
  await participant.goto("/");
  await participant.getByRole("button", { name: "Đăng xuất" }).click();
  // Wait until the signed-in navigation is replaced after logout.
  await expect(participant.getByRole("button", { name: "Đăng xuất" })).toHaveCount(0);
  await expect(participant.getByRole("link", { name: "Đăng nhập người tham gia" })).toBeVisible();
  expect((await participant.request.get("/api/admin/events")).status()).toBe(401);
  await participantContext.close();

  await page.goto(`/admin/events/${createdEventId}/participants`);
  await expect(page.getByText(participantName)).toBeVisible();
  await expect(page.getByText(studentId, { exact: true })).toBeVisible();
  const participantRow = page.locator("tbody tr").filter({ hasText: participantName });
  await participantRow.getByRole("button", { name: `Check-in thủ công cho ${participantName}` }).click();
  await expect(page.getByRole("status")).toContainText("Check-in thủ công thành công");
  await expect(participantRow.getByText("Đã check-in", { exact: true })).toBeVisible();
  await expect(participantRow.getByText("Thủ công", { exact: true })).toBeVisible();
  await page.reload();
  const refreshedRow = page.locator("tbody tr").filter({ hasText: participantName });
  await expect(refreshedRow.getByText("Đã check-in", { exact: true })).toBeVisible();
  await expect(prisma.checkin.findUnique({ where: { registrationId: registration.id } })).resolves.toMatchObject({ method: "MANUAL" });

  await page.goto(`/admin/events/${createdEventId}/scanner`);
  await page.getByPlaceholder("MSSV, tên, email hoặc mã").fill(studentId);
  await page.getByRole("button", { name: "Tìm người tham dự" }).click();
  await expect(page.getByText(participantName)).toBeVisible();
  await expect(page.getByRole("button", { name: `Check-in ${participantName}` })).toBeDisabled();

  const exportResponse = await page.request.get(
    `/api/admin/events/${createdEventId}/export?format=xlsx`
  );
  expect(exportResponse.status()).toBe(200);
  expect(exportResponse.headers()["content-type"]).toContain(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  expect(exportResponse.headers()["content-disposition"]).toContain(
    `${slug}_attendance_`
  );
  expect((await exportResponse.body()).byteLength).toBeGreaterThan(1_000);
});

test("admin API rejects an unauthenticated request with JSON", async ({ request }) => {
  const response = await request.get(
    "/api/admin/events/00000000-0000-0000-0000-000000000000",
    { maxRedirects: 0 }
  );

  expect(response.status()).toBe(401);
  expect(response.headers()["content-type"]).toContain("application/json");
  await expect(response.json()).resolves.toMatchObject({
    success: false,
    error: { code: "UNAUTHORIZED" }
  });
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["referrer-policy"]).toBe("same-origin");
});

test("authenticated registration endpoint is rate limited", async ({ page }) => {
  await login(page);
  const request = page.request;
  const eventId = crypto.randomUUID();
  const responses = [];

  for (let attempt = 0; attempt < 9; attempt += 1) {
    responses.push(
      await request.post(`/api/events/${eventId}/registrations`, {
        data: {
          fullName: "Rate Limit Test",
          studentId: `RATE-${attempt}`,
          email: `rate-${attempt}@example.test`,
          phone: null,
          faculty: null,
          answers: {}
        }
      })
    );
  }

  expect(responses.slice(0, 8).every((response) => response.status() === 404)).toBe(true);
  expect(responses[8].status()).toBe(429);
  await expect(responses[8].json()).resolves.toMatchObject({
    success: false,
    error: { code: "RATE_LIMITED" }
  });
});
