import {
  EventFieldType,
  EventStatus,
  Prisma,
  RegistrationStatus,
  type EventField
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { createQrToken, encryptQrToken, hashQrToken } from "@/lib/qr/token";
import { deriveEventState } from "@/lib/time/event-state";
import { sendRegistrationConfirmation } from "@/services/email.service";
import {
  registrationInputSchema,
  type RegistrationInput
} from "@/lib/validation/registration";

const publicEventInclude = {
  fields: { where: { isActive: true }, orderBy: { order: "asc" as const } },
  _count: {
    select: {
      registrations: { where: { status: RegistrationStatus.REGISTERED } }
    }
  }
};

export async function getPublicEventBySlug(slug: string) {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: publicEventInclude
  });
  if (!event || event.status === EventStatus.DRAFT) {
    throw new AppError("EVENT_NOT_FOUND", "Không tìm thấy sự kiện.", 404);
  }

  return {
    ...event,
    registeredCount: event._count.registrations,
    derivedState: deriveEventState({
      ...event,
      activeRegistrationCount: event._count.registrations
    })
  };
}

function requiredValueMissing(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function fieldOptions(field: EventField) {
  return Array.isArray(field.options)
    ? field.options.filter((option): option is string => typeof option === "string")
    : [];
}

function parseFieldAnswer(field: EventField, value: unknown): Prisma.InputJsonValue | undefined {
  if (requiredValueMissing(value)) {
    if (field.required) {
      throw new AppError("VALIDATION_ERROR", `${field.label} là bắt buộc.`, 422);
    }
    return undefined;
  }

  const invalid = () => {
    throw new AppError("VALIDATION_ERROR", `${field.label} không hợp lệ.`, 422);
  };
  const options = fieldOptions(field);

  if (field.type === EventFieldType.NUMBER) {
    const numberValue = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numberValue)) return invalid();
    return numberValue;
  }
  if (field.type === EventFieldType.EMAIL) {
    const parsed = z.string().trim().email().safeParse(value);
    if (!parsed.success) return invalid();
    return parsed.data.toLowerCase();
  }
  if (field.type === EventFieldType.CHECKBOX) {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !options.includes(item))) {
      return invalid();
    }
    return value;
  }
  if (field.type === EventFieldType.SELECT || field.type === EventFieldType.RADIO) {
    if (typeof value !== "string" || !options.includes(value)) return invalid();
    return value;
  }
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 2000) {
    return invalid();
  }
  return value.trim();
}

function validateRegistrationForEvent(
  input: RegistrationInput,
  event: {
    status: EventStatus;
    registrationOpenAt: Date;
    registrationCloseAt: Date;
    capacity: number | null;
    collectPhone: boolean;
    requirePhone: boolean;
    collectFaculty: boolean;
    requireFaculty: boolean;
    fields: EventField[];
    _count: { registrations: number };
  }
) {
  const now = new Date();
  if (event.status === EventStatus.CANCELLED) {
    throw new AppError("EVENT_CANCELLED", "Sự kiện đã bị hủy.", 409);
  }
  if (event.status !== EventStatus.PUBLISHED || now < event.registrationOpenAt) {
    throw new AppError("REGISTRATION_NOT_OPEN", "Sự kiện chưa mở đăng ký.", 409);
  }
  if (now > event.registrationCloseAt) {
    throw new AppError("REGISTRATION_CLOSED", "Sự kiện đã đóng đăng ký.", 409);
  }
  if (event.capacity !== null && event._count.registrations >= event.capacity) {
    throw new AppError("EVENT_FULL", "Sự kiện đã đủ số lượng đăng ký.", 409);
  }
  if (event.requirePhone && !input.phone?.trim()) {
    throw new AppError("VALIDATION_ERROR", "Số điện thoại là bắt buộc.", 422);
  }
  if (event.requireFaculty && !input.faculty?.trim()) {
    throw new AppError("VALIDATION_ERROR", "Khoa/Viện là bắt buộc.", 422);
  }

  const activeKeys = new Set(event.fields.map((field) => field.fieldKey));
  for (const key of Object.keys(input.answers)) {
    if (!activeKeys.has(key)) {
      throw new AppError("VALIDATION_ERROR", "Có trường đăng ký không hợp lệ.", 422);
    }
  }

  return event.fields.flatMap((field) => {
    const value = parseFieldAnswer(field, input.answers[field.fieldKey]);
    return value === undefined ? [] : [{ eventFieldId: field.id, value }];
  });
}

