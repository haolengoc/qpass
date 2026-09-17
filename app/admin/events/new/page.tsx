import { EventForm } from "@/components/admin/event-form";
import { requireUser } from "@/lib/auth/session";

export default async function NewEventPage() {
  await requireUser();
  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Tạo sự kiện</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sự kiện mới được lưu ở trạng thái bản nháp.</p>
      </div>
      <EventForm />
    </section>
  );
}
