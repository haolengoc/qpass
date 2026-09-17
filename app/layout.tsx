import type React from "react";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-provider";

export const metadata = {
  title: "QPass",
  description: "Nền tảng đăng ký sự kiện và QR check-in"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
