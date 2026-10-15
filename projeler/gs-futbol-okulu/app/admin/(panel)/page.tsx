import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarRange, ChevronRight, CircleCheck, ClipboardCheck, Shirt, UserPlus, Wallet } from "lucide-react";
import { effectiveGroup, formatYearRange } from "@/lib/age-groups";
import { can, requireAdmin } from "@/lib/auth/server";
import { billingCounts, ensurePeriodsToday } from "@/lib/billing";
import { formatDateTimeTr, formatDayLongTr, formatTimeTr, istanbulDayKey } from "@/lib/format";
import { countNewCallbackRequests } from "@/lib/callbacks";
import { loadPanelData } from "@/lib/panel-data";
import { issuesOf } from "@/lib/data-issues";
import { formatMoney } from "@/lib/billing-shared";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { dateRangeLabel, inDateRange, resolveDateRange, withDateRange } from "@/lib/date-range";
import { moneyOverview } from "@/lib/insights";
import { addDaysTo } from "@/lib/dates";
import { listOrders } from "@/lib/equipment";
import { isFormaItem, sizeMissing, socksOpen } from "@/lib/equipment-shared";
import { ensureSessionsWindow, listSessions, type SessionView } from "@/lib/program";
import { sessionCounts } from "@/lib/attendance";
import { groupScope } from "@/lib/scan";
import { Avatar, Badge, Page, PageHeader, Panel, TextLink } from "@/components/admin/kit";
import { NotePreview } from "@/components/admin/Notes";
import { StatusBadge } from "./StatusBadge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bugün" };

const UPCOMING_DAYS = 7;

type Task = { count: number; href: string; title: string; text: string; urgency: "high" | "mid" | "info" };

