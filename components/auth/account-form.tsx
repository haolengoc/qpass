"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "@/components/ui/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginDestination } from "@/lib/auth/access";
import { queueToast } from "@/components/ui/toast-provider";

export function AccountForm({ mode = "login", staff = false }: {
  mode?: "login" | "signup"; staff?: boolean;
}) {
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const destination = loginDestination(params.get("callbackUrl"), staff ? "ORGANIZER" : "PARTICIPANT");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      if (mode === "signup") {
        if (data.get("password") !== data.get("confirmPassword")) {
          throw new Error("Mật khẩu xác nhận chưa khớp.");
        }
        const response = await fetch("/api/accounts", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: data.get("name"), email: data.get("email"), password: data.get("password") })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.message || "Không thể tạo tài khoản.");
      }
      const result = await signIn("credentials", {
        redirect: false, email: data.get("email"), password: data.get("password"),
        audience: staff ? "staff" : "participant"
      });
      if (!result || result.error) {
        throw new Error(mode === "signup" ? "Đã tạo tài khoản. Vui lòng thử đăng nhập lại."
          : staff ? "Thông tin đăng nhập BTC không đúng hoặc tài khoản không có quyền."
          : "Email hoặc mật khẩu không đúng. Vui lòng thử lại sau nếu đã đăng nhập nhiều lần.");
      }
      queueToast({
        title: mode === "signup"
          ? "Tạo tài khoản thành công"
          : staff
            ? "Đăng nhập BTC thành công"
            : "Đăng nhập thành công",
        description: mode === "signup" ? "Tài khoản của bạn đã sẵn sàng." : undefined
      });
      window.location.assign(destination);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể kết nối. Vui lòng thử lại.");
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="mt-6 space-y-4">
    {mode === "signup" && <div className="space-y-2">
      <Label htmlFor="name">Họ và tên</Label>
      <Input id="name" name="name" autoComplete="name" minLength={2} maxLength={100} required />
    </div>}
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
    </div>
    <div className="space-y-2">
      <Label htmlFor="password">Mật khẩu</Label>
      <Input id="password" name="password" type="password" minLength={mode === "signup" ? 6 : 1}
        maxLength={72} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
      {mode === "signup" && <p className="text-xs text-muted-foreground">Tối thiểu 6 ký tự.</p>}
    </div>
    {mode === "signup" && <div className="space-y-2">
      <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
      <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Đang xử lý..." : mode === "signup" ? "Tạo tài khoản" : "Đăng nhập"}
    </Button>
    {!staff && <p className="text-sm">
      {mode === "signup" ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
      <Link className="text-primary underline" href={{
        pathname: mode === "signup" ? "/login" : "/signup", query: { callbackUrl: destination }
      }}>{mode === "signup" ? "Đăng nhập" : "Tạo tài khoản"}</Link>
    </p>}
  </form>;
}
