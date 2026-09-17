import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  Search,
  Users
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { EventActions } from "@/components/admin/event-actions";
import { EventStatusBadge } from "@/components/admin/event-status-badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { formatEventDate } from "@/lib/time/format";
import { listAdminEvents } from "@/services/event.service";
import styles from "./events.module.css";

export default async function AdminEventsPage(
  props: {
    searchParams: Promise<{ search?: string; status?: string; page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  noStore();
  await requireUser();
  const status =
    searchParams.status === "DRAFT" ||
    searchParams.status === "PUBLISHED" ||
    searchParams.status === "CANCELLED"
      ? searchParams.status
      : undefined;
  const { events, pagination } = await listAdminEvents({
    search: searchParams.search,
    status,
    page: Number(searchParams.page) || 1
  });
  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    if (searchParams.search) query.set("search", searchParams.search);
    if (status) query.set("status", status);
    query.set("page", String(page));
    return `/admin/events?${query.toString()}` as const;
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-[#a8461a]">KHÔNG GIAN BAN TỔ CHỨC</p>
          <h1 className="text-2xl font-semibold">Quản lý sự kiện</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pagination.total} sự kiện trong hệ thống
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/events/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tạo sự kiện
          </Link>
        </Button>
      </div>

      <form className="grid gap-3 border-y py-4 sm:grid-cols-[minmax(0,1fr)_200px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            type="search"
            name="search"
            defaultValue={searchParams.search}
            placeholder="Tìm theo tên, slug hoặc địa điểm"
            aria-label="Tìm sự kiện"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          name="status"
          defaultValue={status ?? ""}
          aria-label="Lọc theo trạng thái"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="PUBLISHED">Đã xuất bản</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
        <Button type="submit" variant="secondary">Lọc</Button>
      </form>

      {events.length === 0 ? (
        <div className="border-y py-16 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 font-medium">Chưa có sự kiện</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tạo sự kiện đầu tiên để mở đăng ký.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[#d3e1e1] bg-background">
          <table className={styles.table}>
            <thead className="border-b bg-[#edf5f4] text-xs uppercase text-[#52696d]">
              <tr>
                <th className="px-4 py-3 font-medium">Sự kiện</th>
                <th className="px-4 py-3 font-medium">Thời gian</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Đăng ký</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((event) => (
                <tr key={event.id} className="align-top hover:bg-muted/40">
                  <td className="px-4 py-4">
                    <Link href={`/admin/events/${event.id}` as Route} className="font-medium hover:text-primary hover:underline">
                      {event.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {event.location || "Chưa đặt địa điểm"}
                    </div>
                  </td>
                  <td className="px-4 py-4" data-label="Thời gian">
                    {formatEventDate(event.startTime)}
                    <p className="mt-1 text-xs text-muted-foreground">đến {formatEventDate(event.endTime)}</p>
                  </td>
                  <td className="px-4 py-4" data-label="Trạng thái"><EventStatusBadge state={event.derivedState} /></td>
                  <td className="px-4 py-4" data-label="Đăng ký">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      {event._count.registrations}{event.capacity !== null ? ` / ${event.capacity}` : ""}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">{event._count.checkins} đã check-in</p>
                    {event.capacity !== null && <progress className={styles.capacity} max={event.capacity} value={event._count.registrations} aria-label={`Số chỗ đã đăng ký: ${event.name}`} />}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-start justify-end gap-2">
                      <Button asChild size="icon" variant="ghost" title="Sửa sự kiện">
                        <Link href={`/admin/events/${event.id}/edit`} aria-label={`Sửa ${event.name}`}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                      <EventActions eventId={event.id} eventName={event.name} status={event.status} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 ? (
        <nav className="flex items-center justify-between gap-4" aria-label="Phân trang sự kiện">
          <p className="text-sm text-muted-foreground">
            Trang {pagination.page} / {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button asChild size="icon" variant="outline" aria-disabled={pagination.page <= 1}>
              <Link
                href={pageHref(Math.max(1, pagination.page - 1))}
                aria-label="Trang trước"
                className={pagination.page <= 1 ? "pointer-events-none opacity-50" : undefined}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="icon" variant="outline" aria-disabled={pagination.page >= pagination.totalPages}>
              <Link
                href={pageHref(Math.min(pagination.totalPages, pagination.page + 1))}
                aria-label="Trang sau"
                className={pagination.page >= pagination.totalPages ? "pointer-events-none opacity-50" : undefined}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </nav>
      ) : null}
    </section>
  );
}