function greeting(now: Date): string {
  const h = Number(new Intl.DateTimeFormat("tr-TR", { hour: "numeric", hour12: false, timeZone: "Europe/Istanbul" }).format(now));
  return h < 11 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  const now = new Date();
  const aidat = can(admin, "aidat.gor") ? (ensurePeriodsToday(), billingCounts()) : { claims: 0, locked: 0, grace: 0, override: 0, promiseToday: 0, promiseMissed: 0 };
  const seesRegs = can(admin, "kayit.gor");
  // Hassas alanlar yalnız sayım için okunur, sayfaya yazılmaz.
  const { registrations, groups } = loadPanelData(now, can(admin, "hassas.gor"));
  const nowIso = now.toISOString();
  const today = istanbulDayKey(now);
  const horizon = new Date(now.getTime() + UPCOMING_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const count = (status: string) => registrations.filter((r) => r.status === status).length;
  const scheduled = registrations.filter((r) => r.status === "scheduled" && r.appointmentAt);
  const overdue = scheduled.filter((r) => r.appointmentAt! < nowIso && istanbulDayKey(r.appointmentAt!) !== today);
  const todays = scheduled.filter((r) => istanbulDayKey(r.appointmentAt!) === today);
  const upcoming = scheduled
    .filter((r) => r.appointmentAt! >= nowIso || istanbulDayKey(r.appointmentAt!) === today)
    .filter((r) => r.appointmentAt! <= horizon)
    .sort((a, b) => a.appointmentAt!.localeCompare(b.appointmentAt!))
    .slice(0, 8);
  const recent = registrations.slice(0, 6);
  const newCallbacks = seesRegs ? countNewCallbackRequests() : 0;
  const incomplete = registrations.filter((r) => r.missing.length > 0 && r.status !== "cancelled" && r.status !== "left").length;
  const needsReview = registrations.filter((r) => r.submission || (r.duplicates?.length ?? 0) > 0).length;
  // Bozuk bilgi: geçersiz T.C./telefon, şüpheli doğum tarihi, grubu olmayan öğrenci.
  const broken = registrations.filter((r) => issuesOf(r).some((i) => i.severity === "error")).length;

  // Forma/eşofman işleri (forma her öğrencide zorunlu)
  const seesKit = can(admin, "aidat.gor");
  const enrolledRegs = registrations.filter((r) => r.status === "enrolled");
  const orders = seesKit ? listOrders().filter((o) => o.studentStatus === "enrolled") : [];
  const kitToOrder = orders.filter((o) => o.delivery === "to_order").length + orders.filter((o) => o.sockDelivery === "to_order").length;
  const kitUnpaid = orders.filter((o) => !o.paid).length;
  const formaMissing = seesKit ? enrolledRegs.filter((r) => !orders.some((o) => o.registrationId === r.id && isFormaItem(o.itemName))).length : 0;
  const kitSizeMissing = new Set(orders.filter(sizeMissing).map((o) => o.registrationId)).size;
  const socksToHand = new Set(orders.filter(socksOpen).map((o) => o.registrationId)).size;

  // Antrenman: bugün varsa bugünkü, yoksa sıradaki antrenman günü
  const canAttend = can(admin, "yoklama.al");
  const seesTraining = canAttend || can(admin, "program.yonet");
  let trainingDay: string | null = null;
  let daySessions: SessionView[] = [];
  let dayCounts = new Map<number, { present: number; absent: number; excused: number }>();
  if (seesTraining) {
    ensureSessionsWindow();
    const upcomingSessions = listSessions({ from: today, to: addDaysTo(today, 13), groupIds: groupScope(admin), includeCancelled: true });
    trainingDay = upcomingSessions.find((x) => x.status === "scheduled")?.date ?? null;
    daySessions = trainingDay ? upcomingSessions.filter((x) => x.date === trainingDay) : [];
    dayCounts = sessionCounts(daySessions.map((x) => x.id));
  }
  const groupSize = (groupId: number | null) => enrolledRegs.filter((r) => r.groupId === groupId).length;

  type QuickAction = { href: string; label: string; icon: ReactNode; tint: string };
  const quickCandidates: (QuickAction | null)[] = [
    can(admin, "aidat.al") ? { href: "/admin/aidat?ara=1", label: "Aidat al", icon: <Wallet />, tint: "bg-emerald-50 text-emerald-700" } : null,
    can(admin, "kayit.duzenle") ? { href: "/admin/kayit/yeni", label: "Yeni kayıt", icon: <UserPlus />, tint: "bg-gs-red-soft text-gs-red" } : null,
    canAttend ? { href: "/admin/yoklama", label: "Yoklama", icon: <ClipboardCheck />, tint: "bg-sky-50 text-sky-800" } : null,
    seesKit ? { href: "/admin/malzeme", label: "Forma", icon: <Shirt />, tint: "bg-amber-50 text-amber-800" } : null,
  ];
  const quickActions = quickCandidates.filter((a): a is QuickAction => a !== null);

  const enrolled = count("enrolled");
  const range = resolveDateRange(await searchParams, today);
  const newInRange = registrations.filter((r) => r.enrolledAt && inDateRange(istanbulDayKey(r.enrolledAt), range)).length;
  const money = can(admin, "aidat.gor") ? moneyOverview(range, today) : null;
  const seesReports = can(admin, "rapor.gor");

  const tasks = ([
    { count: aidat.claims, href: "/admin/aidat?sekme=onay", title: "Veli ödeme yaptığını bildirdi", text: "Dekontu görüp onaylayınca antrenman hakkı verilir.", urgency: "high" },
    { count: overdue.length, href: "/admin/randevular", title: "Sonucu girilmemiş randevular", text: "Veli geldi mi? Kaydı tamamlayın ya da “Gelmedi” deyin.", urgency: "high" },
    { count: aidat.promiseMissed, href: "/admin/aidat?durum=soz", title: "Ödeme sözü tutulmayanlar", text: "Söz verdiği gün geçti, aidat gelmedi; veliyi arayın.", urgency: "high" },
    { count: aidat.locked, href: "/admin/aidat?durum=gecikti", title: "Aidatı gecikenler", text: "Ödeme günü ve ek süre geçti, antrenmana katılamıyor; hatırlatın ya da ödeme sözü alın.", urgency: "high" },
    { count: newCallbacks, href: "/admin/arama-talepleri", title: "Aranmayı bekleyenler", text: "Sitede “beni arayın” diyen veliler.", urgency: "high" },
    { count: todays.length, href: "/admin/randevular?gun=bugun", title: "Bugün gelecekler", text: "Bugünkü kayıt randevuları.", urgency: "info" },
    { count: count("pending"), href: "/admin/on-kayitlar?durum=pending", title: "Randevu verilecekler", text: "Veliyi arayıp gün ve saat belirleyin.", urgency: "mid" },
    { count: aidat.promiseToday, href: "/admin/aidat?durum=soz", title: "Bugün ödeyecekler", text: "Ödeme sözü bugün; aidat gelince kaydedin.", urgency: "mid" },
    { count: aidat.grace, href: "/admin/aidat?durum=odemeyen", title: "Aidat bekleyenler", text: "Ödeme günü geldi ya da ilk aidatı bekleniyor; ek süre bitince antrenmana katılamaz.", urgency: "mid" },
    { count: count("no_show"), href: "/admin/on-kayitlar?durum=no_show", title: "Randevuya gelmeyenler", text: "Arayıp yeni randevu verin.", urgency: "mid" },
    { count: kitSizeMissing, href: "/admin/malzeme?durum=beden", title: "Bedeni girilmemiş forma", text: "Sipariş ve teslim için forma bedeni ya da tozluk numarası gerekli; dokunup seçin.", urgency: "mid" },
    { count: kitToOrder, href: "/admin/malzeme?sekme=bedenler", title: "Sipariş verilecek forma, tozluk, eşofman", text: "Tedarikçiye verilecek adetler bedenleriyle hazır.", urgency: "mid" },
    { count: kitUnpaid, href: "/admin/malzeme?durum=odemedi", title: "Parası alınmamış forma/eşofman", text: "Veliden tahsil edilecek; alınınca işaretleyin.", urgency: "mid" },
    { count: broken, href: "/admin/kontrol", title: "Bozuk verisi olan kayıtlar", text: "Geçersiz T.C./telefon, şüpheli doğum tarihi, grubu olmayan öğrenci. Tek tıkla düzeltin.", urgency: "mid" },
    { count: needsReview, href: "/admin/kontrol", title: "Kontrol edilecek kayıtlar", text: "Veliden gelen güncel bilgi ya da aynı kişi olabilecek kayıtlar.", urgency: "info" },
    { count: formaMissing, href: "/admin/malzeme?durum=formasiz", title: "Forması girilmemiş öğrenciler", text: "Forma zorunlu: aldı mı, parası verildi mi girin.", urgency: "info" },
    { count: socksToHand, href: "/admin/malzeme?durum=tozluk", title: "Tozluğu verilmeyenler", text: "Tozluk formadan ayrı verilir; verince öğrencinin satırında “Teslim edildi”ye dokunun.", urgency: "info" },
    { count: incomplete, href: "/admin/on-kayitlar?eksik=1", title: "Eksik bilgisi olanlar", text: "T.C., doğum tarihi, adres gibi bilgiler tamamlanacak.", urgency: "info" },
  ] satisfies Task[]).filter((t) => t.count > 0 && (seesRegs || t.href.startsWith("/admin/aidat")));

  // Gruplara göre dağılım: aktif adaylar doğum yılına göre, öğrenciler atandıkları gruba göre sayılır.
  const activeCandidates = registrations.filter((r) => r.status === "pending" || r.status === "scheduled" || r.status === "no_show");
  const rows = groups.map((g) => ({
    key: String(g.id),
    name: g.name,
    range: formatYearRange(g),
    candidates: activeCandidates.filter((r) => effectiveGroup(r, groups).group?.id === g.id).length,
    students: registrations.filter((r) => r.status === "enrolled" && r.groupId === g.id).length,
  }));
  const outside = activeCandidates.filter((r) => !effectiveGroup(r, groups).group).length;
  if (outside > 0) rows.push({ key: "none", name: "Grup dışı yaş", range: "—", candidates: outside, students: 0 });
  const maxRow = Math.max(1, ...rows.map((r) => r.candidates + r.students));
  const firstName = (admin.fullName ?? admin.username ?? "").trim().split(/\s+/)[0];

  return (
    <Page width="wide">
      <PageHeader title={`${greeting(now)}${firstName ? `, ${firstName}` : ""}`} description={formatDayLongTr(today)} />

      {quickActions.length ? (
        <nav aria-label="Hızlı işlemler" className="mb-5 grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-white px-1 text-center text-[13px] font-semibold leading-tight text-ink shadow-[0_1px_2px_rgb(28_23_21/0.04)] transition active:scale-[0.97] sm:min-h-12 sm:flex-row sm:gap-2.5 sm:px-4 sm:text-[15px] sm:hover:border-stone-300"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl [&>svg]:h-5 [&>svg]:w-5 sm:h-8 sm:w-8 sm:[&>svg]:h-[18px] sm:[&>svg]:w-[18px] ${a.tint}`} aria-hidden="true">
                {a.icon}
              </span>
              {a.label}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 grid-cols-1 gap-5">
          <Panel title="Yapılacaklar" description={tasks.length ? "Önce kırmızılar: bekletilmemesi gerekenler." : undefined} flush>
            {tasks.length === 0 ? (
              <div className="flex items-center gap-3 px-4 pb-5 pt-1 sm:px-5">
                <CircleCheck className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
                <p className="text-[15px] text-ink">Bekleyen iş yok. Yeni başvuru ya da ödeme gelince burada görünür.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {tasks.map((t) => (
                  <li key={t.href + t.title}>
                    <Link href={t.href} className="group flex min-h-16 items-center gap-4 px-4 py-3 transition hover:bg-surface/70 sm:px-5">
                      <span
                        className={[
                          "flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl px-2 text-lg font-bold tabular-nums",
                          t.urgency === "high" ? "bg-red-600 text-white" : t.urgency === "mid" ? "bg-gs-yellow text-black" : "bg-stone-100 text-ink",
                        ].join(" ")}
                      >
                        {t.count}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink group-hover:text-gs-red">{t.title}</span>
                        <span className="block text-sm text-muted">{t.text}</span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-muted" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {seesTraining ? (
            <Panel
              title={trainingDay === today ? "Bugünkü antrenmanlar" : "Sıradaki antrenman"}
              description={trainingDay && trainingDay !== today ? formatDayLongTr(trainingDay) : trainingDay ? undefined : "Önümüzdeki iki haftada antrenman yok."}
              actions={<TextLink href={canAttend ? "/admin/yoklama" : "/admin/program"}>{canAttend ? "Yoklama" : "Program"}</TextLink>}
              flush
            >
              {daySessions.length === 0 ? (
                <p className="flex items-center gap-2 px-4 pb-5 pt-1 text-sm text-muted sm:px-5">
                  <CalendarRange className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Haftalık program girilince antrenmanlar burada görünür.
                </p>
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {daySessions.map((x) => {
                    const c = dayCounts.get(x.id);
                    const size = groupSize(x.groupId);
                    const taken = c ? c.present + c.absent + c.excused > 0 : false;
                    return (
                      <li key={x.id}>
                        <Link href={canAttend ? `/admin/yoklama?seans=${x.id}` : "/admin/program"} className="group flex min-h-14 items-center gap-4 px-4 py-2.5 transition hover:bg-surface/70 sm:px-5">
                          <span className="w-12 shrink-0 text-[15px] font-bold tabular-nums text-ink">{x.startTime}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-ink group-hover:text-gs-red">{x.groupName}</span>
                            <span className="block truncate text-sm text-muted">
                              {x.venueName ?? "Saha seçilmedi"} · {size} öğrenci
                            </span>
                          </span>
                          {x.status === "cancelled" ? (
                            <Badge tone="red">İptal</Badge>
                          ) : trainingDay === today && canAttend ? (
                            taken ? (
                              <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700">
                                {c!.present}/{size} geldi
                              </span>
                            ) : (
                              <span className="shrink-0 text-sm font-semibold text-gs-red">Yoklama al</span>
                            )
                          ) : null}
                          <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          ) : null}

          {seesRegs ? (
            <Panel title={`Yaklaşan randevular`} description={`Önümüzdeki ${UPCOMING_DAYS} gün`} actions={<TextLink href="/admin/randevular">Tümü</TextLink>} flush>
              {upcoming.length === 0 ? (
                <p className="px-4 pb-5 pt-1 text-sm text-muted sm:px-5">Yaklaşan randevu yok.</p>
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {upcoming.map((r) => {
                    const day = istanbulDayKey(r.appointmentAt!);
                    return (
                      <li key={r.id}>
                        <Link href={`/admin/kayit/${r.id}`} className="group flex items-center gap-4 px-4 py-2.5 transition hover:bg-surface/70 sm:px-5">
                          <span className="w-24 shrink-0">
                            <span className="block font-semibold tabular-nums text-ink">{formatTimeTr(r.appointmentAt)}</span>
                            <span className={`block text-xs ${day === today ? "font-semibold text-gs-red" : "text-muted"}`}>{day === today ? "Bugün" : formatDayLongTr(day)}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-ink group-hover:text-gs-red">{r.studentFullName}</span>
                            <span className="block truncate text-xs text-muted">{[r.age !== null ? `${r.age} yaş` : null, effectiveGroup(r, groups).group?.name, r.contact.fullName].filter(Boolean).join(" · ")}</span>
                            <NotePreview note={r.adminNote} className="mt-0.5" />
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          ) : null}
        </div>

        {seesRegs ? (
          <aside className="grid min-w-0 grid-cols-1 gap-5">
            <Panel title="Seçili aralığın özeti" description={dateRangeLabel(range)} actions={seesReports ? <TextLink href={withDateRange("/admin/raporlar", range)}>Raporlar</TextLink> : null}>
              <DateRangeFilter range={range} today={today} />
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {money ? (
                  <>
                    <Stat label="Kasaya giren aidat" value={formatMoney(money.collected)} href={withDateRange("/admin/kasa?tur=aidat", range)} />
                    <Stat label="Şu an beklenen aidat" value={formatMoney(money.outstanding.amount)} hint={money.outstanding.students ? `${money.outstanding.students} öğrenci` : "herkes ödedi"} href="/admin/ogrenciler?liste=aidat" tone={money.outstanding.amount > 0 ? "bad" : undefined} />
                  </>
                ) : null}
                <Stat label="Kayıtlı öğrenci" value={enrolled} href="/admin/ogrenciler" />
                <Stat label="Aralıkta yeni kayıt" value={newInRange} hint={`${activeCandidates.length} aday süreçte`} href={`/admin/ogrenciler?kayitFrom=${range.from}&kayitTo=${range.to}`} />
              </div>
            </Panel>

            <Panel title="Son başvurular" actions={<TextLink href="/admin/on-kayitlar?durum=all">Tümü</TextLink>} flush>
              {recent.length === 0 ? (
                <p className="px-4 pb-5 pt-1 text-sm text-muted sm:px-5">Henüz başvuru yok.</p>
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {recent.map((r) => (
                    <li key={r.id}>
                      <Link href={`/admin/kayit/${r.id}`} className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-surface/70 sm:px-5">
                        <Avatar name={r.studentFullName} photoId={r.photoFileId} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink group-hover:text-gs-red">{r.studentFullName}</span>
                          <span className="block text-xs text-muted">{formatDateTimeTr(r.createdAt)}</span>
                        </span>
                        <StatusBadge status={r.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Gruplar" actions={can(admin, "program.yonet") ? <TextLink href="/admin/gruplar">Düzenle</TextLink> : null}>
              <ul className="grid gap-3">
                {rows.map((row) => (
                  <li key={row.key}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className={row.key === "none" ? "font-medium text-amber-700" : "font-medium text-ink"}>
                        {row.name} <span className="font-normal text-muted">{row.range}</span>
                      </span>
                      <span className="tabular-nums text-muted">
                        <span className="font-semibold text-ink">{row.students}</span> öğrenci{row.candidates ? ` · ${row.candidates} aday` : ""}
                      </span>
                    </div>
                    <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
                      <div className="bg-emerald-500" style={{ width: `${(row.students / maxRow) * 100}%` }} />
                      <div className="bg-gs-yellow" style={{ width: `${(row.candidates / maxRow) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Öğrenci
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-gs-yellow" /> Süreçteki aday (doğum yılına göre)
                </span>
              </p>
            </Panel>
          </aside>
        ) : null}
      </div>
    </Page>
  );
}

function Stat({ label, value, href, hint, tone }: { label: string; value: ReactNode; href?: string; hint?: string; tone?: "bad" }) {
  const body = (
    <>
      <span className="block text-xs font-medium text-muted">{label}</span>
      <span className={`mt-0.5 block text-2xl font-bold tabular-nums tracking-tight ${tone === "bad" ? "text-red-700" : "text-ink"}`}>{value}</span>
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </>
  );
  return href ? (
    <Link href={href} className="-m-2 rounded-xl p-2 transition hover:bg-surface">
      {body}
    </Link>
  ) : (
    <div>{body}</div>
  );
}
