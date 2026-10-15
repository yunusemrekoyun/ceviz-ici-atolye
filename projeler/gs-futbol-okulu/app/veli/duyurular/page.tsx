import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { listAnnouncements } from "@/lib/announcements";
import { formatDateTimeTr } from "@/lib/format";
import { loadGuardian, SIMPLE_PANEL } from "@/lib/guardian-view";
import { listNotifications, markRead } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Duyurular" };

export default async function GuardianNews() {
  // Sade panel (VEL-17): bu sayfa şimdilik kapalı
  if (SIMPLE_PANEL) redirect("/veli");
  const { user, children } = await loadGuardian(undefined);
  const groupIds = [...new Set(children.map((c) => c.groupId).filter((g): g is number => g !== null))];
  const news = listAnnouncements({ groupIds, limit: 30 });
  const personal = listNotifications(user, 30).filter((n) => n.kind !== "duyuru");
  markRead(user);
  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-black text-ink">Duyurular</h1>
      {personal.length ? (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Size özel</h2>
          <ul className="grid gap-2">
            {personal.map((n) => (
              <li key={n.id} className={["rounded-3xl p-4 shadow-sm", n.read ? "bg-white" : "border-2 border-gs-red/40 bg-gs-red-soft/40"].join(" ")}>
                <p className="text-lg font-bold text-ink">{n.title}</p>
                {n.body ? <p className="text-ink">{n.body}</p> : null}
                <p className="mt-1 text-sm text-muted">{formatDateTimeTr(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Okuldan</h2>
        {news.length === 0 ? <p className="rounded-2xl bg-white p-4 text-muted">Duyuru yok.</p> : null}
        <ul className="grid gap-3">
          {news.map((a) => (
            <li key={a.id} className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="text-lg font-bold text-ink">{a.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-[17px] text-ink">{a.body}</p>
              <p className="mt-2 text-sm text-muted">{formatDateTimeTr(a.createdAt)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
