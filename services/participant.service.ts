import { Prisma, RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";

export type ParticipantFilter = "all" | "checked_in" | "not_checked_in" | "cancelled";

type ParticipantListInput = {
  search?: string;
  status?: ParticipantFilter;
  page?: number;
  limit?: number;
};

export async function listParticipants(eventId: string, input: ParticipantListInput = {}) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      checkinOpenAt: true,
      checkinCloseAt: true
    }
  });
  if (!event) throw new AppError("EVENT_NOT_FOUND", "Không tìm thấy sự kiện.", 404);

  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 20));
  const search = input.search?.trim();
  const status = input.status ?? "all";
  const statusWhere: Prisma.RegistrationWhereInput =
    status === "cancelled"
      ? { status: RegistrationStatus.CANCELLED }
      : status === "checked_in"
        ? { status: RegistrationStatus.REGISTERED, checkin: { isNot: null } }
        : status === "not_checked_in"
          ? { status: RegistrationStatus.REGISTERED, checkin: { is: null } }
          : {};
  const where: Prisma.RegistrationWhereInput = {
    eventId,
    ...statusWhere,
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { studentId: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { registrationCode: { contains: search, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [participants, total] = await prisma.$transaction([
    prisma.registration.findMany({
      where,
      orderBy: { registeredAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        fullName: true,
        studentId: true,
        email: true,
        phone: true,
        faculty: true,
        registrationCode: true,
        status: true,
        registeredAt: true,
        checkin: { select: { checkedInAt: true, method: true } }
      }
    }),
    prisma.registration.count({ where })
  ]);

  return {
    event,
    participants,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
  };
}

export async function getParticipantDetail(registrationId: string) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      eventId: true,
      fullName: true,
      studentId: true,
      email: true,
      phone: true,
      faculty: true,
      registrationCode: true,
      status: true,
      registeredAt: true,
      confirmationEmailSentAt: true,
      event: { select: { name: true } },
      checkin: {
        select: {
          checkedInAt: true,
          method: true,
          user: { select: { name: true } }
        }
      },
      answers: {
        orderBy: { eventField: { order: "asc" } },
        select: {
          value: true,
          eventField: { select: { label: true, fieldKey: true, type: true } }
        }
      }
    }
  });
  if (!registration) {
    throw new AppError("REGISTRATION_NOT_FOUND", "Không tìm thấy người tham dự.", 404);
  }
  return registration;
}
