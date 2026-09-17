"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Bell, CheckCheck, CheckCircle2, LoaderCircle, TicketCheck, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "@/components/ui/link";
import type { NotificationInbox } from "@/lib/notifications/types";
import { formatEventDate } from "@/lib/time/format";
import styles from "./notification-inbox.module.css";

export function NotificationInboxButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState<NotificationInbox | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const mutation = useRef(false);
  const active = useRef(false);
  const version = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (mutation.current || document.visibilityState !== "visible") return;
    controller.current?.abort();
    const currentController = new AbortController();
    controller.current = currentController;
    const currentVersion = ++version.current;
    try {
      const response = await fetch("/api/notifications", { cache: "no-store", signal: currentController.signal });
      if (!response.ok) throw new Error("Không thể tải thông báo. Bạn thử lại nhé.");
      const payload = await response.json();
      if (currentVersion !== version.current) return;
      setInbox(payload.data);
      setError("");
    } catch (caught) {
      if (!currentController.signal.aborted && currentVersion === version.current) {
        setError(caught instanceof Error ? caught.message : "Không thể tải thông báo.");
      }
    }
  }, []);

  useEffect(() => {
    active.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- State updates follow an asynchronous network response, not the effect's synchronous work.
    void refresh();
    const update = () => { void refresh(); };
    const interval = window.setInterval(update, 10_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
      controller.current?.abort();
      version.current += 1;
      active.current = false;
    };
  }, [pathname, refresh]);

  async function markRead(input: { action: "read"; kind: "registration" | "checkin"; registrationId: string } | { action: "read-all"; before: string }) {
    if (mutation.current) return;
    mutation.current = true;
    setSaving(true);
    controller.current?.abort();
    const currentVersion = ++version.current;
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input), keepalive: true
      });
      if (!response.ok) throw new Error("Chưa lưu được trạng thái đã đọc. Bạn thử lại nhé.");
      const payload = await response.json();
      if (currentVersion === version.current) {
        setInbox(payload.data);
        setError("");
      }
    } catch (caught) {
      if (currentVersion === version.current) setError(caught instanceof Error ? caught.message : "Không thể cập nhật thông báo.");
    } finally {
      mutation.current = false;
      if (active.current) setSaving(false);
      // A navigation may have invalidated the response while the write finished.
      if (active.current && currentVersion !== version.current) void refresh();
    }
  }

  const unread = inbox?.unreadCount ?? 0;
  return (
    <Dialog.Root modal={false} open={open} onOpenChange={(value) => { setOpen(value); if (value) void refresh(); }}>
      <Dialog.Trigger asChild>
        <button type="button" className={styles.trigger} aria-label={unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}>
          <Bell size={22} aria-hidden="true" />
          {unread > 0 && <span className={styles.count} aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content className={styles.panel}>
          <div className={styles.heading}>
            <div>
              <Dialog.Title className={styles.title}>Thông báo</Dialog.Title>
              <Dialog.Description className={styles.subtitle}>{unread ? `${unread} thông báo chưa đọc` : "Đăng ký và check-in của bạn"}</Dialog.Description>
            </div>
            <Dialog.Close className={styles.close} aria-label="Đóng thông báo"><X size={20} aria-hidden="true" /></Dialog.Close>
          </div>
          {inbox && unread > 0 && <button className={styles.markAll} type="button" disabled={saving} onClick={() => void markRead({ action: "read-all", before: inbox.asOf })}>
            {saving ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <CheckCheck size={16} aria-hidden="true" />}
            Đánh dấu tất cả đã đọc
          </button>}
          {error && <div className={styles.error} role="alert"><p>{error}</p><button type="button" onClick={() => void refresh()}>Thử lại</button></div>}
          {!inbox && !error && <p className={styles.empty} role="status"><LoaderCircle className="animate-spin" size={24} aria-hidden="true" />Đang tải thông báo…</p>}
          {inbox && inbox.items.length === 0 && <div className={styles.empty}><Bell size={32} aria-hidden="true" /><strong>Chưa có thông báo</strong><p>Thông báo sẽ xuất hiện khi bạn đăng ký hoặc check-in sự kiện.</p></div>}
          {inbox && inbox.items.length > 0 && <ul className={styles.list}>
            {inbox.items.map((item) => (
              <li key={item.id}>
                <Link href={`/events/${item.eventSlug}`} className={`${styles.item} ${!item.read ? styles.unread : ""}`} onClick={(event) => {
                  if (!item.read) void markRead({ action: "read", registrationId: item.registrationId, kind: item.kind });
                  if (!event.ctrlKey && !event.metaKey && !event.shiftKey) setOpen(false);
                }}>
                  <span className={`${styles.icon} ${item.kind === "checkin" ? styles.checkin : ""}`} aria-hidden="true">
                    {item.kind === "checkin" ? <CheckCircle2 size={20} /> : <TicketCheck size={20} />}
                  </span>
                  <span className={styles.message}>
                    <strong>{item.kind === "checkin" ? "Check-in thành công" : "Đăng ký thành công"}</strong>
                    <span>Bạn đã {item.kind === "checkin" ? "check-in" : "đăng ký"} sự kiện <b>{item.eventName}</b> thành công.</span>
                    <time dateTime={item.occurredAt}>{formatEventDate(item.occurredAt)}</time>
                  </span>
                  {!item.read && <span className={styles.dot}><span className="sr-only">Chưa đọc</span></span>}
                </Link>
              </li>
            ))}
          </ul>}
          {inbox && inbox.items.length >= 30 && <p className={styles.footer}>Hiển thị 30 thông báo gần nhất</p>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
