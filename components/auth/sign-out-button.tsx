"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useSyncExternalStore } from "react";
import { queueToast } from "@/components/ui/toast-provider";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function SignOutButton() {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      // The server callback URL may use a different port or hostname.
      await signOut({ redirect: false, callbackUrl: "/" });
      // NextAuth v4 does not reject every unsuccessful sign-out response.
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok || (await response.json())?.user) {
        throw new Error("Session was not cleared");
      }

      try {
        for (const key of Object.keys(sessionStorage)) {
          if (key.startsWith("registration-success:") || key.startsWith("registration-receipt:")) {
            sessionStorage.removeItem(key);
          }
        }
      } catch {
        // Browser storage restrictions must not prevent server-side sign-out.
      }
      queueToast({ title: "Đăng xuất thành công", description: "Hẹn gặp lại bạn tại QPass." });
      // Reload the same origin so cached authenticated UI is discarded.
      window.location.replace("/");
    } catch {
      setError("Chưa thể đăng xuất. Bạn thử lại nhé.");
      setPending(false);
      inFlight.current = false;
    }
  }
  return <div className="flex flex-col items-start gap-1">
    <Button variant="ghost" size="sm" onClick={logout} disabled={!ready || pending} aria-busy={pending}>
      <LogOut className="h-4 w-4" aria-hidden="true" />{pending ? "Đang đăng xuất..." : "Đăng xuất"}
    </Button>
    {error && <p role="alert" className="max-w-60 text-xs">{error}</p>}
  </div>;
}
