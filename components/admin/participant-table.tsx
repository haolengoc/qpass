"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  Mail,
  QrCode,
  ScanLine,
  UserCheck,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { KeyboardEvent, MouseEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { formatEventDate } from "@/lib/time/format";
import styles from "./participant-table.module.css";

type ParticipantRow = {
  id: string;
  fullName: string;
  studentId: string;
  email: string;
  phone: string | null;
  faculty: string | null;
  registrationCode: string;
  status: "REGISTERED" | "CANCELLED";
  registeredAt: string;
  checkin: { checkedInAt: string; method: "QR" | "MANUAL" } | null;
};

type ParticipantDetail = ParticipantRow & {
  eventId: string;
  confirmationEmailSentAt: string | null;
  event: { name: string };
  checkin: (ParticipantRow["checkin"] & { user: { name: string } }) | null;
  answers: Array<{
    value: unknown;
    eventField: { label: string; fieldKey: string; type: string };
  }>;
};

function answerText(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return JSON.stringify(value);
}

function participantInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0).toLocaleUpperCase("vi"))
    .join("");
}

export function ParticipantTable({
  eventId,
  participants,
  checkinAvailable,
  checkinUnavailableMessage
}: {
  eventId: string;
  participants: ParticipantRow[];
  checkinAvailable: boolean;
  checkinUnavailableMessage: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [rows, setRows] = useState(participants);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ParticipantDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  async function showDetail(registrationId: string) {
    setOpen(true);
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const response = await fetch(`/api/admin/registrations/${registrationId}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Không thể tải chi tiết.");
      setDetail(payload.data.registration);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải chi tiết.");
    } finally {
      setLoading(false);
    }
  }

  function rowKeyDown(keyEvent: KeyboardEvent<HTMLTableRowElement>, registrationId: string) {
    if (keyEvent.key === "Enter" || keyEvent.key === " ") {
      keyEvent.preventDefault();
      void showDetail(registrationId);
    }
  }

  async function manualCheckin(registrationId: string) {
    setCheckingIn(registrationId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/checkins/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Không thể check-in.");
      const checkin = {
        checkedInAt: payload.data.checkin.checkedInAt,
        method: payload.data.checkin.method as "QR" | "MANUAL"
      };
      setRows((current) => current.map((row) =>
        row.id === registrationId ? { ...row, checkin } : row
      ));
      setDetail((current) =>
        current && current.id === registrationId
          ? {
              ...current,
              checkin: {
                ...checkin,
                user: { name: "Tài khoản hiện tại" }
              }
            }
          : current
      );
      showToast({
        title: payload.data.status === "ALREADY_CHECKED_IN"
          ? "Đã check-in trước đó"
          : "Check-in thủ công thành công",
        description: `${payload.data.participant.fullName} · ${payload.data.participant.studentId}`,
        variant: payload.data.status === "ALREADY_CHECKED_IN" ? "info" : "success"
      });
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Không thể check-in.";
      setError(message);
      showToast({ title: "Không thể check-in", description: message, variant: "error" });
    } finally {
      setCheckingIn(null);
    }
  }

  function checkinFromList(event: MouseEvent, registrationId: string) {
    event.stopPropagation();
    void manualCheckin(registrationId);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {!checkinAvailable ? <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{checkinUnavailableMessage}</p> : null}
      <div className={styles.tableShell}>
        <table className={styles.table}>
          <thead>
            <tr><th className="px-4 py-3 font-medium">Người tham dự</th><th className="px-4 py-3 font-medium">Mã đăng ký</th><th className="px-4 py-3 font-medium">Đăng ký lúc</th><th className="px-4 py-3 font-medium">Trạng thái</th><th className="px-4 py-3 font-medium">Check-in</th><th className="px-4 py-3 text-right font-medium">Thao tác</th></tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} role="button" tabIndex={0} className={styles.row} onClick={() => void showDetail(item.id)} onKeyDown={(event) => rowKeyDown(event, item.id)}>
                <td className={styles.participantCell}>
                  <span className={styles.cellLabel}>Người tham dự</span>
                  <div className={styles.participant}>
                    <span className={styles.avatar} aria-hidden="true">{participantInitials(item.fullName)}</span>
                    <div className={styles.participantText}>
                      <p className={styles.participantName}>{item.fullName}</p>
                      <p className={styles.identity}>
                        <span><GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />{item.studentId}</span>
                        <span className={styles.email}><Mail className="h-3.5 w-3.5" aria-hidden="true" />{item.email}</span>
                      </p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={styles.cellLabel}>Mã đăng ký</span>
                  <span className={styles.registrationCode}><ScanLine className="h-3.5 w-3.5" aria-hidden="true" />{item.registrationCode}</span>
                </td>
                <td>
                  <span className={styles.cellLabel}>Đăng ký lúc</span>
                  <span className={styles.registeredAt}><CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />{formatEventDate(item.registeredAt)}</span>
                </td>
                <td>
                  <span className={styles.cellLabel}>Trạng thái</span>
                  <span className={`${styles.badge} ${item.status === "REGISTERED" ? styles.activeBadge : styles.cancelledBadge}`}>
                    {item.status === "REGISTERED" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Ban className="h-3.5 w-3.5" aria-hidden="true" />}
                    {item.status === "REGISTERED" ? "Hoạt động" : "Đã hủy"}
                  </span>
                </td>
                <td>
                  <span className={styles.cellLabel}>Check-in</span>
                  {item.checkin ? (
                    <span className={`${styles.badge} ${styles.checkedBadge}`}><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Đã check-in</span>
                  ) : (
                    <span className={`${styles.badge} ${styles.waitingBadge}`}><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />Chưa check-in</span>
                  )}
                </td>
                <td className={styles.actionCell}>
                  <span className={styles.cellLabel}>Thao tác / phương thức</span>
                  {item.checkin ? (
                    <span className={`${styles.badge} ${styles.methodBadge} ${item.checkin.method === "MANUAL" ? styles.manualBadge : styles.qrBadge}`}>
                      {item.checkin.method === "MANUAL" ? <UserCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <QrCode className="h-3.5 w-3.5" aria-hidden="true" />}
                      {item.checkin.method === "MANUAL" ? "Thủ công" : "Mã QR"}
                    </span>
                  ) : <Button className={styles.checkinButton} size="sm" variant="outline" disabled={!checkinAvailable || item.status === "CANCELLED" || checkingIn !== null} onClick={(event) => checkinFromList(event, item.id)} aria-label={`Check-in thủ công cho ${item.fullName}`} title={!checkinAvailable ? checkinUnavailableMessage : "Check-in thủ công"}>
                    {checkingIn === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}Check-in
                  </Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l bg-background p-6 shadow-xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <div><Dialog.Title className="text-xl font-semibold">Chi tiết người tham dự</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted-foreground">Thông tin đăng ký và check-in</Dialog.Description></div>
            <Dialog.Close asChild><Button size="icon" variant="ghost" aria-label="Đóng"><X className="h-4 w-4" /></Button></Dialog.Close>
          </div>

          {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : null}
          {error ? <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          {detail ? (
            <div className="mt-7 space-y-7">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Họ tên</dt><dd className="mt-1 font-medium">{detail.fullName}</dd></div>
                <div><dt className="text-muted-foreground">MSSV</dt><dd className="mt-1 font-medium">{detail.studentId}</dd></div>
                <div><dt className="text-muted-foreground">Email</dt><dd className="mt-1 break-all font-medium">{detail.email}</dd></div>
                <div><dt className="text-muted-foreground">Số điện thoại</dt><dd className="mt-1 font-medium">{detail.phone || "Không có"}</dd></div>
                <div><dt className="text-muted-foreground">Khoa/Viện</dt><dd className="mt-1 font-medium">{detail.faculty || "Không có"}</dd></div>
                <div><dt className="text-muted-foreground">Mã đăng ký</dt><dd className="mt-1 font-mono font-medium">{detail.registrationCode}</dd></div>
              </dl>

              {detail.answers.length > 0 ? <div className="border-t pt-5"><h3 className="font-medium">Thông tin bổ sung</h3><dl className="mt-4 space-y-3 text-sm">{detail.answers.map((answer) => <div key={answer.eventField.fieldKey}><dt className="text-muted-foreground">{answer.eventField.label}</dt><dd className="mt-1 font-medium">{answerText(answer.value)}</dd></div>)}</dl></div> : null}

              <div className="border-t pt-5">
                <h3 className="font-medium">Check-in</h3>
                {detail.checkin ? <p className="mt-3 text-sm text-emerald-700">Đã check-in lúc {formatEventDate(detail.checkin.checkedInAt)} bằng {detail.checkin.method === "MANUAL" ? "thủ công" : "mã QR"}.</p> : detail.status === "CANCELLED" ? <p className="mt-3 text-sm text-red-600">Đăng ký đã bị hủy.</p> : <><Button className="mt-4" onClick={() => void manualCheckin(detail.id)} disabled={!checkinAvailable || checkingIn !== null}><UserCheck className="h-4 w-4" />{checkingIn === detail.id ? "Đang check-in" : "Check-in thủ công"}</Button>{!checkinAvailable ? <p className="mt-2 text-xs text-amber-800">{checkinUnavailableMessage}</p> : null}</>}
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
