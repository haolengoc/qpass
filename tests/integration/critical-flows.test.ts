import bcrypt from "bcryptjs";
import { RegistrationStatus } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createBootstrapAdmin,
  parseBootstrapAdminEnvironment
} from "@/lib/auth/bootstrap-admin";
import { prisma } from "@/lib/db/prisma";
import { hashQrToken } from "@/lib/qr/token";
import {
  checkInByQr,
  checkInManually
} from "@/services/checkin.service";
import { createRegistration } from "@/services/registration.service";

const databaseUrl = process.env.DATABASE_URL ?? "";
const localDatabase = (() => {
  try {
    const parsed = new URL(databaseUrl);
    return (
      ["localhost", "127.0.0.1"].includes(parsed.hostname) &&
      /(dev|test)/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
})();
const runDatabaseTests = localDatabase || process.env.RUN_DATABASE_TESTS === "true";
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const eventIds: string[] = [];
const bootstrapAdminIds: string[] = [];
let userId = "";
let sequence = 0;

type EventOptions = {
  capacity?: number | null;
  registrationOpenAt?: Date;
  registrationCloseAt?: Date;
  checkinOpenAt?: Date;
  checkinCloseAt?: Date;
  withRequiredField?: boolean;
};

async function createEvent(options: EventOptions = {}) {
  sequence += 1;
  const now = Date.now();
  const event = await prisma.event.create({
    data: {
      name: `Integration Event ${runId}-${sequence}`,
      slug: `it-${runId}-${sequence}`,
      description: "Integration test fixture",
      location: "Test Room",
      startTime: new Date(now + 2 * 86_400_000),
      endTime: new Date(now + 3 * 86_400_000),
      registrationOpenAt:
        options.registrationOpenAt ?? new Date(now - 86_400_000),
      registrationCloseAt:
        options.registrationCloseAt ?? new Date(now + 86_400_000),
      checkinOpenAt: options.checkinOpenAt ?? new Date(now - 3_600_000),
      checkinCloseAt: options.checkinCloseAt ?? new Date(now + 3_600_000),
      capacity: options.capacity ?? null,
      status: "PUBLISHED",
      codePrefix: `IT${String(sequence).padStart(2, "0")}`,
      collectPhone: true,
      requirePhone: false,
      collectFaculty: true,
      requireFaculty: false,
      createdBy: userId,
      fields: options.withRequiredField
        ? {
            create: {
              label: "Track",
              fieldKey: "track",
              type: "SELECT",
              required: true,
              options: ["Web", "Data"],
              order: 0,
              isActive: true
            }
          }
        : undefined
    }
  });
  eventIds.push(event.id);
  return event;
}

function registration(index: number, overrides: Record<string, unknown> = {}) {
  return {
    fullName: `Integration Participant ${index}`,
    studentId: `IT-${runId}-${index}`,
    email: `it-${runId}-${index}@example.test`,
    phone: null,
    faculty: null,
    answers: {},
    ...overrides
  };
}

beforeAll(async () => {
  if (!runDatabaseTests) return;
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) throw new Error("Integration tests require a seeded admin user.");
  userId = user.id;
});

afterAll(async () => {
  if (eventIds.length > 0) {
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
  }
  if (bootstrapAdminIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: bootstrapAdminIds } } });
  }
  await prisma.$disconnect();
});

describe.runIf(runDatabaseTests)("production admin bootstrap", () => {
  it("creates one hashed admin and refuses to overwrite an existing user", async () => {
    const password = "Strong-Admin-Test-Password-123!";
    const config = parseBootstrapAdminEnvironment({
      DIRECT_URL: databaseUrl,
      BOOTSTRAP_ADMIN_NAME: "Bootstrap Test Admin",
      BOOTSTRAP_ADMIN_EMAIL: `bootstrap-${runId}@example.com`,
      BOOTSTRAP_ADMIN_PASSWORD: password
    });

    const admin = await createBootstrapAdmin(prisma, config);
    bootstrapAdminIds.push(admin.id);
    expect(admin.role).toBe("ADMIN");

    const storedAdmin = await prisma.user.findUniqueOrThrow({
      where: { id: admin.id }
    });
    expect(storedAdmin.passwordHash).not.toBe(password);
    expect(await bcrypt.compare(password, storedAdmin.passwordHash)).toBe(true);

    await expect(createBootstrapAdmin(prisma, config)).rejects.toThrow(
      /already exists\. No changes were made/
    );
  });
});

