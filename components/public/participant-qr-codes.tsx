"use client";

import { CalendarDays, CheckCircle2, Download, LoaderCircle, MapPin, QrCode, TicketCheck } from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/ui/link";
import { Button } from "@/components/ui/button";
import { formatEventDate } from "@/lib/time/format";
import styles from "./participant-qr-codes.module.css";

export type ParticipantQrSummary = {
  id: string;
  registrationCode: string;
  registeredAt: string;
  event: {
    name: string;
    slug: string;
    location: string | null;
    startTime: string;
    endTime: string;
  };
};

type QrPayload = {
  checkedIn: false;
  unavailable: false;
  qrToken: string;
  registration: {
    id: string;
    fullName: string;
    studentId: string;
    email: string;
    registrationCode: string;
  };
  event: ParticipantQrSummary["event"];
};

type CheckedInPayload = {
  checkedIn: true;
  checkedInAt: string;
  eventName: string;
  eventSlug: string;
};

type CheckinNotice = { eventName: string; eventSlug: string; checkedInAt: string };

function CheckinCelebration({ notice, onClose, persistent }: {
  notice: CheckinNotice;
  onClose?: () => void;
  persistent?: boolean;
}) {
  return (
    <div className={styles.celebration} role="status" aria-live="assertive" aria-atomic="true">
      <div className={styles.celebrationCard}>
        <span className={styles.successIcon} aria-hidden="true"><CheckCircle2 size={48} /></span>
        <p className={styles.eyebrow}>CHECK-IN HOÀN TẤT</p>
        <h1>Bạn đã check-in thành công!</h1>
        <p className={styles.eventName}>{notice.eventName}</p>
        <p className={styles.checkedTime}>Ghi nhận lúc {formatEventDate(notice.checkedInAt)}</p>
        <div className={styles.successActions}>
          {onClose && !persistent ? <Button type="button" onClick={onClose}>Đóng thông báo</Button> : null}
          <Button asChild variant={onClose && !persistent ? "outline" : "default"}>
            <Link href="/events?view=registered"><TicketCheck size={17} aria-hidden="true" />Sự kiện đã đăng ký</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function QrCard({ item, onCheckedIn, onUnavailable, emailSent }: {
  item: ParticipantQrSummary;
  onCheckedIn: (notice: CheckinNotice) => void;
  onUnavailable: () => void;
  emailSent?: boolean;
}) {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const completed = useRef(false);
  const controller = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (completed.current || document.visibilityState !== "visible") return;
    controller.current?.abort();
    const currentController = new AbortController();
    controller.current = currentController;
    try {
      const response = await fetch(`/api/registrations/${item.id}/qr`, {
        cache: "no-store",
        signal: currentController.signal
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Không thể tải mã QR.");
      const data = payload.data as QrPayload | CheckedInPayload | { checkedIn: false; unavailable: true };
      if (data.checkedIn) {
        completed.current = true;
        setQrImage(null);
        onCheckedIn(data);
        return;
      }
      if (data.unavailable) {
        completed.current = true;
        setQrImage(null);
        onUnavailable();
        return;
      }
      const image = await QRCode.toDataURL(data.qrToken, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: "M"
      });
      if (!currentController.signal.aborted && !completed.current) {
        setQrImage(image);
        setError("");
      }
    } catch (caught) {
      if (!currentController.signal.aborted && !completed.current) {
        setError(caught instanceof Error ? caught.message : "Không thể tải mã QR.");
      }
    }
  }, [item.id, onCheckedIn, onUnavailable]);

  useEffect(() => {
    completed.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- State updates occur after the asynchronous QR request resolves.
    void refresh();
    const update = () => { void refresh(); };
    const interval = window.setInterval(update, 3_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      completed.current = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
      controller.current?.abort();
    };
  }, [refresh]);

  return (
    <article id={`qr-${item.id}`} className={styles.card}>
      <div className={styles.details}>
        <p className={styles.eyebrow}>VÉ THAM DỰ</p>
        <h2>{item.event.name}</h2>
        <p><CalendarDays size={17} aria-hidden="true" />{formatEventDate(item.event.startTime)}</p>
        <p><MapPin size={17} aria-hidden="true" />{item.event.location || "Địa điểm sẽ cập nhật"}</p>
        <dl>
          <div><dt>Mã đăng ký</dt><dd>{item.registrationCode}</dd></div>
        </dl>
        {emailSent === true ? <p className={styles.emailOk}>Email xác nhận kèm QR đã được gửi.</p> : null}
        {emailSent === false ? <p className={styles.emailWarning}>Email chưa gửi được, mã QR vẫn được lưu an toàn tại đây.</p> : null}
        <Button asChild variant="outline" className={styles.detailButton}>
          <Link href={`/events/${item.event.slug}`}>Xem chi tiết sự kiện</Link>
        </Button>
      </div>
      <div className={styles.qrPanel}>
        {qrImage ? (
          <Image src={qrImage} alt={`Mã QR check-in cho ${item.event.name}`} width={360} height={360} unoptimized />
        ) : error ? (
          <div className={styles.qrError} role="alert"><QrCode size={36} aria-hidden="true" /><p>{error}</p><button type="button" onClick={() => void refresh()}>Thử lại</button></div>
        ) : (
          <div className={styles.qrLoading} role="status"><LoaderCircle className="animate-spin" size={30} aria-hidden="true" />Đang chuẩn bị mã QR…</div>
        )}
        {qrImage ? <Button asChild className={styles.download}>
          <a href={qrImage} download={`qr-${item.registrationCode}.png`}><Download size={17} aria-hidden="true" />Lưu mã QR</a>
        </Button> : null}
      </div>
    </article>
  );
}

export function ParticipantQrCodes({ initialItems, mode = "collection", emailSent, initialNotice = null }: {
  initialItems: ParticipantQrSummary[];
  mode?: "collection" | "success";
  emailSent?: boolean;
  initialNotice?: CheckinNotice | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [notice, setNotice] = useState<CheckinNotice | null>(initialNotice);

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  if (notice && mode === "success") {
    return <CheckinCelebration notice={notice} persistent />;
  }

  return (
    <>
      {notice ? <CheckinCelebration notice={notice} onClose={() => setNotice(null)} /> : null}
      {mode === "success" && items.length > 0 ? (
        <div className={styles.registrationSuccess}>
          <CheckCircle2 size={28} aria-hidden="true" />
          <div><h2>Đăng ký thành công</h2><p>Mã QR của bạn đã được lưu và có thể mở lại bất cứ lúc nào trước khi check-in.</p></div>
        </div>
      ) : null}
      {items.length === 0 ? (
        <div className={styles.empty}>
          <CheckCircle2 size={42} aria-hidden="true" />
          <h2>Không còn mã QR đang chờ check-in</h2>
          <p>Mã QR sẽ xuất hiện tại đây sau khi bạn đăng ký và tự biến mất khi check-in thành công.</p>
          <Button asChild><Link href="/events">Khám phá sự kiện</Link></Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => <QrCard
            key={item.id}
            item={item}
            emailSent={mode === "success" ? emailSent : undefined}
            onUnavailable={() => remove(item.id)}
            onCheckedIn={(nextNotice) => {
              remove(item.id);
              setNotice(nextNotice);
            }}
          />)}
        </div>
      )}
    </>
  );
}
