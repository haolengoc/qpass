"use client";

import { Ban, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

type EventActionsProps = {
  eventId: string;
  eventName: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
};

export function EventActions({ eventId, eventName, status }: EventActionsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, setPending] = useState<"PUBLISH" | "CANCEL" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "PUBLISH" | "CANCEL") {
    if (
      action === "CANCEL" &&
      !window.confirm(`Hủy sự kiện “${eventName}”? Dữ liệu đăng ký sẽ được giữ lại.`)
    ) {
      return;
    }

    setPending(action);
    setError(null);
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Không thể cập nhật.");
      showToast({
        title: action === "PUBLISH" ? "Xuất bản sự kiện thành công" : "Đã hủy sự kiện",
        description: eventName,
        variant: action === "PUBLISH" ? "success" : "info"
      });
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Không thể cập nhật.";
      setError(message);
      showToast({ title: "Không thể cập nhật sự kiện", description: message, variant: "error" });
    } finally {
      setPending(null);
    }
  }

  if (status === "CANCELLED") return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {status === "DRAFT" ? (
        <Button size="sm" onClick={() => run("PUBLISH")} disabled={pending !== null}>
          <Send className="h-4 w-4" aria-hidden="true" />
          {pending === "PUBLISH" ? "Đang xuất bản" : "Xuất bản"}
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        onClick={() => run("CANCEL")}
        disabled={pending !== null}
      >
        <Ban className="h-4 w-4" aria-hidden="true" />
        {pending === "CANCEL" ? "Đang hủy" : "Hủy"}
      </Button>
      {error ? <p role="alert" className="w-full text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
