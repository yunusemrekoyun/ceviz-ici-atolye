import Link from "next/link";
import type { ReactNode } from "react";
import { dayLabel, formatMoney } from "@/lib/billing-shared";
import type { ChildSummary } from "@/lib/guardian-summary";
import { directionLinks } from "@/lib/maps";
import { WEEKDAYS, WEEKDAYS_SHORT, weekdayOf } from "@/lib/program";
import { CantCome } from "./CantCome";

/**
 * Veli ana sayfası ve profilinin kartları (sunucu bileşenleri). Kural: her kart tek bir soruya cevap verir,
 * büyük yazı, tek ana düğme. Renk hep kelimeyle birlikte (yalnız renge güvenilmez).
 */

const card = "rounded-3xl bg-white p-5 shadow-sm";
const kicker = "text-sm font-bold uppercase tracking-wide text-muted";

export function Card({ title, action, children, className, id }: { title?: string; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={[card, "scroll-mt-24", className ?? ""].join(" ")}>
      {title ? (
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className={kicker}>{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center font-semibold text-gs-red">
      {children} <span aria-hidden="true">&nbsp;→</span>
    </Link>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase("tr-TR"))
    .join("");

export function ChildHeader({ s, photo }: { s: ChildSummary; photo: boolean }) {
  const c = s.child;
  return (
    <div className="flex items-center gap-4">
      {photo && c.photoFileId ? (
        // eslint-disable-next-line @next/next/no-img-element -- yetki kontrollü dosya adresi
        <img src={`/api/dosya/${c.photoFileId}`} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
      ) : (
        <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gs-red text-xl font-black text-white">
          {initials(c.studentFullName)}
        </span>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-black text-ink">{c.studentFullName}</h1>
        <p className="text-[15px] text-muted">
          {[s.group ? `${s.group.name} · ${s.group.ages} yaş` : "Grubu henüz belli değil", c.studentNo ? `No ${c.studentNo}` : null].filter(Boolean).join(" · ")}
          {c.isGoalkeeper ? <span className="ml-2 rounded-md bg-stone-100 px-1.5 py-0.5 text-xs font-bold text-stone-700">Kaleci</span> : null}
        </p>
      </div>
    </div>
  );
}

export function whenText(date: string, today: string): string {
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const t = tomorrow.toISOString().slice(0, 10);
  if (date === today) return "Bugün";
  if (date === t) return "Yarın";
  return `${dayLabel(date, false)} ${WEEKDAYS[weekdayOf(date) - 1]}`;
}

/** Ödeme cümleleri için: "bugün" / "yarın" / "17 Ekim". */
const dayWord = (date: string, today: string) => {
  const w = whenText(date, today);
  return w === "Bugün" || w === "Yarın" ? w.toLocaleLowerCase("tr-TR") : dayLabel(date, false);
};

export function NextTraining({ s, today }: { s: ChildSummary; today: string }) {
  const n = s.next;
  return (
    <Card title="Sıradaki antrenman" action={<MoreLink href={`/veli/takvim?ogrenci=${s.child.id}`}>Program</MoreLink>}>
      {n ? (
        <>
          <p className="text-3xl font-black leading-tight text-ink">
            {whenText(n.date, today)} · {n.startTime}
          </p>
          <p className="mt-1 text-lg text-ink">
            {n.venueName ?? "Saha bilgisi yok"}{" "}
            <span className="text-muted">
              ({n.startTime}–{n.endTime})
            </span>
          </p>
          {n.venue?.note ? <p className="text-muted">{n.venue.note}</p> : null}
          {n.venue ? (
            <a
              href={directionLinks(n.venue)[0]!.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-line text-[17px] font-bold text-ink active:scale-[0.99]"
            >
              Yol tarifi al
            </a>
          ) : null}
          {s.access.allowed ? <CantCome registrationId={s.child.id} sessionId={n.id} firstName={s.firstName} excused={s.nextExcused} /> : null}
        </>
      ) : (
        <p className="text-lg text-muted">Önümüzdeki günlerde planlı antrenman yok.</p>
      )}
      {s.cancelledSoon.map((c) => (
        <p key={c.id} className="mt-3 rounded-2xl bg-stone-100 p-3 text-[15px] text-ink">
          <span className="font-bold">İptal:</span> {whenText(c.date, today)} {c.startTime}
          {c.cancelReason ? ` · ${c.cancelReason}` : ""}
        </p>
      ))}
    </Card>
  );
}

/** Aidat: ödeme dilinde tek cümle, gerekiyorsa tek düğme ("Ödeme yaptım"). */
export function FeeCard({ s, today }: { s: ChildSummary; today: string }) {
  const a = s.access;
  const payHref = `/veli/odeme?ogrenci=${s.child.id}`;
  const payButton = s.claimPending ? (
    <p className="mt-3 rounded-2xl bg-sky-50 p-3 text-[15px] font-semibold text-sky-900">Ödeme bildiriminiz alındı; okul onaylayınca haber vereceğiz.</p>
  ) : (
    <Link href={payHref} className="mt-3 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-gs-red text-lg font-bold text-white active:scale-[0.99]">
      Ödeme yaptım
    </Link>
  );
  const box = (tone: string, title: string, lines: ReactNode, action?: ReactNode) => (
    <section id="aidat" className={`scroll-mt-24 rounded-3xl border-2 p-5 ${tone}`}>
      <p className="text-sm font-bold uppercase tracking-wide opacity-80">Aidat</p>
      <p className="mt-1 text-xl font-black">{title}</p>
      <div className="mt-1 text-[16px]">{lines}</div>
      {action}
    </section>
  );
  switch (s.pay) {
    case "paid":
      return box(
        "border-emerald-200 bg-emerald-50 text-emerald-950",
        "Ödendi",
        <>
          Sonraki ödeme günü <span className="font-bold">{a.paidUntil ? dayWord(a.paidUntil, today) : "—"}</span>
          {a.sessionsLeft !== undefined && a.sessionsLeft !== null ? ` · ${a.sessionsLeft} antrenman kaldı` : ""}
        </>,
      );
    case "soon":
      return box(
        "border-gs-yellow/70 bg-gs-yellow-soft text-ink",
        `Ödeme günü yaklaşıyor: ${a.paidUntil ? dayWord(a.paidUntil, today) : ""}`,
        <>
          {a.sessionsLeft !== undefined && a.sessionsLeft !== null ? `${a.sessionsLeft} antrenman kaldı · ` : ""}
          yeni aidat <span className="font-bold">{formatMoney(s.fee)}</span> (8 antrenman)
        </>,
        payButton,
      );
    case "first":
      return box(
        "border-amber-300 bg-amber-50 text-amber-950",
        `İlk aidat: ${formatMoney(a.amountDueKurus || s.fee)}`,
        <>Ödeme gelince 8 antrenman hakkı başlar.{a.dueDate ? ` İlk antrenman: ${whenText(a.dueDate, today).toLocaleLowerCase("tr-TR")}.` : ""}</>,
        payButton,
      );
    case "due":
      return box(
        "border-amber-300 bg-amber-50 text-amber-950",
        `Ödeme günü geldi: ${formatMoney(a.amountDueKurus)}`,
        <>
          8 antrenman tamamlandı. Son gün <span className="font-bold">{dayWord(a.lastDay ?? today, today)}</span>; sonrasında antrenmana katılamaz.
        </>,
        payButton,
      );
    case "promise":
      return box("border-sky-200 bg-sky-50 text-sky-950", `Ödeme gününüz: ${a.override ? dayWord(a.override.endsOn, today) : ""}`, <>{formatMoney(a.amountDueKurus)} · bu güne kadar antrenmanlara devam edebilir.</>, payButton);
    default:
      return null;
  }
}

const DOT: Record<string, { text: string; cls: string; label: string }> = {
  present: { text: "✓", cls: "bg-emerald-600 text-white", label: "geldi" },
  absent: { text: "✕", cls: "bg-red-100 text-red-700", label: "gelmedi" },
  excused: { text: "İ", cls: "bg-stone-200 text-stone-700", label: "izinli" },
};

export function RecentAttendance({ s }: { s: ChildSummary }) {
  const came = s.recent.filter((r) => r.status === "present").length;
  if (s.recent.length === 0) return null;
  return (
    <Card title="Son antrenmanlar" action={<MoreLink href={`/veli/devam?ogrenci=${s.child.id}`}>Ayrıntı</MoreLink>}>
      <p className="text-lg text-ink">
        Son {s.recent.length} antrenmanın <span className="text-2xl font-black">{came}</span> tanesine geldi
        {s.attendance.rate !== null ? <span className="text-muted"> · devam %{s.attendance.rate}</span> : null}
      </p>
      <ol className="mt-3 grid grid-cols-8 gap-1.5" aria-label="Son antrenmanlar, eskiden yeniye">
        {s.recent.map((r) => {
          const d = DOT[r.status] ?? DOT.absent!;
          return (
            <li key={r.date} className="text-center">
              <span className={`mx-auto flex aspect-square w-full max-w-10 items-center justify-center rounded-full text-sm font-black ${d.cls}`} aria-label={`${dayLabel(r.date, false)}: ${d.label}`}>
                {d.text}
              </span>
              <span className="mt-1 block text-[11px] tabular-nums text-muted">
                {r.date.slice(8, 10)}.{r.date.slice(5, 7)}
              </span>
              <span className="block text-[10px] text-muted">{WEEKDAYS_SHORT[weekdayOf(r.date) - 1]}</span>
            </li>
          );
        })}
      </ol>
      {s.attendance.streak >= 3 ? <p className="mt-3 rounded-2xl bg-gs-yellow-soft p-3 text-[15px] font-semibold text-ink">Üst üste {s.attendance.streak} antrenmana geldi, harika gidiyor!</p> : null}
    </Card>
  );
}

export function DevelopmentTeaser({ s }: { s: ChildSummary }) {
  const e = s.evaluation;
  return (
    <Link href={`/veli/gelisim?ogrenci=${s.child.id}`} className="block rounded-3xl bg-gs-yellow-soft p-5 active:scale-[0.99]">
      <p className="text-sm font-bold uppercase tracking-wide text-ink/70">Gelişim</p>
      {e ? (
        <>
          <p className="mt-1 text-xl font-black text-ink">Antrenör puanı {String(e.average).replace(".", ",")} / 5</p>
          {e.comment ? <p className="mt-1 line-clamp-2 text-[16px] italic text-ink">“{e.comment}”</p> : null}
          <p className="mt-2 font-semibold text-gs-red">Tüm gelişimi gör →</p>
        </>
      ) : (
        <p className="mt-1 flex items-center justify-between text-lg font-bold text-ink">
          {s.firstName} nasıl gelişiyor? <span aria-hidden="true">→</span>
        </p>
      )}
    </Link>
  );
}

export function NewsCard({ s }: { s: ChildSummary }) {
  if (!s.news) return null;
  return (
    <Card title="Son duyuru" action={<MoreLink href="/veli/duyurular">Tümü</MoreLink>}>
      <p className="text-lg font-bold text-ink">{s.news.title}</p>
      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[16px] text-ink">{s.news.body}</p>
    </Card>
  );
}
