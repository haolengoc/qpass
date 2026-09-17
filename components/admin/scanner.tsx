"use client";

import type { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, CheckCircle2, Search, UserCheck, XCircle } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Participant = {
  id: string;
  fullName: string;
  studentId: string;
  email: string;
  registrationCode: string;
  status: "REGISTERED" | "CANCELLED";
  checkin: { checkedInAt: string; method: "QR" | "MANUAL" } | null;
};

type ScanResult = {
  kind: "success" | "duplicate" | "error";
  title: string;
  detail?: string;
};

type ScannerProps = {
  event: {
    id: string;
    name: string;
    registeredCount: number;
    checkedInCount: number;
  };
};

export function Scanner({ event }: ScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lockedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "active" | "error">("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(event.checkedInCount);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [manualPending, setManualPending] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const scanner = scannerRef.current;
      if (scanner?.isScanning) void scanner.stop().then(() => scanner.clear()).catch(() => undefined);
    };
  }, []);

  function scheduleResume(delay: number) {
    timeoutRef.current = setTimeout(() => {
      setResult(null);
      lockedRef.current = false;
      const scanner = scannerRef.current;
      if (scanner?.isScanning) {
        try {
          scanner.resume();
        } catch {
          // Camera may have been stopped while the result was visible.
        }
      }
    }, delay);
  }

  async function submitCheckin(path: "qr" | "manual", body: object) {
    const response = await fetch(`/api/admin/events/${event.id}/checkins/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Không thể check-in.");
    }
    return payload.data as {
      status: "SUCCESS" | "ALREADY_CHECKED_IN";
      participant: Participant;
    };
  }

  async function handleQr(token: string) {
    if (lockedRef.current) return;
    lockedRef.current = true;
    const scanner = scannerRef.current;
    if (scanner?.isScanning) {
      try {
        scanner.pause(true);
      } catch {
        // The request lock still prevents duplicate submissions.
      }
    }

    try {
      const data = await submitCheckin("qr", { token });
      if (data.status === "SUCCESS") {
        setCheckedInCount((count) => count + 1);
        setResult({
          kind: "success",
          title: "Check-in thành công",
          detail: `${data.participant.fullName} · ${data.participant.studentId}`
        });
        scheduleResume(1500);
      } else {
        setResult({
          kind: "duplicate",
          title: "Đã check-in trước đó",
          detail: `${data.participant.fullName} · ${data.participant.studentId}`
        });
        scheduleResume(2500);
      }
    } catch (caught) {
      setResult({
        kind: "error",
        title: "Không thể check-in",
        detail: caught instanceof Error ? caught.message : "Mã QR không hợp lệ."
      });
      scheduleResume(2500);
    }
  }

  async function startCamera() {
    if (!window.isSecureContext) {
      setCameraState("error");
      setCameraError("Camera chỉ hoạt động trên HTTPS hoặc localhost.");
      return;
    }

    setCameraState("starting");
    setCameraError(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(`qr-reader-${event.id}`);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        (decodedText) => void handleQr(decodedText),
        () => undefined
      );
      setCameraState("active");
    } catch (caught) {
      setCameraState("error");
      setCameraError(
        caught instanceof Error
          ? caught.message
          : "Không thể mở camera. Hãy kiểm tra quyền truy cập."
      );
    }
  }

  async function stopCamera() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    lockedRef.current = false;
    const scanner = scannerRef.current;
    if (scanner?.isScanning) await scanner.stop();
    await scanner?.clear();
    scannerRef.current = null;
    setResult(null);
    setCameraState("idle");
  }

  async function runSearch(searchEvent: FormEvent) {
    searchEvent.preventDefault();
    if (search.trim().length < 2) return;
    setSearching(true);
    try {
      const response = await fetch(
        `/api/admin/events/${event.id}/participants?search=${encodeURIComponent(search.trim())}`
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Không thể tìm kiếm.");
      setParticipants(payload.data.participants);
    } catch (caught) {
      setResult({
        kind: "error",
        title: "Không thể tìm kiếm",
        detail: caught instanceof Error ? caught.message : undefined
      });
    } finally {
      setSearching(false);
    }
  }

  async function manualCheckin(registrationId: string) {
    setManualPending(registrationId);
    try {
      const data = await submitCheckin("manual", { registrationId });
      if (data.status === "SUCCESS") setCheckedInCount((count) => count + 1);
      setResult({
        kind: data.status === "SUCCESS" ? "success" : "duplicate",
        title: data.status === "SUCCESS" ? "Check-in thành công" : "Đã check-in trước đó",
        detail: `${data.participant.fullName} · ${data.participant.studentId}`
      });
      setParticipants((current) =>
        current.map((item) =>
          item.id === registrationId
            ? { ...item, checkin: { checkedInAt: new Date().toISOString(), method: "MANUAL" } }
            : item
        )
      );
    } catch (caught) {
      setResult({
        kind: "error",
        title: "Không thể check-in",
        detail: caught instanceof Error ? caught.message : undefined
      });
    } finally {
      setManualPending(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Đã check-in</p>
            <p className="text-2xl font-semibold">{checkedInCount} / {event.registeredCount}</p>
          </div>
          {cameraState === "active" ? (
            <Button variant="outline" onClick={() => void stopCamera()}>
              <CameraOff className="h-4 w-4" aria-hidden="true" />Tắt camera
            </Button>
          ) : (
            <Button onClick={() => void startCamera()} disabled={cameraState === "starting"}>
              <Camera className="h-4 w-4" aria-hidden="true" />
              {cameraState === "starting" ? "Đang mở" : "Bật camera"}
            </Button>
          )}
        </div>

        <div className="relative aspect-square w-full max-h-[70vh] overflow-hidden rounded-md bg-neutral-950">
          <div id={`qr-reader-${event.id}`} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
          {cameraState === "idle" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
              <Camera className="h-10 w-10" aria-hidden="true" />
              <p className="mt-3 text-sm">Bật camera để quét QR check-in</p>
            </div>
          ) : null}
          {cameraState === "error" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
              <CameraOff className="h-10 w-10" aria-hidden="true" />
              <p className="mt-3 text-sm">{cameraError}</p>
            </div>
          ) : null}
        </div>

        {result ? (
          <div className={`mt-4 rounded-md border px-4 py-4 ${result.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : result.kind === "duplicate" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700"}`} role="status">
            <div className="flex gap-3">
              {result.kind === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
              <div><p className="font-medium">{result.title}</p>{result.detail ? <p className="mt-1 text-sm">{result.detail}</p> : null}</div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="border-t pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        <h2 className="text-lg font-semibold">Check-in thủ công</h2>
        <form className="mt-4 flex gap-2" onSubmit={runSearch}>
          <Input value={search} onChange={(inputEvent) => setSearch(inputEvent.target.value)} placeholder="MSSV, tên, email hoặc mã" minLength={2} />
          <Button type="submit" size="icon" variant="secondary" disabled={searching} aria-label="Tìm người tham dự">
            <Search className="h-4 w-4" aria-hidden="true" />
          </Button>
        </form>

        <div className="mt-4 divide-y border-y">
          {participants.map((item) => (
            <div className="py-4" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.fullName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.studentId} · {item.registrationCode}</p>
                </div>
                <Button size="icon" variant={item.checkin ? "ghost" : "outline"} disabled={Boolean(item.checkin) || item.status === "CANCELLED" || manualPending !== null} onClick={() => void manualCheckin(item.id)} title={item.checkin ? "Đã check-in" : "Check-in thủ công"} aria-label={`Check-in ${item.fullName}`}>
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              {item.status === "CANCELLED" ? <p className="mt-2 text-xs text-red-600">Đăng ký đã hủy</p> : item.checkin ? <p className="mt-2 text-xs text-emerald-700">Đã check-in</p> : null}
            </div>
          ))}
          {!searching && search.length >= 2 && participants.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Không tìm thấy người tham dự.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

