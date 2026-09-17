import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { RegistrationForm } from "@/components/public/registration-form";
import { Button } from "@/components/ui/button";
import { eventOrNotFound } from "@/lib/errors/event-or-not-found";
import { getPublicEventBySlug } from "@/services/registration.service";
import { prisma } from "@/lib/db/prisma";

export default async function PublicRegisterPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/events/${params.slug}/register`)}`);
  const event = await eventOrNotFound(() => getPublicEventBySlug(params.slug));
  const existing = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
    select: { id: true }
  });
  if (existing) redirect(`/events/${event.slug}`);
    if (event.derivedState !== "OPEN") {
      return (
        <main className="mx-auto min-h-screen max-w-3xl px-5 py-16 text-center">
          <h1 className="text-2xl font-semibold">Hiện không thể đăng ký</h1>
          <p className="mt-3 text-sm text-muted-foreground">Trạng thái đăng ký của sự kiện đã thay đổi.</p>
          <Button asChild className="mt-6" variant="outline"><Link href={`/events/${event.slug}`}>Về trang sự kiện</Link></Button>
        </main>
      );
    }

    const publicEvent = {
      id: event.id,
      slug: event.slug,
      name: event.name,
      collectPhone: event.collectPhone,
      requirePhone: event.requirePhone,
      collectFaculty: event.collectFaculty,
      requireFaculty: event.requireFaculty,
      fields: event.fields.map((field) => ({
        id: field.id,
        label: field.label,
        fieldKey: field.fieldKey,
        type: field.type,
        required: field.required,
        options: Array.isArray(field.options)
          ? field.options.filter((option): option is string => typeof option === "string")
          : []
      }))
    };

  return (
      <main className="min-h-screen bg-muted/40">
        <section className="mx-auto max-w-3xl px-5 py-10 md:py-14">
          <p className="text-sm font-medium text-primary">{event.name}</p>
          <h1 className="mt-2 text-3xl font-semibold">Đăng ký tham dự</h1>
          <p className="mt-3 text-sm text-muted-foreground">Các trường có dấu * là bắt buộc.</p>
          <div className="mt-8 rounded-md border bg-background p-5 sm:p-8">
            <RegistrationForm event={publicEvent} account={user} />
          </div>
        </section>
      </main>
  );
}

