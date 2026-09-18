import { QrCode } from "lucide-react";
import { redirect } from "next/navigation";
import { ParticipantQrCodes, type ParticipantQrSummary } from "@/components/public/participant-qr-codes";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/access";
import { listParticipantQrRegistrations } from "@/services/participant-qr.service";

export default async function ParticipantQrCodesPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent("/events/qr-codes")}`);
  if (isStaff(user.role)) redirect("/admin/events");

  const registrations = await listParticipantQrRegistrations(user.id);
  const items: ParticipantQrSummary[] = registrations.map((item) => ({
    id: item.id,
    registrationCode: item.registrationCode,
    registeredAt: item.registeredAt.toISOString(),
    event: {
      ...item.event,
      startTime: item.event.startTime.toISOString(),
      endTime: item.event.endTime.toISOString()
    }
  }));

  return (
    <main className="min-h-[calc(100vh-84px)] bg-[#f4f8f7]">
      <section className="border-b border-[#dbe8e5] bg-gradient-to-r from-[#eaf6f2] to-[#f8fbfa]">
        <div className="mx-auto max-w-5xl px-5 py-9 sm:px-8">
          <p className="flex items-center gap-2 text-xs font-bold text-[#9b481e]"><QrCode size={17} aria-hidden="true" />VÉ QR CỦA BẠN</p>
          <h1 className="mt-2 text-3xl font-bold text-[#203a36]">Mã QR đang chờ check-in</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#526a68]">
            Mở mã QR tại đây để Ban tổ chức quét. Mã sẽ tự biến mất sau khi check-in thành công.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8 md:py-12">
        <ParticipantQrCodes initialItems={items} />
      </section>
    </main>
  );
}
