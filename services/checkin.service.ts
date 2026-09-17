import {
  CheckinMethod,
  EventStatus,
  Prisma,
  RegistrationStatus
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { hashQrToken } from "@/lib/qr/token";
import { isWithinWindow } from "@/lib/time/event-state";

const qrInputSchema = z.object({
  token: z.string().trim().min(20, "Mã QR không hợp lệ.").max(200)
});
const manualInputSchema = z.object({ registrationId: z.string().uuid() });

type CheckinRuleInput = {
  eventStatus: EventStatus;
  checkinOpenAt: Date;
  checkinCloseAt: Date;
  registrationStatus: RegistrationStatus;
  now?: Date;
};

export function assertCheckinAllowed(input: CheckinRuleInput) {
  if (input.eventStatus === EventStatus.CANCELLED) {
    throw new AppError("EVENT_CANCELLED", "Sự kiện đã bị hủy.", 409);
  }
  if (input.eventStatus !== EventStatus.PUBLISHED) {
    throw new AppError("CHECKIN_NOT_OPEN", "Sự kiện chưa được xuất bản.", 409);
  }
  if (input.registrationStatus === RegistrationStatus.CANCELLED) {
    throw new AppError("REGISTRATION_CANCELLED", "Đăng ký đã bị hủy.", 409);
  }

  const now = input.now ?? new Date();
  if (!isWithinWindow(now, input.checkinOpenAt, input.checkinCloseAt)) {
    throw new AppError("CHECKIN_NOT_OPEN", "Hiện không nằm trong thời gian check-in.", 409);
  }
}

const registrationInclude = {
  event: {
    select: {
      id: true,
      status: true,
      checkinOpenAt: true,
      checkinCloseAt: true
    }
  },
  checkin: true
};

function participant(registration: {
  id: string;
  fullName: string;
  studentId: string;
  email: string;
  registrationCode: string;
}) {
  return {
    id: registration.id,
    fullName: registration.fullName,
    studentId: registration.studentId,
    email: registration.email,
    registrationCode: registration.registrationCode
  };
}

async function createCheckin(
  registration: Prisma.RegistrationGetPayload<{ include: typeof registrationInclude }>,
  eventId: string,
  userId: string,
  method: CheckinMethod
) {
  if (registration.eventId !== eventId) {
    throw new AppError("WRONG_EVENT", "Mã đăng ký thuộc sự kiện khác.", 409);
  }

  assertCheckinAllowed({
    eventStatus: registration.event.status,
    checkinOpenAt: registration.event.checkinOpenAt,
    checkinCloseAt: registration.event.checkinCloseAt,
    registrationStatus: registration.status
  });

  if (registration.checkin) {
    return {
      status: "ALREADY_CHECKED_IN" as const,
      participant: participant(registration),
      checkin: registration.checkin
    };
  }

  try {
    const checkin = await prisma.checkin.create({
      data: {
        registrationId: registration.id,
        eventId,
        checkedInBy: userId,
        method
      }
    });
    return {
      status: "SUCCESS" as const,
      participant: participant(registration),
      checkin
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.checkin.findUnique({
        where: { registrationId: registration.id }
      });
      if (existing) {
        return {
          status: "ALREADY_CHECKED_IN" as const,
          participant: participant(registration),
          checkin: existing
        };
      }
    }
    throw error;
  }
}

export async function checkInByQr(
  eventId: string,
  userId: string,
  rawInput: unknown
) {
  const { token } = qrInputSchema.parse(rawInput);
  const registration = await prisma.registration.findUnique({
    where: { qrTokenHash: hashQrToken(token) },
    include: registrationInclude
  });
  if (!registration) {
    throw new AppError("INVALID_QR", "Không nhận diện được mã QR.", 404);
  }
  return createCheckin(registration, eventId, userId, CheckinMethod.QR);
}

export async function checkInManually(
  eventId: string,
  userId: string,
  rawInput: unknown
) {
  const { registrationId } = manualInputSchema.parse(rawInput);
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: registrationInclude
  });
  if (!registration) {
    throw new AppError("INVALID_QR", "Không tìm thấy đăng ký.", 404);
  }
  return createCheckin(registration, eventId, userId, CheckinMethod.MANUAL);
}

export async function getScannerEvent(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      status: true,
      checkinOpenAt: true,
      checkinCloseAt: true,
      _count: {
        select: {
          registrations: { where: { status: RegistrationStatus.REGISTERED } },
          checkins: true
        }
      }
    }
  });
  if (!event) {
    throw new AppError("EVENT_NOT_FOUND", "Không tìm thấy sự kiện.", 404);
  }
  return event;
}

export async function searchRegistrationsForCheckin(eventId: string, search: string) {
  const query = search.trim();
  if (query.length < 2) return [];

  return prisma.registration.findMany({
    where: {
      eventId,
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { studentId: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { registrationCode: { contains: query, mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      fullName: true,
      studentId: true,
      email: true,
      registrationCode: true,
      status: true,
      checkin: { select: { checkedInAt: true, method: true } }
    },
    orderBy: { registeredAt: "desc" },
    take: 10
  });
}

