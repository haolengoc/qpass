import Link from "@/components/ui/link";
import { ArrowDown, QrCode } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/access";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationInboxButton } from "@/components/public/notification-inbox";
import styles from "./account-nav.module.css";

export async function AccountNav({ showAuthLinks = true, appearance = "default" }: {
  showAuthLinks?: boolean;
  appearance?: "default" | "brand";
}) {
  const user = await getCurrentUser();
  const branded = appearance === "brand";
  const showInbox = user?.role === "PARTICIPANT";
  return <header className={cn("border-b bg-background", branded && "qpass-brand-header border-transparent bg-[#00616b] text-white")}>
    <nav className={cn("mx-auto max-w-5xl items-center justify-between gap-3 px-5 py-4", showInbox ? styles.inboxNav : "flex flex-wrap", branded && "max-w-7xl sm:px-8 md:py-5")}>
      <Link href="/" aria-label="QPass — Trang chủ" className={cn("qpass-logo font-semibold", branded && "flex items-center gap-3")}>
        {branded && <QrCode className="h-8 w-8" aria-hidden="true" />}
        <span>
          <span className={cn(branded && "block text-2xl font-bold leading-7")}>QPass</span>
          {branded && <span className="block text-[10px] font-bold text-[#ffb68f]">EVENT & CHECK-IN</span>}
        </span>
      </Link>
      <div className={cn("flex flex-wrap items-center gap-3 text-sm", styles.links, branded && "[&_button:hover]:bg-white/15 [&_button]:text-white")}>
        {user ? <>
          <Link href="/events" className="qpass-nav-link font-medium">Sự kiện</Link>
          {!isStaff(user.role) && <Link href="/events?view=registered" className="qpass-nav-link font-medium">Đã đăng ký</Link>}
          <span className="max-w-48 break-words">{user.name}</span>
          {isStaff(user.role) && <Link href="/admin/events" className={branded ? "text-white underline-offset-4 hover:underline" : "text-primary"}>Quản trị BTC</Link>}
          <SignOutButton />
        </> : showAuthLinks ? <>
          <Link href="/login" className={branded ? "text-white" : "text-primary"}>Đăng nhập người tham gia</Link>
          <Link href="/admin/login">Đăng nhập BTC</Link>
        </> : branded ? <Link href="#upcoming-events" className="flex items-center gap-2 rounded-md px-2 py-3 font-medium hover:bg-white/10 sm:px-4">
          Sự kiện <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </Link> : <span className="text-muted-foreground">Cổng sự kiện</span>}
      </div>
      {showInbox && <NotificationInboxButton key={user.id} />}
    </nav>
  </header>;
}
