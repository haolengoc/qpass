"use client";

import { Download, Home } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type SuccessData = {
  registration: {
    fullName: string;
    studentId: string;
    email: string;
    registrationCode: string;
  };
  qrToken: string;
  emailSent: boolean;
};

type Receipt = { email: string; emailSent: boolean };

export function RegistrationSuccess({ slug, userId }: { slug: string; userId: string }) {
  const loaded = useRef(false);
  const [data, setData] = useState<SuccessData | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- Session-only QR data is hydrated after the client mounts. */
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const key = `registration-success:${userId}:${slug}`;
    const receiptKey = `registration-receipt:${userId}:${slug}`;
    const stored = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    if (!stored) {
      const storedReceipt = sessionStorage.getItem(receiptKey);
      if (storedReceipt) {
        try {
          setReceipt(JSON.parse(storedReceipt) as Receipt);
        } catch {
          sessionStorage.removeItem(receiptKey);
        }
      }
      setMissing(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as SuccessData;
      setData(parsed);
      const nextReceipt = {
        email: parsed.registration.email,
        emailSent: parsed.emailSent
      };
      setReceipt(nextReceipt);
      sessionStorage.setItem(receiptKey, JSON.stringify(nextReceipt));
      void QRCode.toDataURL(parsed.qrToken, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: "M"
      }).then(setQrImage);
    } catch {
      setMissing(true);
    }
  }, [slug, userId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (missing) {
    return (
      <div className="border-y py-12 text-center">
        <h1 className="text-2xl font-semibold">Không còn dữ liệu QR trong phiên này</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
          {receipt?.emailSent
            ? `Mã QR đã được gửi tới ${receipt.email}. Vì lý do bảo mật, QR không thể tải lại từ trang này.`
            : "Vì lý do bảo mật, mã QR chỉ được hiển thị một lần. Hãy liên hệ ban tổ chức nếu bạn chưa lưu mã."}
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href={`/events/${slug}`}><Home className="h-4 w-4" aria-hidden="true" />Về trang sự kiện</Link>
        </Button>
      </div>
    );
  }

  if (!data) return <p className="py-12 text-center text-sm text-muted-foreground">Đang chuẩn bị mã QR...</p>;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_340px] md:items-start">
      <div>
        <p className="text-sm font-medium text-primary">Đăng ký thành công</p>
        <h1 className="mt-2 text-3xl font-semibold">Hẹn gặp bạn tại sự kiện</h1>
        <dl className="mt-8 grid gap-4 border-y py-6 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Họ và tên</dt><dd className="mt-1 font-medium">{data.registration.fullName}</dd></div>
          <div><dt className="text-muted-foreground">MSSV</dt><dd className="mt-1 font-medium">{data.registration.studentId}</dd></div>
          <div><dt className="text-muted-foreground">Mã đăng ký</dt><dd className="mt-1 font-mono font-semibold">{data.registration.registrationCode}</dd></div>
          <div><dt className="text-muted-foreground">Email</dt><dd className="mt-1 font-medium">{data.registration.email}</dd></div>
        </dl>
        <p className="mt-5 text-sm leading-6 text-muted-foreground">Lưu mã QR ngay bây giờ và xuất trình tại bàn check-in.</p>
        {data.emailSent ? (
          <p className="mt-3 text-sm text-emerald-700">Email xác nhận kèm QR đã được gửi thành công.</p>
        ) : (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Email xác nhận chưa gửi được. Hãy lưu mã QR ngay trên trang này.
          </p>
        )}
        <Button asChild className="mt-5" variant="outline">
          <Link href={`/events/${slug}`}><Home className="h-4 w-4" aria-hidden="true" />Về trang sự kiện</Link>
        </Button>
      </div>
      <div className="rounded-md border bg-background p-4 text-center">
        {qrImage ? (
          <Image
            className="mx-auto aspect-square w-full max-w-80"
            src={qrImage}
            alt="Mã QR check-in"
            width={320}
            height={320}
            unoptimized
          />
        ) : (
          <div className="aspect-square w-full animate-pulse bg-muted" aria-label="Đang tạo mã QR" />
        )}
        {qrImage ? (
          <Button asChild className="mt-4 w-full">
            <a href={qrImage} download={`qr-${data.registration.registrationCode}.png`}>
              <Download className="h-4 w-4" aria-hidden="true" />Lưu mã QR
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
