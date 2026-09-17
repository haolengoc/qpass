import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import Link from "@/components/ui/link";
import { EventStatusBadge } from "@/components/admin/event-status-badge";
import { Button } from "@/components/ui/button";
import { eventOrNotFound } from "@/lib/errors/event-or-not-found";
import { formatEventDate } from "@/lib/time/format";
import { getPublicEventBySlug } from "@/services/registration.service";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const stateMessages = {
  CANCELLED: "Sự kiện đã bị hủy.",
  DRAFT: "Sự kiện chưa được xuất bản.",
  COMPLETED: "Sự kiện đã kết thúc.",
  ONGOING: "Sự kiện đang diễn ra.",
  NOT_OPEN_YET: "Cổng đăng ký chưa mở.",
  OPEN: "Cổng đăng ký đang mở.",
  FULL: "Sự kiện đã đủ số lượng đăng ký.",
  CLOSED: "Cổng đăng ký đã đóng."
} as const;

export default async function PublicEventPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const event = await eventOrNotFound(() => getPublicEventBySlug(params.slug));
  const user = await getCurrentUser();
  const registration = user ? await prisma.registration.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
    select: { registrationCode: true, status: true }
  }) : null;
  return (
      <main className="min-h-screen bg-muted/40">
        <section className="mx-auto max-w-5xl px-5 py-10 md:py-16">
          <div className="flex flex-wrap items-center gap-3">
            <EventStatusBadge state={event.derivedState} />
            <span className="text-sm text-muted-foreground">{stateMessages[event.derivedState]}</span>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight md:text-5xl">{event.name}</h1>
          {event.description ? (
            <p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-7 text-muted-foreground">{event.description}</p>
          ) : null}

          <div className="mt-10 grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-background p-5"><CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" /><p className="mt-3 text-xs text-muted-foreground">Thời gian</p><p className="mt-1 text-sm font-medium">{formatEventDate(event.startTime)}</p><p className="text-xs text-muted-foreground">đến {formatEventDate(event.endTime)}</p></div>
            <div className="bg-background p-5"><MapPin className="h-5 w-5 text-primary" aria-hidden="true" /><p className="mt-3 text-xs text-muted-foreground">Địa điểm</p><p className="mt-1 text-sm font-medium">{event.location || "Sẽ cập nhật"}</p></div>
            <div className="bg-background p-5"><Clock className="h-5 w-5 text-primary" aria-hidden="true" /><p className="mt-3 text-xs text-muted-foreground">Đăng ký</p><p className="mt-1 text-sm font-medium">{formatEventDate(event.registrationOpenAt)}</p><p className="text-xs text-muted-foreground">đến {formatEventDate(event.registrationCloseAt)}</p></div>
            <div className="bg-background p-5"><Users className="h-5 w-5 text-primary" aria-hidden="true" /><p className="mt-3 text-xs text-muted-foreground">Số lượng</p><p className="mt-1 text-sm font-medium">{event.registeredCount}{event.capacity !== null ? ` / ${event.capacity}` : " người đăng ký"}</p><p className="text-xs text-muted-foreground">{event.capacity === null ? "Không giới hạn" : "suất"}</p></div>
          </div>

          {registration ? (
            <div className="mt-8 border-l-4 border-[#00616b] bg-[#edf6f5] p-5">
              <p className="font-semibold text-[#00616b]">{registration.status === "REGISTERED" ? "Bạn đã đăng ký sự kiện này" : "Đăng ký của bạn đã bị hủy"}</p>
              <p className="mt-2 text-sm">Mã đăng ký: {registration.registrationCode}</p>
              <Link href="/events?view=registered" className="mt-3 inline-block text-sm text-[#00616b] underline">Sự kiện đã đăng ký</Link>
            </div>
          ) : event.derivedState === "OPEN" ? (
            <Button asChild className="mt-8" size="lg"><Link href={`/events/${event.slug}/register`}>Đăng ký tham dự</Link></Button>
          ) : null}
        </section>
      </main>
  );
}

