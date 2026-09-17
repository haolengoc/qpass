import type { Route } from "next";
import { ArrowLeft, ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { ExportMenu } from "@/components/admin/export-menu";
import { ParticipantTable } from "@/components/admin/participant-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { eventOrNotFound } from "@/lib/errors/event-or-not-found";
import { listParticipants, type ParticipantFilter } from "@/services/participant.service";
import { isWithinWindow } from "@/lib/time/event-state";
import { formatEventDate } from "@/lib/time/format";

export default async function ParticipantsPage(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ search?: string; status?: string; page?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  noStore();
  await requireUser();
  const status: ParticipantFilter = searchParams.status === "checked_in" || searchParams.status === "not_checked_in" || searchParams.status === "cancelled" ? searchParams.status : "all";
  const result = await eventOrNotFound(() => listParticipants(params.id, { search: searchParams.search, status, page: Number(searchParams.page) || 1 }));
    const href = (page: number) => { const query = new URLSearchParams(); if (searchParams.search) query.set("search", searchParams.search); if (status !== "all") query.set("status", status); query.set("page", String(page)); return `/admin/events/${params.id}/participants?${query}` as Route; };
    const rows = result.participants.map((item) => ({ ...item, registeredAt: item.registeredAt.toISOString(), checkin: item.checkin ? { ...item.checkin, checkedInAt: item.checkin.checkedInAt.toISOString() } : null }));
    const checkinAvailable = result.event.status === "PUBLISHED" && isWithinWindow(new Date(), result.event.checkinOpenAt, result.event.checkinCloseAt);
    const checkinUnavailableMessage = result.event.status !== "PUBLISHED"
      ? "Sự kiện chưa được xuất bản hoặc đã bị hủy."
      : `Check-in mở từ ${formatEventDate(result.event.checkinOpenAt)} đến ${formatEventDate(result.event.checkinCloseAt)}.`;
  return (
      <section className="space-y-6">
        <div><Button asChild variant="ghost"><Link href={`/admin/events/${params.id}` as Route}><ArrowLeft className="h-4 w-4" />Sự kiện</Link></Button><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Người tham dự</h1><p className="mt-1 text-sm text-muted-foreground">{result.event.name} · {result.pagination.total} kết quả</p></div><ExportMenu eventId={params.id} /></div></div>
        <form className="grid gap-3 border-y py-4 sm:grid-cols-[minmax(0,1fr)_210px_auto]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" type="search" name="search" defaultValue={searchParams.search} placeholder="Tên, MSSV, email hoặc mã đăng ký" /></div><select className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" name="status" defaultValue={status}><option value="all">Tất cả</option><option value="checked_in">Đã check-in</option><option value="not_checked_in">Chưa check-in</option><option value="cancelled">Đã hủy</option></select><Button type="submit" variant="secondary">Lọc</Button></form>
        {rows.length === 0 ? <div className="border-y py-14 text-center"><Users className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Không có người tham dự phù hợp.</p></div> : <ParticipantTable key={rows.map((row) => `${row.id}:${row.checkin?.checkedInAt ?? ""}`).join("|")} eventId={params.id} participants={rows} checkinAvailable={checkinAvailable} checkinUnavailableMessage={checkinUnavailableMessage} />}
        {result.pagination.totalPages > 1 ? <nav className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Trang {result.pagination.page} / {result.pagination.totalPages}</p><div className="flex gap-2"><Button asChild size="icon" variant="outline"><Link aria-label="Trang trước" className={result.pagination.page <= 1 ? "pointer-events-none opacity-50" : undefined} href={href(Math.max(1,result.pagination.page-1))}><ChevronLeft className="h-4 w-4" /></Link></Button><Button asChild size="icon" variant="outline"><Link aria-label="Trang sau" className={result.pagination.page >= result.pagination.totalPages ? "pointer-events-none opacity-50" : undefined} href={href(Math.min(result.pagination.totalPages,result.pagination.page+1))}><ChevronRight className="h-4 w-4" /></Link></Button></div></nav> : null}
      </section>
  );
}
