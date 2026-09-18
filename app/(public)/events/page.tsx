import { ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, MapPin, QrCode, Search, Ticket, Users } from "lucide-react";
import Image from "next/image";
import Link from "@/components/ui/link";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_TIME_ZONE, formatEventDate } from "@/lib/time/format";
import { listParticipantEvents } from "@/services/participant-events.service";
import { EventStatusBadge } from "@/components/admin/event-status-badge";
import { Button } from "@/components/ui/button";
import { ParticipantEventsRefresh } from "@/components/public/participant-events-refresh";
import styles from "./events.module.css";

export default async function ParticipantEventsPage({ searchParams }: {
  searchParams: Promise<{ search?: string | string[]; view?: string | string[]; page?: string | string[] }>;
}) {
  const params = await searchParams;
  const registered = params.view === "registered";
  const querySearch = typeof params.search === "string" ? params.search.slice(0, 200) : "";
  const user = await getCurrentUser();
  if (!user) {
    const query = new URLSearchParams();
    if (querySearch) query.set("search", querySearch);
    if (registered) query.set("view", "registered");
    redirect(`/login?callbackUrl=${encodeURIComponent(`/events${query.size ? `?${query}` : ""}`)}`);
  }
  const { events, pagination, search } = await listParticipantEvents(user.id, {
    search: querySearch, registered, page: typeof params.page === "string" ? Number(params.page) : 1
  });
  function pageHref(page: number) {
    const query = new URLSearchParams({ page: String(page) });
    if (registered) query.set("view", "registered");
    if (search) query.set("search", search);
    return `/events?${query}` as const;
  }

  return <main className={styles.workspace}>
    <ParticipantEventsRefresh enabled={events.some(event => Boolean(event.registration))} />
    <section className={styles.welcome}>
      <Image src="/event-checkin-hero.webp" alt="" fill sizes="100vw" loading="eager" className={styles.welcomeImage} />
      <div className={styles.welcomeInner}>
        <p className={styles.eyebrow}>KHÔNG GIAN NGƯỜI THAM GIA</p>
        <h1>{registered ? "Sự kiện đã đăng ký" : "Khám phá sự kiện"}</h1>
        <p className={styles.greeting}>Xin chào, <strong>{user.name}</strong>!</p>
      </div>
    </section>

    <div className={styles.content}>
      <nav className={styles.tabs} aria-label="Danh sách sự kiện">
        <Link href="/events" aria-current={!registered ? "page" : undefined}>
          <CalendarDays size={18} aria-hidden="true" />Sắp diễn ra
        </Link>
        <Link href="/events?view=registered" aria-current={registered ? "page" : undefined}>
          <Ticket size={18} aria-hidden="true" />Đã đăng ký
        </Link>
        <Link href="/events/qr-codes">
          <QrCode size={18} aria-hidden="true" />Mã QR
        </Link>
      </nav>
      <div className={styles.toolbar}>
        <p><strong>{pagination.total}</strong> sự kiện{search ? ` phù hợp với “${search}”` : ""}</p>
        <form action="/events" className={styles.search}>
          {registered && <input type="hidden" name="view" value="registered" />}
          <Search size={18} aria-hidden="true" />
          <input aria-label="Tìm sự kiện" name="search" type="search" placeholder="Tên sự kiện hoặc địa điểm" defaultValue={search} maxLength={200} />
          <Button type="submit" size="icon" variant="ghost" title="Tìm kiếm" aria-label="Tìm kiếm"><ArrowRight size={18} /></Button>
        </form>
      </div>

      {events.length === 0 ? <div className={styles.empty}>
        <CalendarDays size={36} aria-hidden="true" />
        <h2>{search ? "Không tìm thấy sự kiện phù hợp" : registered ? "Bạn chưa đăng ký sự kiện nào" : "Chưa có sự kiện sắp tới"}</h2>
        {(search || registered) && <Button asChild variant="outline"><Link href="/events">Khám phá sự kiện<ArrowRight size={16} /></Link></Button>}
      </div> : <div className={styles.grid}>
        {events.map(event => {
          const registration = event.registration;
          const checkedIn = registration?.status === "REGISTERED" && Boolean(registration.checkin);
          const canRegister = !registration && event.derivedState === "OPEN";
          return <article key={event.id} className={styles.event}>
            <div className={styles.cardTop}>
              <time dateTime={event.startTime.toISOString()} className={styles.date}>
                <span>THÁNG {formatInTimeZone(event.startTime, APP_TIME_ZONE, "MM")}</span>
                <strong>{formatInTimeZone(event.startTime, APP_TIME_ZONE, "dd")}</strong>
              </time>
              <EventStatusBadge state={event.derivedState} />
            </div>
            <h2><Link href={`/events/${event.slug}`}>{event.name}</Link></h2>
            <div className={styles.meta}>
              <p><CalendarDays size={16} aria-hidden="true" />{formatEventDate(event.startTime)}</p>
              <p><MapPin size={16} aria-hidden="true" />{event.location || "Địa điểm sẽ cập nhật"}</p>
            </div>
            <p className={styles.description}>{event.description}</p>
            <div className={styles.cardBottom}>
              {registration ? <div className={`${styles.registration} ${checkedIn ? styles.checkedIn : ""}`} aria-live="polite">
                <p><CheckCircle2 size={16} aria-hidden="true" />{registration.status === "CANCELLED" ? "Đăng ký đã hủy" : checkedIn ? "Đã check-in" : "Đã đăng ký"}</p>
                <span>Mã đăng ký: {registration.registrationCode}</span>
              </div> : <p className={styles.capacity}><Users size={16} aria-hidden="true" />{event.capacity === null ? `${event._count.registrations} người đăng ký` : `${Math.max(0, event.capacity - event._count.registrations)} / ${event.capacity} chỗ còn lại`}</p>}
              <Button asChild variant={canRegister ? "default" : "outline"} className={canRegister ? styles.registerButton : styles.detailButton}>
                <Link href={canRegister ? `/events/${event.slug}/register` : registration && !checkedIn && registration.status === "REGISTERED" ? `/events/qr-codes#qr-${registration.id}` : `/events/${event.slug}`}>
                  {canRegister ? "Đăng ký tham dự" : registration && !checkedIn && registration.status === "REGISTERED" ? "Mở mã QR" : "Xem chi tiết"}{registration && !checkedIn && registration.status === "REGISTERED" ? <QrCode size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
                </Link>
              </Button>
            </div>
          </article>;
        })}
      </div>}
      {pagination.totalPages > 1 && <nav className={styles.pagination} aria-label="Phân trang sự kiện">
        <span>Trang {pagination.page} / {pagination.totalPages}</span>
        <div>
          {pagination.page > 1 && <Button asChild variant="outline" size="icon"><Link href={pageHref(pagination.page - 1)} aria-label="Trang trước"><ChevronLeft size={18} /></Link></Button>}
          {pagination.page < pagination.totalPages && <Button asChild variant="outline" size="icon"><Link href={pageHref(pagination.page + 1)} aria-label="Trang sau"><ChevronRight size={18} /></Link></Button>}
        </div>
      </nav>}
    </div>
  </main>;
}
