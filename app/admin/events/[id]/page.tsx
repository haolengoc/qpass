import { ArrowLeft, Pencil, ScanLine, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { EventStatusBadge } from "@/components/admin/event-status-badge";
import { ExportMenu } from "@/components/admin/export-menu";
import { TrendChart } from "@/components/admin/trend-chart";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { eventOrNotFound } from "@/lib/errors/event-or-not-found";
import { formatEventDate } from "@/lib/time/format";
import { getEventDashboard } from "@/services/dashboard.service";
import { getAdminEvent } from "@/services/event.service";

export default async function EventDashboardPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  noStore();
  await requireUser();
  const [dashboard, eventState] = await eventOrNotFound(() => Promise.all([
      getEventDashboard(params.id),
      getAdminEvent(params.id)
    ]));
  const { event } = dashboard;
  return (
      <section className="space-y-8">
        <div><Button asChild variant="ghost"><Link href="/admin/events"><ArrowLeft className="h-4 w-4" />Sự kiện</Link></Button><div className="mt-5 flex flex-wrap items-start justify-between gap-5"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold">{event.name}</h1><EventStatusBadge state={eventState.derivedState} /></div><p className="mt-2 text-sm text-muted-foreground">{formatEventDate(event.startTime)} · {event.location || "Chưa đặt địa điểm"}</p></div><div className="flex flex-wrap gap-2"><ExportMenu eventId={event.id} /><Button asChild variant="outline"><Link href={`/admin/events/${event.id}/edit`}><Pencil className="h-4 w-4" />Sửa</Link></Button><Button asChild variant="outline"><Link href={`/admin/events/${event.id}/participants` as Route}><Users className="h-4 w-4" />Người tham dự</Link></Button><Button asChild><Link href={`/admin/events/${event.id}/scanner`}><ScanLine className="h-4 w-4" />Mở scanner</Link></Button></div></div></div>
        <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-4">{[["Đăng ký",dashboard.registered],["Đã check-in",dashboard.checkedIn],["Chưa check-in",dashboard.notCheckedIn],["Tỷ lệ tham dự",`${dashboard.attendanceRate}%`]].map(([label,value]) => <div className="bg-background p-5" key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>)}</div>
        <div className="grid gap-8 lg:grid-cols-2"><section><h2 className="mb-4 text-lg font-semibold">Đăng ký trong 14 ngày</h2><TrendChart data={dashboard.registrationTrend} label="Biểu đồ lượt đăng ký 14 ngày" /></section><section><h2 className="mb-4 text-lg font-semibold">Check-in trong 14 ngày</h2><TrendChart data={dashboard.checkinTrend} label="Biểu đồ lượt check-in 14 ngày" /></section></div>
        <section><h2 className="text-lg font-semibold">Check-in gần đây</h2><div className="mt-4 divide-y border-y">{dashboard.recentCheckins.length === 0 ? <p className="py-8 text-sm text-muted-foreground">Chưa có lượt check-in.</p> : dashboard.recentCheckins.map((item) => <div className="flex items-start justify-between gap-4 py-4" key={item.id}><div><p className="text-sm font-medium">{item.registration.fullName}</p><p className="mt-1 text-xs text-muted-foreground">{item.registration.studentId} · {item.registration.registrationCode} · {item.method}</p></div><time className="whitespace-nowrap text-xs text-muted-foreground">{formatEventDate(item.checkedInAt)}</time></div>)}</div></section>
      </section>
  );
}
