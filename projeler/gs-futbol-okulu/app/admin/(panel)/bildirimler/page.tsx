import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/server";
import { formatDateTimeTr } from "@/lib/format";
import { listNotifications, markRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bildirimler" };

export default async function NotificationsPage() {
  const admin = await requireAdmin();
  const items = listNotifications(admin, 100);
  // Sayfa açıldığında görülenler okundu sayılır; bu görünümde yeni olanlar vurgulu kalır.
  markRead(admin);
  return (
    <main className="panel-rise mx-auto w-full max-w-3xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">Bildirimler</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">Son 60 gün.</p>
      {items.length === 0 ? (
        <p className="mt-10 text-center text-muted">Bildirim yok.</p>
      ) : (
        <ul className="mt-5 grid gap-2">
          {items.map((n) => {
            const body = (
              <>
                <p className="flex items-center gap-2 font-semibold text-ink">
                  {!n.read ? <span className="h-2 w-2 shrink-0 rounded-full bg-gs-red" aria-label="Yeni" /> : null}
                  {n.title}
                </p>
                {n.body ? <p className="mt-0.5 text-sm text-ink">{n.body}</p> : null}
                <p className="mt-1 text-xs text-muted">{formatDateTimeTr(n.createdAt)}</p>
              </>
            );
            const cls = ["block rounded-2xl border bg-white p-4 shadow-sm transition", n.read ? "border-line" : "border-gs-red/40 bg-gs-red-soft/30", n.link ? "hover:shadow-md" : ""].join(" ");
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link href={n.link} className={cls}>
                    {body}
                  </Link>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
