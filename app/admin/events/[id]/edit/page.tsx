import { EventActions } from "@/components/admin/event-actions";
import { EventForm, type EventFormInitial } from "@/components/admin/event-form";
import { requireUser } from "@/lib/auth/session";
import { eventOrNotFound } from "@/lib/errors/event-or-not-found";
import { getAdminEvent } from "@/services/event.service";

export default async function EditEventPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await requireUser();

  const event = await eventOrNotFound(() => getAdminEvent(params.id));
    const initial: EventFormInitial = {
      ...event,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      registrationOpenAt: event.registrationOpenAt.toISOString(),
      registrationCloseAt: event.registrationCloseAt.toISOString(),
      checkinOpenAt: event.checkinOpenAt.toISOString(),
      checkinCloseAt: event.checkinCloseAt.toISOString(),
      activeRegistrationCount: event._count.registrations,
      fields: event.fields.map((field) => ({
        id: field.id,
        label: field.label,
        fieldKey: field.fieldKey,
        type: field.type,
        required: field.required,
        options: Array.isArray(field.options)
          ? field.options.filter((option): option is string => typeof option === "string")
          : [],
        isActive: field.isActive
      }))
    };

  return (
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Sửa sự kiện</h1>
            <p className="mt-1 text-sm text-muted-foreground">{event.name}</p>
          </div>
          <EventActions eventId={event.id} eventName={event.name} status={event.status} />
        </div>
        <EventForm initial={initial} />
      </section>
  );
}