describe.runIf(runDatabaseTests)("registration and check-in integration", () => {
  it("registers successfully without email rollback and rejects duplicate or invalid data", async () => {
    const event = await createEvent({ withRequiredField: true });
    const firstInput = registration(1, { answers: { track: "Web" } });
    const result = await createRegistration(event.id, firstInput);

    expect(result.emailSent).toBe(false);
    expect(result.qrToken).toHaveLength(43);
    const stored = await prisma.registration.findUniqueOrThrow({
      where: { id: result.registration.id },
      include: { answers: true }
    });
    expect(stored.qrTokenHash).toBe(hashQrToken(result.qrToken));
    expect(stored.qrTokenHash).not.toContain(result.qrToken);
    expect(stored.answers).toHaveLength(1);

    await expect(
      createRegistration(event.id, {
        ...registration(2),
        studentId: firstInput.studentId,
        answers: { track: "Web" }
      })
    ).rejects.toMatchObject({ code: "DUPLICATE_STUDENT" });
    await expect(
      createRegistration(event.id, {
        ...registration(3),
        email: firstInput.email,
        answers: { track: "Web" }
      })
    ).rejects.toMatchObject({ code: "DUPLICATE_EMAIL" });
    await expect(
      createRegistration(event.id, registration(4, { answers: { track: "Mobile" } }))
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("never exceeds capacity under concurrent registrations", async () => {
    const event = await createEvent({ capacity: 1 });
    const attempts = await Promise.allSettled([
      createRegistration(event.id, registration(10)),
      createRegistration(event.id, registration(11))
    ]);

    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    const rejected = attempts.find((attempt) => attempt.status === "rejected");
    expect(rejected).toMatchObject({ reason: { code: "EVENT_FULL" } });
    expect(await prisma.registration.count({ where: { eventId: event.id } })).toBe(1);
  });

  it("rejects registration after its window closes", async () => {
    const now = Date.now();
    const event = await createEvent({
      registrationOpenAt: new Date(now - 2 * 86_400_000),
      registrationCloseAt: new Date(now - 86_400_000)
    });

    await expect(
      createRegistration(event.id, registration(20))
    ).rejects.toMatchObject({ code: "REGISTRATION_CLOSED" });
  });

  it("handles QR, wrong-event, cancelled, manual, window, and concurrent check-ins", async () => {
    const event = await createEvent();
    const first = await createRegistration(event.id, registration(30));
    const manual = await createRegistration(event.id, registration(31));
    const cancelled = await createRegistration(event.id, registration(32));
    const concurrent = await createRegistration(event.id, registration(33));

    const qrResult = await checkInByQr(event.id, userId, { token: first.qrToken });
    expect(qrResult.status).toBe("SUCCESS");
    expect((await checkInByQr(event.id, userId, { token: first.qrToken })).status).toBe(
      "ALREADY_CHECKED_IN"
    );

    const otherEvent = await createEvent();
    await expect(
      checkInByQr(otherEvent.id, userId, { token: manual.qrToken })
    ).rejects.toMatchObject({ code: "WRONG_EVENT" });

    expect(
      (await checkInManually(event.id, userId, {
        registrationId: manual.registration.id
      })).status
    ).toBe("SUCCESS");

    await prisma.registration.update({
      where: { id: cancelled.registration.id },
      data: { status: RegistrationStatus.CANCELLED }
    });
    await expect(
      checkInByQr(event.id, userId, { token: cancelled.qrToken })
    ).rejects.toMatchObject({ code: "REGISTRATION_CANCELLED" });

    const simultaneous = await Promise.all([
      checkInByQr(event.id, userId, { token: concurrent.qrToken }),
      checkInByQr(event.id, userId, { token: concurrent.qrToken })
    ]);
    expect(simultaneous.map((result) => result.status).sort()).toEqual([
      "ALREADY_CHECKED_IN",
      "SUCCESS"
    ]);
    expect(
      await prisma.checkin.count({
        where: { registrationId: concurrent.registration.id }
      })
    ).toBe(1);

    const futureEvent = await createEvent({
      checkinOpenAt: new Date(Date.now() + 86_400_000),
      checkinCloseAt: new Date(Date.now() + 2 * 86_400_000)
    });
    const future = await createRegistration(futureEvent.id, registration(34));
    await expect(
      checkInByQr(futureEvent.id, userId, { token: future.qrToken })
    ).rejects.toMatchObject({ code: "CHECKIN_NOT_OPEN" });
  });
});
