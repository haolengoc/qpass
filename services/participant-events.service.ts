import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { deriveEventState } from "@/lib/time/event-state";

export async function listParticipantEvents(userId: string, input: {
  search?: string;
  registered?: boolean;
  page?: number;
}) {
  const now = new Date();
  const search = input.search?.trim().slice(0, 200) || "";
  const limit = 12;
  const requestedPage = Number.isSafeInteger(input.page) ? Math.max(1, input.page!) : 1;
  const where: Prisma.EventWhereInput = {
    ...(input.registered
      ? { status: { not: "DRAFT" }, registrations: { some: { userId } } }
      : { status: "PUBLISHED", endTime: { gte: now } }),
    ...(search ? { OR: [
      { name: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } }
    ] } : {})
  };
  const total = await prisma.event.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  const events = await prisma.event.findMany({
    where,
    orderBy: [{ startTime: input.registered ? "desc" : "asc" }, { id: "asc" }],
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true, slug: true, name: true, description: true, location: true,
      status: true, startTime: true, endTime: true, capacity: true,
      registrationOpenAt: true, registrationCloseAt: true,
      _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
      registrations: {
        where: { userId },
        select: { id: true, registrationCode: true, status: true, checkin: { select: { checkedInAt: true } } }
      }
    }
  });
  return {
    events: events.map(({ registrations, ...event }) => ({
      ...event,
      registration: registrations[0] ?? null,
      derivedState: deriveEventState({ ...event, activeRegistrationCount: event._count.registrations, now })
    })),
    pagination: { total, page, totalPages },
    search
  };
}
