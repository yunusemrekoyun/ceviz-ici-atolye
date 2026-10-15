import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Download } from "lucide-react";
import { can, requireAdmin } from "@/lib/auth/server";
import { ensurePeriodsToday, todayKey } from "@/lib/billing";
import { dayLabel, dayLabelAt, formatMoney } from "@/lib/billing-shared";
import { addDaysTo } from "@/lib/dates";
import { attendanceOverview, moneyOverview, peopleOverview, studentInsights } from "@/lib/insights";
import { attendanceCheckMessage, paymentReminderMessage, promiseReminderMessage } from "@/lib/whatsapp";
import { toRegistrationDto } from "@/lib/api";
import { listRegistrations } from "@/lib/registrations";
import { BarList, Figure, DateBars, moneyShort, PeopleList, StackBar, StatList } from "@/components/admin/charts";
import { Page, PageHeader, Panel, TextLink } from "@/components/admin/kit";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { dateRangeLabel, resolveDateRange, withDateRange, type DateRange } from "@/lib/date-range";
import { SectionTabs } from "@/components/admin/SectionTabs";
import { STUDENT_LISTS, studentListCounts } from "../ogrenciler/lists";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Raporlar" };

type Tab = "para" | "devam" | "ogrenci";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin("rapor.gor");
  const params = await searchParams;
  const today = todayKey();
  const range = resolveDateRange(params, today);
  const money = can(admin, "aidat.gor");
  const tabs: { key: Tab; label: string }[] = [...(money ? [{ key: "para" as const, label: "Para" }] : []), { key: "devam", label: "Devam" }, { key: "ogrenci", label: "Öğrenciler" }];
  const tab: Tab = tabs.some((t) => t.key === params.bolum) ? (params.bolum as Tab) : tabs[0]!.key;
  const href = (t: Tab) => withDateRange(`/admin/raporlar?bolum=${t}`, range);

  return (
    <Page>
      <PageHeader title="Raporlar" description="Kasaya giren, beklenen, devam ve öğrenci sayıları. Bir karta ya da satıra dokunun, listesi açılsın." />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionTabs label="Rapor bölümleri" active={href(tab)} items={tabs.map((t) => ({ href: href(t.key), label: t.label }))} />

      </div>

      <DateRangeFilter range={range} today={today} />

      {tab === "para" && money ? <MoneyTab range={range} today={today} /> : tab === "devam" ? <AttendanceTab range={range} /> : <PeopleTab range={range} today={today} billing={money} />}
    </Page>
  );
}

/* ---------------- Para ---------------- */

