import { RegistrationSuccess } from "@/components/public/registration-success";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function RegistrationSuccessPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/events/${params.slug}/registration/success`)}`);
  return (
    <main className="min-h-screen bg-muted/40">
      <section className="mx-auto max-w-5xl px-5 py-10 md:py-16">
        <RegistrationSuccess slug={params.slug} userId={user.id} />
      </section>
    </main>
  );
}

