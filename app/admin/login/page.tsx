import { Suspense } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";
import { redirect } from "next/navigation";
import { isStaff, loginDestination } from "@/lib/auth/access";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await getCurrentUser();
  const session = await getServerSession(authOptions);
  // A promoted account needs a new sign-in to refresh the JWT used by the proxy.
  if (user && isStaff(user.role) && isStaff(session?.user?.role)) {
    redirect(loginDestination((await searchParams).callbackUrl ?? null, user.role));
  }
  return (
    <main className="qpass-auth flex min-h-screen items-center justify-center px-4 py-10">
      <section className="qpass-auth-panel qpass-enter w-full max-w-sm p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Đăng nhập BTC</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ban tổ chức
        </p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        {user && <div className="mt-4 border-t pt-4 text-sm"><p className="break-words">Đang đăng nhập: {user.email}</p><SignOutButton /></div>}
        <Link href="/" className="mt-4 inline-block text-sm text-primary">Về trang sự kiện</Link>
      </section>
    </main>
  );
}
