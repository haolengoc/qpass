import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { NotificationInbox, ParticipantNotification } from "@/lib/notifications/types";

const LIMIT = 30;
const eventSelect = { name: true, slug: true } as const;

// Derive the inbox from committed registrations/check-ins, including older ones.
// No second write or email delivery is required to generate a notification.
export async function listNotifications(userId: string): Promise<NotificationInbox> {
  const asOf = new Date();
  const [registrations, checkins, unreadRegistrations, unreadCheckins] = await prisma.$transaction([
    prisma.registration.findMany({
      where: { userId, registeredAt: { lte: asOf } },
      select: { id: true, registeredAt: true, registrationNoticeReadAt: true, event: { select: eventSelect } },
      orderBy: [{ registeredAt: "desc" }, { id: "desc" }], take: LIMIT
    }),
    prisma.checkin.findMany({
      where: { registration: { userId }, checkedInAt: { lte: asOf } },
      select: {
        registrationId: true, checkedInAt: true,
        registration: { select: { checkinNoticeReadAt: true, event: { select: eventSelect } } }
      },
      orderBy: [{ checkedInAt: "desc" }, { id: "desc" }], take: LIMIT
    }),
    prisma.registration.count({ where: { userId, registrationNoticeReadAt: null, registeredAt: { lte: asOf } } }),
    prisma.registration.count({ where: { userId, checkinNoticeReadAt: null, checkin: { checkedInAt: { lte: asOf } } } })
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

  const items: ParticipantNotification[] = [
    ...registrations.map((item) => ({
      id: `registration:${item.id}`, registrationId: item.id, kind: "registration" as const,
      eventName: item.event.name, eventSlug: item.event.slug,
      occurredAt: item.registeredAt.toISOString(), read: item.registrationNoticeReadAt !== null
    })),
    ...checkins.map((item) => ({
      id: `checkin:${item.registrationId}`, registrationId: item.registrationId, kind: "checkin" as const,
      eventName: item.registration.event.name, eventSlug: item.registration.event.slug,
      occurredAt: item.checkedInAt.toISOString(), read: item.registration.checkinNoticeReadAt !== null
    }))
  ];
  items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id));
  return { items: items.slice(0, LIMIT), unreadCount: unreadRegistrations + unreadCheckins, asOf: asOf.toISOString() };
}

const readInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), registrationId: z.string().uuid(), kind: z.enum(["registration", "checkin"]) }).strict(),
  z.object({ action: z.literal("read-all"), before: z.string().datetime() }).strict()
]);

export async function markNotificationsRead(userId: string, input: unknown) {
  const parsed = readInput.parse(input);
  const now = new Date();
  if (parsed.action === "read") {
    await prisma.registration.updateMany({
      where: {
        id: parsed.registrationId, userId,
        ...(parsed.kind === "registration" ? { registrationNoticeReadAt: null } : { checkinNoticeReadAt: null, checkin: { isNot: null } })
      },
      data: parsed.kind === "registration" ? { registrationNoticeReadAt: now } : { checkinNoticeReadAt: now }
    });
    return;
  }
  // Leave notifications arriving after the displayed snapshot unread.
  const before = new Date(Math.min(new Date(parsed.before).getTime(), now.getTime()));
  await prisma.$transaction([
    prisma.registration.updateMany({
      where: { userId, registrationNoticeReadAt: null, registeredAt: { lte: before } },
      data: { registrationNoticeReadAt: now }
    }),
    prisma.registration.updateMany({
      where: { userId, checkinNoticeReadAt: null, checkin: { checkedInAt: { lte: before } } },
      data: { checkinNoticeReadAt: now }
    })
  ]);
}
