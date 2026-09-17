import { RegistrationStatus } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { APP_TIME_ZONE } from "@/lib/time/format";

export type TrendPoint = { date: string; count: number };

export function buildDailyTrend(values: Date[], now = new Date(), days = 14): TrendPoint[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = formatInTimeZone(value, APP_TIME_ZONE, "yyyy-MM-dd");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const end = new Date(now);
  const points: TrendPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = formatInTimeZone(date, APP_TIME_ZONE, "yyyy-MM-dd");
    points.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return points;
}

export async function getGlobalDashboard() {
  const now = new Date();
  const [totalEvents, activeRegistrations, totalCheckins, upcomingEvents, recentCheckins] =
    await prisma.$transaction([
      prisma.event.count(),
      prisma.registration.count({ where: { status: RegistrationStatus.REGISTERED } }),
      prisma.checkin.count({
        where: { registration: { status: RegistrationStatus.REGISTERED } }
      }),
      prisma.event.findMany({
        where: { status: "PUBLISHED", startTime: { gte: now } },
        orderBy: { startTime: "asc" },
        take: 5,
        select: {
          id: true,
          name: true,
          startTime: true,
          location: true,
          _count: {
            select: {
              registrations: { where: { status: RegistrationStatus.REGISTERED } }
            }
          }
        }
      }),
      prisma.checkin.findMany({
        orderBy: { checkedInAt: "desc" },
        take: 8,
        select: {
          id: true,
          checkedInAt: true,
          method: true,
          registration: {
            select: { fullName: true, studentId: true, registrationCode: true }
          },
          event: { select: { id: true, name: true } }
        }
      })
    ]);

  return {
    totalEvents,
    activeRegistrations,
    totalCheckins,
    attendanceRate:
      activeRegistrations === 0
        ? 0
        : Math.round((totalCheckins / activeRegistrations) * 1000) / 10,
    upcomingEvents,
    recentCheckins
  };
}

export async function getEventDashboard(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      slug: true,
      location: true,
      status: true,
      startTime: true,
      endTime: true,
      registrationOpenAt: true,
      registrationCloseAt: true,
      checkinOpenAt: true,
      checkinCloseAt: true
    }
  });
  if (!event) throw new AppError("EVENT_NOT_FOUND", "Không tìm thấy sự kiện.", 404);

  const [registrations, checkins, recentCheckins] = await prisma.$transaction([
    prisma.registration.findMany({
      where: { eventId, status: RegistrationStatus.REGISTERED },
      select: { registeredAt: true }
    }),
    prisma.checkin.findMany({
      where: { eventId, registration: { status: RegistrationStatus.REGISTERED } },
      select: { checkedInAt: true }
    }),
    prisma.checkin.findMany({
      where: { eventId },
      orderBy: { checkedInAt: "desc" },
      take: 10,
      select: {
        id: true,
        checkedInAt: true,
        method: true,
        registration: {
          select: { id: true, fullName: true, studentId: true, registrationCode: true }
        }
      }
    })
  ]);

  const registered = registrations.length;
  const checkedIn = checkins.length;
  return {
    event,
    registered,
    checkedIn,
    notCheckedIn: Math.max(0, registered - checkedIn),
    attendanceRate: registered === 0 ? 0 : Math.round((checkedIn / registered) * 1000) / 10,
    registrationTrend: buildDailyTrend(registrations.map((item) => item.registeredAt)),
    checkinTrend: buildDailyTrend(checkins.map((item) => item.checkedInAt)),
    recentCheckins
  };
}

