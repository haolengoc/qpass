import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "@prisma/client";
import { hashQrToken } from "../lib/qr/token";

const prisma = new PrismaClient();

const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.test";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMeAdmin123!";
const organizerEmail =
  process.env.SEED_ORGANIZER_EMAIL || "organizer@example.test";
const organizerPassword =
  process.env.SEED_ORGANIZER_PASSWORD || "ChangeMeOrganizer123!";

function assertSeedIsSafe() {
  if (process.env.NODE_ENV !== "production") return;

  if (process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error(
      "Production seed is disabled. Set ALLOW_PRODUCTION_SEED=true only for an intentional one-time seed."
    );
  }

  const productionCredentials = [
    ["SEED_ADMIN_EMAIL", process.env.SEED_ADMIN_EMAIL],
    ["SEED_ADMIN_PASSWORD", process.env.SEED_ADMIN_PASSWORD],
    ["SEED_ORGANIZER_EMAIL", process.env.SEED_ORGANIZER_EMAIL],
    ["SEED_ORGANIZER_PASSWORD", process.env.SEED_ORGANIZER_PASSWORD]
  ] as const;
  const missingVariables = productionCredentials
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);

  if (missingVariables.length > 0) {
    throw new Error(
      `Production seed requires explicit credentials: ${missingVariables.join(", ")}.`
    );
  }

  if (
    adminEmail.endsWith("@example.test") ||
    organizerEmail.endsWith("@example.test") ||
    adminPassword === "ChangeMeAdmin123!" ||
    organizerPassword === "ChangeMeOrganizer123!"
  ) {
    throw new Error("Development seed credentials cannot be used in production.");
  }
}

function daysFromNow(days: number, hour = 2) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

async function upsertUser(input: {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "ORGANIZER";
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      passwordHash,
      role: input.role
    },
    create: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role
    }
  });
}

