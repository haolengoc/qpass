import { CalendarDays, CheckCircle2, TrendingUp, Users } from "lucide-react";
import type { Route } from "next";
import Link from "@/components/ui/link";
import { unstable_noStore as noStore } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { formatEventDate } from "@/lib/time/format";
import { getGlobalDashboard } from "@/services/dashboard.service";

export default async function AdminDashboardPage() {
  noStore();
  await requireUser();
  const dashboard = await getGlobalDashboard();
  const metrics = [
    { label: "Sự kiện", value: dashboard.totalEvents, icon: CalendarDays },
    { label: "Đăng ký hoạt động", value: dashboard.activeRegistrations, icon: Users },
    { label: "Đã check-in", value: dashboard.totalCheckins, icon: CheckCircle2 },
    { label: "Tỷ lệ tham dự", value: `${dashboard.attendanceRate}%`, icon: TrendingUp }
  ];

  return (
    <section className="space-y-8">
      <div><h1 className="text-2xl font-semibold">Dashboard</h1><p className="mt-1 text-sm text-muted-foreground">Tổng quan hoạt động toàn hệ thống</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => <div className="qpass-metric" key={label}><Icon className="h-5 w-5 text-primary" aria-hidden="true" /><p className="mt-4 text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-semibold">{value}</p></div>)}
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <section><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Sự kiện sắp tới</h2><Link className="text-sm text-primary hover:underline" href="/admin/events">Xem tất cả</Link></div><div className="mt-4 divide-y border-y">{dashboard.upcomingEvents.length === 0 ? <p className="py-8 text-sm text-muted-foreground">Không có sự kiện sắp tới.</p> : dashboard.upcomingEvents.map((event) => <Link href={`/admin/events/${event.id}` as Route} className="flex items-start justify-between gap-4 py-4 hover:text-primary" key={event.id}><div><p className="text-sm font-medium">{event.name}</p><p className="mt-1 text-xs text-muted-foreground">{formatEventDate(event.startTime)} · {event.location || "Chưa đặt địa điểm"}</p></div><span className="text-sm font-medium">{event._count.registrations}</span></Link>)}</div></section>
        <section><h2 className="text-lg font-semibold">Check-in gần đây</h2><div className="mt-4 divide-y border-y">{dashboard.recentCheckins.length === 0 ? <p className="py-8 text-sm text-muted-foreground">Chưa có hoạt động check-in.</p> : dashboard.recentCheckins.map((item) => <div className="flex items-start justify-between gap-4 py-4" key={item.id}><div><p className="text-sm font-medium">{item.registration.fullName}</p><p className="mt-1 text-xs text-muted-foreground">{item.event.name} · {item.method}</p></div><time className="whitespace-nowrap text-xs text-muted-foreground">{formatEventDate(item.checkedInAt)}</time></div>)}</div></section>
      </div>
    </section>
  );
}