function mapRegistrationError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = String(error.meta?.target ?? "").toLowerCase();
    if (target.includes("student")) {
      throw new AppError("DUPLICATE_STUDENT", "MSSV này đã đăng ký sự kiện.", 409);
    }
    if (target.includes("email")) {
      throw new AppError("DUPLICATE_EMAIL", "Email này đã đăng ký sự kiện.", 409);
    }
  }
  throw error;
}

async function serializableTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 3
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new AppError("INTERNAL_ERROR", "Không thể hoàn tất đăng ký.", 500);
}

export async function createRegistration(eventId: string, rawInput: unknown, userId?: string) {
  const input = registrationInputSchema.parse(rawInput);
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("UNAUTHORIZED", "Bạn cần đăng nhập.", 401);
    input.email = user.email;
  }
  const qrToken = createQrToken();

  try {
    const registration = await serializableTransaction(async (transaction) => {
      const event = await transaction.event.findUnique({
        where: { id: eventId },
        include: publicEventInclude
      });
      if (!event) {
        throw new AppError("EVENT_NOT_FOUND", "Không tìm thấy sự kiện.", 404);
      }

      const duplicate = await transaction.registration.findFirst({
        where: {
          eventId,
          OR: [{ studentId: input.studentId }, { email: input.email }]
        },
        select: { studentId: true, email: true }
      });
      if (duplicate?.studentId === input.studentId) {
        throw new AppError("DUPLICATE_STUDENT", "MSSV này đã đăng ký sự kiện.", 409);
      }
      if (duplicate?.email === input.email) {
        throw new AppError("DUPLICATE_EMAIL", "Email này đã đăng ký sự kiện.", 409);
      }

      const answers = validateRegistrationForEvent(input, event);
      const counter = await transaction.event.update({
        where: { id: eventId },
        data: { registrationCounter: { increment: 1 } },
        select: { registrationCounter: true, codePrefix: true }
      });
      const registrationCode = `${counter.codePrefix}-${String(counter.registrationCounter).padStart(6, "0")}`;

      const registration = await transaction.registration.create({
        data: {
          eventId,
          userId,
          registrationCode,
          fullName: input.fullName,
          studentId: input.studentId,
          email: input.email,
          phone: event.collectPhone ? input.phone?.trim() || null : null,
          faculty: event.collectFaculty ? input.faculty?.trim() || null : null,
          qrTokenHash: hashQrToken(qrToken),
          qrTokenEncrypted: encryptQrToken(qrToken, registrationCode),
          answers: {
            create: answers.map((answer) => ({
              eventFieldId: answer.eventFieldId,
              value: answer.value
            }))
          }
        },
        select: {
          id: true,
          fullName: true,
          studentId: true,
          email: true,
          registrationCode: true,
          registeredAt: true
        }
      });

      return {
        registration,
        event: {
          name: event.name,
          location: event.location,
          startTime: event.startTime,
          endTime: event.endTime
        }
      };
    });

    const emailSent = await sendRegistrationConfirmation({
      registrationId: registration.registration.id,
      recipientEmail: registration.registration.email,
      participantName: registration.registration.fullName,
      registrationCode: registration.registration.registrationCode,
      eventName: registration.event.name,
      eventLocation: registration.event.location,
      eventStartTime: registration.event.startTime,
      eventEndTime: registration.event.endTime,
      qrToken
    });

    if (emailSent) {
      try {
        await prisma.registration.update({
          where: { id: registration.registration.id },
          data: { confirmationEmailSentAt: new Date() }
        });
      } catch (error) {
        console.error("Failed to record confirmation email timestamp", {
          registrationId: registration.registration.id,
          error: error instanceof Error ? error.message : "Unknown database error"
        });
      }
    }

    return { registration: registration.registration, qrToken, emailSent };
  } catch (error) {
    return mapRegistrationError(error);
  }
}
