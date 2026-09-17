import {
  ArrowRight,
  CalendarDays,
  MapPin,
  ShieldCheck,
  UserRound
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth/session";
import { accountHome, isStaff } from "@/lib/auth/access";
import { AccountNav } from "@/components/public/account-nav";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/prisma";
import { formatEventDate } from "@/lib/time/format";
import styles from "./home.module.css";

export default async function HomePage() {
  const user = await getCurrentUser();
  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED", endTime: { gte: new Date() } },
    orderBy: { startTime: "asc" },
    take: 50,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      location: true,
      startTime: true
    }
  });

  return (
    <>
      <AccountNav showAuthLinks={false} appearance="brand" />
      <main className={styles.home}>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.heroImage}>
            <Image
              src="/event-checkin-hero.webp"
              alt=""
              fill
              sizes="100vw"
              loading="eager"
              className={styles.photo}
            />
          </div>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <h1 id="home-title" className={styles.title}>QPass<span>.</span></h1>
              <p className={styles.subtitle}>
                Hệ thống đăng ký sự kiện<br />
                <span>và QR check-in</span>
              </p>
              <p className={styles.description}>
                Nền tảng hỗ trợ quản lý đăng ký và check-in sự kiện một cách
                nhanh chóng, đồng bộ và thuận tiện cho cả người tham gia và Ban tổ chức.
              </p>
              <div className={styles.actions}>
                <Button asChild size="lg" className={styles.primaryAction}>
                  <Link href={user ? accountHome(user.role) : "/login"}>
                    <UserRound className="h-5 w-5" aria-hidden="true" />
                    {user ? (isStaff(user.role) ? "Quản lý sự kiện" : "Khám phá sự kiện") : "Đăng nhập người tham gia"}
                  </Link>
                </Button>
                {!user && <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className={styles.secondaryAction}
                >
                  <Link href="/admin/login">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    Đăng nhập BTC
                  </Link>
                </Button>}
              </div>
            </div>
          </div>
        </section>

        <section id="upcoming-events" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-7 sm:px-8 md:py-10" aria-labelledby="events-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#a8461a]">Khám phá và tham gia</p>
              <h2 id="events-title" className="mt-1 text-2xl font-semibold sm:text-3xl">
                Sự kiện sắp tới
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {events.length} sự kiện đang hiển thị
            </p>
          </div>

          <div className="mt-6 divide-y divide-[#dce8e7] border-y border-[#dce8e7]">
            {events.length === 0 ? (
              <p className="py-12 text-muted-foreground">
                Chưa có sự kiện sắp tới.
              </p>
            ) : (
              events.map((event) => (
                <article
                  key={event.id}
                  className={`${styles.eventRow} grid gap-5 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center`}
                >
                  <div className="min-w-0">
                    <h3 className="break-words text-xl font-semibold">
                      <Link
                        href={`/events/${event.slug}`}
                        className="hover:text-[#00616b]"
                      >
                        {event.name}
                      </Link>
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {formatEventDate(event.startTime)}
                      </span>
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {event.location || "Sẽ cập nhật"}
                      </span>
                    </div>
                    {event.description ? (
                      <p className="mt-3 line-clamp-2 max-w-3xl break-words text-sm leading-6 text-muted-foreground">
                        {event.description}
                      </p>
                    ) : null}
                  </div>
                  <Button asChild variant="outline" className="w-full border-[#a3c5c8] text-[#00616b] hover:bg-[#edf6f5] md:w-auto">
                    <Link href={`/events/${event.slug}`}>
                      Xem sự kiện
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </>
  );
}
