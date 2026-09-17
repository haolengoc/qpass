import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { Scanner } from "@/components/admin/scanner";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { eventOrNotFound } from "@/lib/errors/event-or-not-found";
import { formatEventDate } from "@/lib/time/format";
import { getScannerEvent } from "@/services/checkin.service";

export default async function ScannerPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  noStore();
  await requireUser();

  const event = await eventOrNotFound(() => getScannerEvent(params.id));
  return (
      <section>
        <Button asChild variant="ghost">
          <Link href={`/admin/events/${event.id}` as Route}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />Sự kiện
          </Link>
        </Button>
        <div className="mb-7 mt-5">
          <h1 className="text-2xl font-semibold">Scanner</h1>
          <p className="mt-1 text-sm text-muted-foreground">{event.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cửa sổ check-in: {formatEventDate(event.checkinOpenAt)} đến {formatEventDate(event.checkinCloseAt)}
          </p>
        </div>
        <Scanner
          event={{
            id: event.id,
            name: event.name,
            registeredCount: event._count.registrations,
            checkedInCount: event._count.checkins
          }}
        />
      </section>
  );
}
