import Link from "@/components/ui/link";
import type React from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/access";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { QrCode, ShieldCheck } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) return <>{children}</>;
  return (
    <div className="min-h-screen bg-[#f6f9f9] [--primary:186_100%_21%] [--ring:186_100%_21%]">
      <header className="qpass-brand-header bg-[#00616b] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/" aria-label="QPass — Trang chủ" className="qpass-logo flex items-center gap-3">
            <QrCode size={32} aria-hidden="true" />
            <span><span className="block text-2xl font-bold leading-7">QPass</span><span className="block text-[10px] font-bold text-[#ffb68f]">BAN TỔ CHỨC</span></span>
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm [&_button:hover]:bg-white/15">
            <ShieldCheck size={18} aria-hidden="true" />
            <span className="max-w-48 break-words">{user.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <AdminNav />
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
