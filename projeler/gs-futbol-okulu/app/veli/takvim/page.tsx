import type { Metadata } from "next";
import { headers } from "next/headers";
import { listAgeGroups } from "@/lib/age-groups-db";
import { redirect } from "next/navigation";
import { accessMap, todayKey } from "@/lib/billing";
import { dayLabel } from "@/lib/billing-shared";
import { calendarKey } from "@/lib/calendar-feed";
import { loadGuardian, SIMPLE_PANEL } from "@/lib/guardian-view";
import { directionLinks } from "@/lib/maps";
import { ensureSessionsWindow, schedulesForGroups, upcomingForGroups, WEEKDAYS, WEEKDAYS_SHORT, weekdayOf } from "@/lib/program";
import { getSiteUrl } from "@/lib/site-url";
import { NoChildren } from "@/components/guardian/ChildTabs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Program" };

export default async function GuardianCalendar() {
  // Sade panel (VEL-17): bu sayfa şimdilik kapalı
  if (SIMPLE_PANEL) redirect("/veli");
  const all = (await loadGuardian(undefined)).children;
  if (all.length === 0) return <NoChildren />;
  const access = accessMap(all);
  const children = all.filter((c) => access.get(c.id)?.allowed);
  if (children.length === 0) redirect("/veli");
  ensureSessionsWindow();
  const today = todayKey();
  const groupIds = [...new Set(children.map((c) => c.groupId).filter((g): g is number => g !== null))];
  const groups = listAgeGroups().filter((g) => groupIds.includes(g.id));
  const base = getSiteUrl(await headers());
  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-black text-ink">Antrenman programı</h1>
      {groups.map((g) => {
        const names = children
          .filter((c) => c.groupId === g.id)
          .map((c) => c.studentFullName.split(" ")[0])
          .join(", ");
        const weekly = schedulesForGroups([g.id]);
        const sessions = upcomingForGroups([g.id], 21);
        const feed = `${base}/api/takvim/${calendarKey(g.id)}.ics`;
        const venues = [...new Map(weekly.filter((w) => w.venue).map((w) => [w.venue!.id, w.venue!])).values()];
        return (
          <section key={g.id} className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-ink">
              {g.name} <span className="text-base font-semibold text-muted">· {names}</span>
            </h2>
            <ul className="mt-3 grid gap-1.5">
              {weekly.map((w) => (
                <li key={w.id} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-2xl bg-surface px-4 py-3">
                  <span className="text-lg font-bold text-ink">{WEEKDAYS[w.weekday - 1]}</span>
                  <span className="text-lg tabular-nums text-ink">
                    {w.startTime}–{w.endTime}
                  </span>
                  {w.venue ? <span className="w-full text-[15px] text-muted">{w.venue.name}</span> : null}
                </li>
              ))}
              {weekly.length === 0 ? <li className="text-lg text-muted">Antrenman günleri henüz belirlenmedi.</li> : null}
            </ul>
            {venues.map((v) => (
              <div key={v.id} className="mt-4 rounded-2xl bg-surface p-3">
                <p className="font-bold text-ink">{v.name}</p>
                {v.address ? <p className="text-muted">{v.address}</p> : null}
                {v.note ? <p className="text-ink">{v.note}</p> : null}
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {directionLinks(v).map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-line bg-white px-1 text-center text-sm font-semibold text-ink"
                    >
                      {l.label.replace(" Haritalar", "")}
                    </a>
                  ))}
                </div>
              </div>
            ))}
            <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-muted">Önümüzdeki 3 hafta</h3>
            <ul className="mt-2 grid gap-1.5">
              {sessions.map((s) => (
                <li key={s.id} className={["flex flex-wrap items-center gap-x-3 rounded-xl px-3 py-2", s.status === "cancelled" ? "bg-red-50" : s.date === today ? "bg-gs-yellow-soft" : "bg-surface"].join(" ")}>
                  <span className="w-28 font-semibold">
                    {s.date === today ? "Bugün" : dayLabel(s.date, false)} <span className="text-sm font-normal">{WEEKDAYS_SHORT[weekdayOf(s.date) - 1]}</span>
                  </span>
                  <span className={["flex-1 tabular-nums", s.status === "cancelled" ? "text-muted line-through" : ""].join(" ")}>
                    {s.startTime}–{s.endTime}
                  </span>
                  {s.status === "cancelled" ? (
                    <span className="rounded-lg bg-red-100 px-2 py-0.5 text-sm font-bold text-red-800">İptal</span>
                  ) : s.moved ? (
                    <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-sm font-bold text-amber-900">Değişti</span>
                  ) : null}
                  {s.status === "cancelled" && s.cancelReason ? <span className="w-full text-sm text-red-900">{s.cancelReason}</span> : null}
                </li>
              ))}
            </ul>
            <a href={feed.replace(/^https?:/, "webcal:")} className="mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-ink px-4 text-center text-lg font-bold text-white">
              Telefon takvimine ekle
            </a>
            <p className="mt-2 text-sm text-muted">
              Eklerseniz iptal ve değişiklikler telefonunuzda kendiliğinden güncellenir. Olmazsa{" "}
              <a href={feed} className="font-semibold text-gs-red underline">
                takvim dosyasını indirin
              </a>
              .
            </p>
          </section>
        );
      })}
      {groups.length === 0 ? <p className="rounded-2xl bg-white p-4 text-muted">Öğrencinize henüz grup atanmadı.</p> : null}
    </div>
  );
}
