import { RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { createQrToken, decryptQrToken, encryptQrToken, hashQrToken } from "@/lib/qr/token";

const registrationSelect = {
  id: true,
  userId: true,
  registrationCode: true,
  registeredAt: true,
  confirmationEmailSentAt: true,
  qrTokenEncrypted: true,
  status: true,
  fullName: true,
  studentId: true,
  email: true,
  event: {
    select: {
      name: true,
      slug: true,
      status: true,
      location: true,
      startTime: true,
      endTime: true
    }
  },
  checkin: { select: { checkedInAt: true } }
} as const;

export async function listParticipantQrRegistrations(userId: string) {
  return prisma.registration.findMany({
    where: {
      userId,
      status: RegistrationStatus.REGISTERED,
      checkin: null,
      event: { status: "PUBLISHED" }
    },
    select: {
      id: true,
      registrationCode: true,
      registeredAt: true,
      event: {
        select: {
          name: true,
          slug: true,
          location: true,
          startTime: true,
          endTime: true
        }
      }
    },
    orderBy: [{ event: { startTime: "asc" } }, { id: "asc" }]
  });
}

export async function findParticipantRegistrationBySlug(userId: string, slug: string) {
  return prisma.registration.findFirst({
    where: { userId, event: { slug } },
    select: registrationSelect
  });
}

export async function getParticipantQr(registrationId: string, userId: string) {
  const registration = await prisma.registration.findFirst({
    where: { id: registrationId, userId },
    select: registrationSelect
  });
  if (!registration) {
    throw new AppError("REGISTRATION_NOT_FOUND", "Không tìm thấy đăng ký.", 404);
  }
  if (registration.status !== RegistrationStatus.REGISTERED) {
    return { checkedIn: false as const, unavailable: true as const };
  }
  if (registration.checkin) {
    return {
      checkedIn: true as const,
      checkedInAt: registration.checkin.checkedInAt.toISOString(),
      eventName: registration.event.name,
      eventSlug: registration.event.slug
    };
  }
  if (registration.event.status !== "PUBLISHED") {
    return { checkedIn: false as const, unavailable: true as const };
  }

  let qrToken: string;
  if (registration.qrTokenEncrypted) {
    qrToken = decryptQrToken(registration.qrTokenEncrypted, registration.registrationCode);
  } else {
    // Older registrations only stored a one-way hash. Rotate it once so the
    // participant can reopen a valid QR without exposing the previous token.
    const replacement = createQrToken();
    const encrypted = encryptQrToken(replacement, registration.registrationCode);
    const updated = await prisma.registration.updateMany({
      where: {
        id: registration.id,
        userId,
        qrTokenEncrypted: null,
        checkin: null,
        status: RegistrationStatus.REGISTERED
      },
      data: {
        qrTokenHash: hashQrToken(replacement),
        qrTokenEncrypted: encrypted
      }
    });
    if (updated.count === 1) {
      qrToken = replacement;
    } else {
      const current = await prisma.registration.findFirst({
        where: { id: registration.id, userId },
        select: { qrTokenEncrypted: true, registrationCode: true, checkin: { select: { checkedInAt: true } } }
      });
      if (current?.checkin) {
        return {
          checkedIn: true as const,
          checkedInAt: current.checkin.checkedInAt.toISOString(),
          eventName: registration.event.name,
          eventSlug: registration.event.slug
        };
      }
      if (!current?.qrTokenEncrypted) {
        throw new AppError("INTERNAL_ERROR", "Chưa thể chuẩn bị mã QR.", 500);
      }
      qrToken = decryptQrToken(current.qrTokenEncrypted, current.registrationCode);
    }
  }

  return {
    checkedIn: false as const,
    unavailable: false as const,
    qrToken,
    registration: {
      id: registration.id,
      fullName: registration.fullName,
      studentId: registration.studentId,
      email: registration.email,
      registrationCode: registration.registrationCode
    },
    event: {
      name: registration.event.name,
      slug: registration.event.slug,
      location: registration.event.location,
      startTime: registration.event.startTime.toISOString(),
      endTime: registration.event.endTime.toISOString()
    }
  };
}
