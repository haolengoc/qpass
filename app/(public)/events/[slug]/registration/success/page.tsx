import { ParticipantQrCodes, type ParticipantQrSummary } from "@/components/public/participant-qr-codes";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { findParticipantRegistrationBySlug } from "@/services/participant-qr.service";

export default async function RegistrationSuccessPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/events/${params.slug}/registration/success`)}`);
  const registration = await findParticipantRegistrationBySlug(user.id, params.slug);
  if (!registration) redirect(`/events/${params.slug}`);
  const item: ParticipantQrSummary = {
    id: registration.id,
    registrationCode: registration.registrationCode,
    registeredAt: registration.registeredAt.toISOString(),
    event: {
      name: registration.event.name,
      slug: registration.event.slug,
      location: registration.event.location,
      startTime: registration.event.startTime.toISOString(),
      endTime: registration.event.endTime.toISOString()
    }
  };
  return (
    <main className="min-h-screen bg-muted/40">
      <section className="mx-auto max-w-5xl px-5 py-10 md:py-16">
        <ParticipantQrCodes
          initialItems={registration.checkin ? [] : [item]}
          mode="success"
          emailSent={registration.confirmationEmailSentAt !== null}
          initialNotice={registration.checkin ? {
            eventName: registration.event.name,
            eventSlug: registration.event.slug,
            checkedInAt: registration.checkin.checkedInAt.toISOString()
          } : null}
        />
      </section>
    </main>
  );
}

