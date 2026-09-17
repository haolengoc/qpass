"use client";

import Link from "@/components/ui/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartNoAxesCombined, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function AdminNav() {
  const pathname = usePathname();
  return <nav className="border-b bg-white" aria-label="Quản trị">
    <div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 px-5 sm:px-8">
      {([
        { href: "/admin/events", label: "Quản lý sự kiện", icon: CalendarDays, active: pathname.startsWith("/admin/events") },
        { href: "/admin", label: "Tổng quan", icon: ChartNoAxesCombined, active: pathname === "/admin" },
        { href: "/events", label: "Xem cổng sự kiện", icon: ExternalLink, active: false }
      ] as const).map(({ href, label, icon: Icon, active }) => <Link key={href} href={href}
        aria-current={active ? "page" : undefined}
        className={cn("qpass-nav-link flex min-h-14 items-center gap-2 border-b-2 border-transparent text-sm font-medium text-[#596c70] hover:text-[#00616b]", active && "border-[#00616b] text-[#00616b]")}>
        <Icon size={17} aria-hidden="true" />{label}
      </Link>)}
    </div>
  </nav>;
}