function MoneyTab({ range, today }: { range: DateRange; today: string }) {
  ensurePeriodsToday();
  const m = moneyOverview(range, today);
  const diff = m.collected - m.previousCollected;
  const compare = m.previousCollected > 0 ? (diff === 0 ? "Önceki aynı uzunluktaki aralıkla aynı" : `Önceki aynı uzunluktaki aralıktan ${formatMoney(Math.abs(diff))} ${diff > 0 ? "fazla" : "az"}`) : null;
  const methods = m.byMethod.map((x) => `${x.label} ${formatMoney(x.amount)}`).join(" · ");
  const paidShare = m.expected > 0 ? Math.round((m.expectedPaid / m.expected) * 100) : null;

  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Figure label="Seçili aralıkta kasaya giren aidat" value={formatMoney(m.collected)} sub={[methods || "Seçili aralıkta ödeme yok", compare].filter(Boolean).join(" · ")} href={withDateRange("/admin/kasa?tur=aidat", range)} />
        <Figure
          label="Şu an beklenen aidat"
          value={formatMoney(m.outstanding.amount)}
          tone={m.outstanding.amount > 0 ? "bad" : "good"}
          sub={m.outstanding.students ? `${m.outstanding.students} öğrenci${m.outstanding.promise ? ` · ${m.outstanding.promise} tanesi ödeme sözü verdi` : ""}` : "Aidatı gelmeyen öğrenci yok"}
          href="/admin/ogrenciler?liste=aidat"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Günlere göre alınan aidat" description={dateRangeLabel(range)}>
          <DateBars label="Seçili aralıkta günlük aidat" items={m.trend.map((t) => ({ key: t.day, label: dayLabel(t.day, false), value: t.amount, display: moneyShort(t.amount) }))} />
        </Panel>

        <Panel title="Gruplara göre aidat durumu" description="Şu an; gruba dokununca o grubun aidatı gelmeyenleri açılır.">
          {m.byGroup.length === 0 ? (
            <p className="text-[15px] text-muted">Kayıtlı öğrenci yok.</p>
          ) : (
            <ul className="grid gap-4">
              {m.byGroup.map((g) => (
                <li key={g.group}>
                  <Link href={`/admin/ogrenciler?liste=aidat${g.groupId ? `&grup=${g.groupId}` : ""}`} className="-mx-2 block rounded-xl px-2 py-1 transition hover:bg-surface">
                    <span className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-[15px] font-semibold text-ink">{g.group}</span>
                      <span className="text-sm text-muted">{g.total} öğrenci</span>
                    </span>
                    <StackBar
                      total={g.total}
                      segments={[
                        { key: "paid", label: "ödedi", value: g.paid, tone: "good" },
                        { key: "grace", label: "bekleniyor", value: g.grace, tone: "warn" },
                        { key: "promise", label: "söz verdi", value: g.promise, tone: "info" },
                        { key: "locked", label: "gecikti", value: g.locked, tone: "bad" },
                      ]}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Ödemesi yaklaşanlar" description="7 gün içinde sonraki ödeme günü geliyor. Önceden hatırlatmak için WhatsApp'a dokunun." actions={m.renewals.length ? <TextLink href="/admin/ogrenciler?liste=yenileme">Hepsi</TextLink> : null}>
        <PeopleList
          emptyText="7 gün içinde ödeme günü gelen öğrenci yok."
          people={m.renewals.map((p) => ({
            id: p.id,
            name: p.name,
            sub: `Ödeme günü ${p.day === today ? "bugün" : dayLabel(p.day!, false)}${p.group ? ` · ${p.group}` : ""}`,
            subTone: p.day && p.day <= addDaysTo(today, 2) ? "warn" : undefined,
            phone: p.phone,
            message: paymentReminderMessage(p.parentName, p.name, formatMoney(p.amount ?? 0), dayLabel(p.day!, false), false),
          }))}
        />
      </Panel>

      {m.promises.length ? (
        <Panel title="Ödeme sözü verenler" description="Söz verdiği gün geçenler önce." actions={<TextLink href="/admin/ogrenciler?liste=soz">Hepsi</TextLink>}>
          <PeopleList
            emptyText=""
            people={m.promises.map((p) => ({
              id: p.id,
              name: p.name,
              sub: p.missed ? `${dayLabelAt(p.day!)} ödeyecekti, gelmedi` : `${p.day === today ? "Bugün" : dayLabelAt(p.day!)} ödeyecek · ${formatMoney(p.amount ?? 0)}`,
              subTone: p.missed ? "bad" : "info",
              phone: p.phone,
              message: promiseReminderMessage(p.parentName, p.name, formatMoney(p.amount ?? 0), dayLabelAt(p.day!)),
            }))}
          />
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Seçili aralıkta başlayan aidat paketleri" description="8 antrenmanlık paketlerin başlangıç tarihine göre ödenen ve beklenen tutar.">
          {m.expected > 0 ? (
            <BarList
              items={[
                { key: "paid", label: "Ödendi", value: m.expectedPaid, max: m.expected, display: formatMoney(m.expectedPaid), tone: "good" },
                { key: "open", label: "Ödenmedi", value: m.expected - m.expectedPaid, max: m.expected, display: formatMoney(m.expected - m.expectedPaid), tone: m.expected - m.expectedPaid > 0 ? "bad" : "neutral" },
              ]}
            />
          ) : (
            <p className="text-[15px] text-muted">Seçili aralıkta başlayan aidat paketi yok.</p>
          )}
          {paidShare !== null ? <p className="mt-2 text-sm text-muted">Ödenen oran: %{paidShare} · beklenen toplam {formatMoney(m.expected)}</p> : null}
        </Panel>

        <Panel title="Forma ve eşofman" actions={<TextLink href="/admin/malzeme">Forma</TextLink>}>
          <StatList
            items={[
              { key: "in", label: "Seçili aralıkta alınan", value: formatMoney(m.kit.collectedInRange), tone: "good" },
              { key: "unpaid", label: `Alınacak para${m.kit.unpaidCount ? ` (${m.kit.unpaidCount} kayıt)` : ""}`, value: formatMoney(m.kit.unpaidAmount), tone: m.kit.unpaidCount ? "warn" : "neutral", href: "/admin/malzeme?durum=odemedi" },
              { key: "order", label: "Sipariş verilecek", value: `${m.kit.toOrder} adet`, tone: m.kit.toOrder ? "warn" : "neutral", href: "/admin/malzeme?sekme=bedenler" },
              { key: "missing", label: "Forması girilmemiş", value: `${m.kit.formaMissing} öğrenci`, tone: m.kit.formaMissing ? "bad" : "neutral", href: "/admin/malzeme?durum=formasiz" },
            ]}
          />
        </Panel>
      </div>

      <Downloads items={[{ href: withDateRange("/api/admin/rapor?tur=tahsilat", range), label: `${dateRangeLabel(range)} kasa defteri (Excel)` }]} />
    </div>
  );
}

/* ---------------- Devam ---------------- */

function AttendanceTab({ range }: { range: DateRange }) {
  const a = attendanceOverview(range);
  const tone = (rate: number | null) => (rate === null ? "neutral" : rate >= 80 ? "good" : rate >= 60 ? "warn" : "bad");
  if (a.present + a.absent === 0)
    return (
      <div className="grid grid-cols-1 gap-5">
        <Panel>
          <p className="text-[15px] text-ink">Seçili aralıkta yoklama alınmadı.</p>
          <p className="mt-1 text-sm text-muted">Antrenmanlarda yoklama alındıkça burada gruplara göre devam ve az gelen öğrenciler görünür.</p>
          <div className="mt-3">
            <TextLink href="/admin/yoklama">Yoklamaya git</TextLink>
          </div>
        </Panel>
      </div>
    );
  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Figure label="Seçili aralıkta ortalama devam" value={a.rate !== null ? `%${a.rate}` : "—"} tone={tone(a.rate)} sub={`${a.present} geldi · ${a.absent} gelmedi`} />
        <Figure label="Az gelen öğrenci" value={a.low.length} tone={a.low.length ? "bad" : "good"} sub="Devamı %60'ın altında (en az 3 yoklama)" href={withDateRange("/admin/ogrenciler?liste=az-gelen", range)} />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Gruplara göre devam">
          <BarList
            items={a.groups.map((g) => ({
              key: g.group,
              label: g.group,
              value: g.rate ?? 0,
              max: 100,
              display: g.rate !== null ? `%${g.rate}` : "—",
              sub: `${g.sessions} antrenman · ${g.present} geldi · ${g.absent} gelmedi`,
              tone: tone(g.rate),
            }))}
          />
        </Panel>
        <Panel title="Az gelenler" description="Veliye nazikçe sorun; WhatsApp'ta hazır mesaj açılır.">
          <PeopleList
            emptyText="Devamı düşük öğrenci yok."
            people={a.low.map((p) => ({
              id: p.id,
              name: p.name,
              sub: `%${p.rate} devam · ${p.present}/${p.total} antrenman${p.group ? ` · ${p.group}` : ""}`,
              subTone: "bad",
              phone: p.phone,
              message: attendanceCheckMessage(p.parentName, p.name),
            }))}
          />
        </Panel>
      </div>
      <Downloads items={[{ href: withDateRange("/api/admin/rapor?tur=devam", range), label: `${dateRangeLabel(range)} devam (Excel)` }]} />
    </div>
  );
}

/* ---------------- Öğrenciler ---------------- */

function PeopleTab({ range, today, billing }: { range: DateRange; today: string; billing: boolean }) {
  const p = peopleOverview(range);
  const enrolled = listRegistrations()
    .filter((r) => r.status === "enrolled")
    .map((r) => toRegistrationDto(r));
  const counts = studentListCounts(
    enrolled,
    studentInsights(
      enrolled.map((r) => r.id),
      today,
      { billing },
      range,
    ),
    today,
  );
  const apps = p.applications;
  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Figure label="Şu an kayıtlı öğrenci" value={p.enrolled} href="/admin/ogrenciler" />
        <Figure label="Seçili aralıkta okula kayıt" value={p.newInRange} tone={p.newInRange ? "good" : "neutral"} />
        <Figure label="Seçili aralıkta ayrılan" value={p.leftInRange} tone={p.leftInRange ? "bad" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Hazır listeler" description="Dokununca öğrenci listesi o süzgeçle açılır.">
          <ul className="-mx-4 divide-y divide-line border-t border-line sm:-mx-5">
            {STUDENT_LISTS.filter((l) => l.key !== "hepsi" && (billing || !l.billing)).map((l) => (
              <li key={l.key}>
                <Link href={withDateRange(`/admin/ogrenciler?liste=${l.key}`, range)} className="flex min-h-14 items-center gap-3 px-4 py-2 transition hover:bg-surface/70 sm:px-5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-ink">{l.label}</span>
                    <span className="block text-sm text-muted">{l.hint}</span>
                  </span>
                  <span className={["min-w-9 rounded-lg px-2 py-1 text-center text-[15px] font-bold tabular-nums", counts[l.key] ? (l.tone === "bad" ? "bg-red-50 text-red-700" : l.tone === "warn" ? "bg-amber-50 text-amber-800" : "bg-stone-100 text-ink") : "bg-stone-100 text-muted"].join(" ")}>{counts[l.key] ?? 0}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="grid grid-cols-1 content-start gap-5">
          <Panel title="Şu an gruplara göre öğrenci">
            <BarList items={p.byGroup.map((g) => ({ key: String(g.groupId ?? "none"), label: g.group, value: g.count, display: `${g.count}`, href: g.groupId ? `/admin/ogrenciler?grup=${g.groupId}` : "/admin/ogrenciler", tone: "neutral" }))} emptyText="Grup yok." />
          </Panel>
          <Panel title="Seçili aralıkta gelen başvurular" description={apps.total ? `${apps.total} başvurudan ${apps.enrolled} tanesi okula kaydoldu.` : "Seçili aralıkta başvuru gelmedi."}>
            {apps.total ? (
              <BarList
                items={[
                  { key: "enrolled", label: "Okula kaydoldu", value: apps.enrolled, max: apps.total, display: `${apps.enrolled}`, tone: "good" },
                  { key: "scheduled", label: "Randevusu var", value: apps.scheduled, max: apps.total, display: `${apps.scheduled}`, tone: "info", href: `/admin/randevular?kayitFrom=${range.from}&kayitTo=${range.to}` },
                  { key: "waiting", label: "Aranacak / randevu bekliyor", value: apps.waiting, max: apps.total, display: `${apps.waiting}`, tone: "warn", href: `/admin/on-kayitlar?kayitFrom=${range.from}&kayitTo=${range.to}` },
                  { key: "dropped", label: "Vazgeçti", value: apps.dropped, max: apps.total, display: `${apps.dropped}`, tone: "neutral" },
                ]}
              />
            ) : null}
          </Panel>
        </div>
      </div>

      <Downloads items={[{ href: withDateRange("/api/admin/export/xlsx?status=enrolled&dateField=none", range), label: "Kayıtlı öğrenci listesi (Excel)" }, { href: withDateRange("/api/admin/export/xlsx?status=enrolled,left&dateField=enrolled", range), label: "Seçili aralıkta okula kaydolanlar (Excel)" }]} />
    </div>
  );
}

function Downloads({ items }: { items: { href: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((d) => (
        <a key={d.href} href={d.href} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-control bg-white px-4 text-[15px] font-semibold text-ink shadow-xs transition hover:bg-gray-50 active:scale-[0.98]">
          <Download className="h-4 w-4 text-muted" aria-hidden="true" /> {d.label}
        </a>
      ))}
    </div>
  );
}
