import Link from "@/components/ui/link";
import { Suspense } from "react";
import { AccountForm } from "@/components/auth/account-form";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { loginDestination } from "@/lib/auth/access";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(loginDestination((await searchParams).callbackUrl ?? null, user.role));
  return <main className="qpass-auth flex min-h-screen items-center justify-center px-5 py-12">
    <section className="qpass-auth-panel qpass-enter w-full max-w-md p-6 sm:p-8">
    <Link href="/" className="text-sm text-primary">Về trang sự kiện</Link>
    <h1 className="mt-8 text-2xl font-semibold">Đăng nhập người tham gia</h1>
    <Suspense><AccountForm /></Suspense>
    <Link href="/admin/login" className="mt-6 inline-block text-sm text-muted-foreground underline">Đăng nhập BTC</Link>
    </section>
  </main>;
}