async function main() {
  assertSeedIsSafe();

  const admin = await upsertUser({
    name: "Admin Demo",
    email: adminEmail,
    password: adminPassword,
    role: "ADMIN"
  });

  const organizer = await upsertUser({
    name: "Organizer Demo",
    email: organizerEmail,
    password: organizerPassword,
    role: "ORGANIZER"
  });

  const openEvent = await prisma.event.upsert({
    where: { slug: "demo-open-event" },
    update: {},
    create: {
      name: "Demo Open Event",
      slug: "demo-open-event",
      description: "Sự kiện mẫu đang mở đăng ký.",
      location: "UEH Campus",
      startTime: daysFromNow(7, 2),
      endTime: daysFromNow(7, 5),
      registrationOpenAt: daysFromNow(-1, 2),
      registrationCloseAt: daysFromNow(6, 16),
      checkinOpenAt: daysFromNow(7, 1),
      checkinCloseAt: daysFromNow(7, 5),
      capacity: 120,
      status: "PUBLISHED",
      codePrefix: "DEMO",
      createdBy: organizer.id,
      fields: {
        create: [
          {
            label: "Kích cỡ áo",
            fieldKey: "shirt_size",
            type: "SELECT",
            required: true,
            order: 1,
            options: ["S", "M", "L", "XL"] as Prisma.InputJsonValue
          },
          {
            label: "Ăn chay",
            fieldKey: "vegetarian",
            type: "RADIO",
            required: true,
            order: 2,
            options: ["YES", "NO"] as Prisma.InputJsonValue
          },
          {
            label: "Ghi chú",
            fieldKey: "note",
            type: "TEXTAREA",
            required: false,
            order: 3
          }
        ]
      }
    },
    include: { fields: true }
  });

  // Keep the demo event's manual/QR check-in available for local testing.
  await prisma.event.update({
    where: { id: openEvent.id },
    data: {
      checkinOpenAt: daysFromNow(-1, 1),
      checkinCloseAt: openEvent.endTime
    }
  });

  await prisma.event.upsert({
    where: { slug: "demo-draft-event" },
    update: {},
    create: {
      name: "Demo Draft Event",
      slug: "demo-draft-event",
      description: "Sự kiện nháp.",
      location: "UEH Campus",
      startTime: daysFromNow(20, 2),
      endTime: daysFromNow(20, 5),
      registrationOpenAt: daysFromNow(10, 2),
      registrationCloseAt: daysFromNow(19, 16),
      checkinOpenAt: daysFromNow(20, 1),
      checkinCloseAt: daysFromNow(20, 5),
      capacity: 80,
      status: "DRAFT",
      codePrefix: "DRFT",
      createdBy: admin.id
    }
  });

  await prisma.event.upsert({
    where: { slug: "demo-completed-event" },
    update: {},
    create: {
      name: "Demo Completed Event",
      slug: "demo-completed-event",
      description: "Sự kiện đã kết thúc.",
      location: "UEH Campus",
      startTime: daysFromNow(-10, 2),
      endTime: daysFromNow(-10, 5),
      registrationOpenAt: daysFromNow(-20, 2),
      registrationCloseAt: daysFromNow(-11, 16),
      checkinOpenAt: daysFromNow(-10, 1),
      checkinCloseAt: daysFromNow(-10, 5),
      capacity: 100,
      status: "PUBLISHED",
      codePrefix: "DONE",
      createdBy: organizer.id
    }
  });

  const shirtField = openEvent.fields.find(
    (field) => field.fieldKey === "shirt_size"
  );
  const vegetarianField = openEvent.fields.find(
    (field) => field.fieldKey === "vegetarian"
  );
  const noteField = openEvent.fields.find((field) => field.fieldKey === "note");

  for (let index = 1; index <= 24; index += 1) {
    const code = `DEMO-${String(index).padStart(6, "0")}`;
    const registration = await prisma.registration.upsert({
      where: { registrationCode: code },
      update: {},
      create: {
        eventId: openEvent.id,
        registrationCode: code,
        fullName: `Participant ${index}`,
        studentId: `312410${String(index).padStart(5, "0")}`,
        email: `participant${index}@example.test`,
        phone: `090000${String(index).padStart(4, "0")}`,
        faculty: "CTD",
        qrTokenHash: hashQrToken(`seed-token-${index}`)
      }
    });

    const answers = [
      shirtField
        ? {
            registrationId: registration.id,
            eventFieldId: shirtField.id,
            value: ["S", "M", "L", "XL"][index % 4]
          }
        : null,
      vegetarianField
        ? {
            registrationId: registration.id,
            eventFieldId: vegetarianField.id,
            value: index % 3 === 0 ? "YES" : "NO"
          }
        : null,
      noteField
        ? {
            registrationId: registration.id,
            eventFieldId: noteField.id,
            value: index % 5 === 0 ? "Cần hỗ trợ check-in." : ""
          }
        : null
    ].filter(Boolean) as Array<{
      registrationId: string;
      eventFieldId: string;
      value: Prisma.InputJsonValue;
    }>;

    for (const answer of answers) {
      await prisma.registrationAnswer.upsert({
        where: {
          registrationId_eventFieldId: {
            registrationId: answer.registrationId,
            eventFieldId: answer.eventFieldId
          }
        },
        update: { value: answer.value },
        create: answer
      });
    }

    if (index <= 8) {
      await prisma.checkin.upsert({
        where: { registrationId: registration.id },
        update: {},
        create: {
          registrationId: registration.id,
          eventId: openEvent.id,
          checkedInBy: index % 2 === 0 ? admin.id : organizer.id,
          method: index % 2 === 0 ? "MANUAL" : "QR"
        }
      });
    }
  }

  await prisma.event.update({
    where: { id: openEvent.id },
    data: { registrationCounter: 24 }
  });

  console.log("Seed completed.");
  console.log(`Admin: ${adminEmail}`);
  console.log(`Organizer: ${organizerEmail}`);
  console.log("Default passwords are documented development defaults only.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
