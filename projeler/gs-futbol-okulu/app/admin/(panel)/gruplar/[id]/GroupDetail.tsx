"use client";

import { DateRangeFilter } from "@/components/DateRangeFilter";
import { withDateRange, type DateRange } from "@/lib/date-range";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, ChevronDown, ClipboardList, FileDown, FileSpreadsheet, FileText, MessageCircle, Pencil, Phone, TriangleAlert } from "lucide-react";
import { useConfirm } from "@/components/admin/Confirm";
import { useToast } from "@/components/admin/Toast";
import { Avatar, EmptyState, KeeperBadge, Page, PageHeader, Panel } from "@/components/admin/kit";
import type { RegistrationDto } from "@/lib/api";
import { formatYearRange, type AgeGroupView } from "@/lib/age-groups";
import { dayLabel, PAY_STATUS, type PayStatus } from "@/lib/billing-shared";
import type { GroupSchedule, Venue } from "@/lib/db/schema";
import { addDaysTo } from "@/lib/dates";
import { formatDateTimeTr } from "@/lib/format";
import type { SessionView } from "@/lib/program";
import type { ProgramSlot } from "@/lib/program-sheets";
import { STATUS_LABELS, type RegistrationStatus } from "@/lib/registration-status";
import { isStudentSort, STUDENT_SORTS, studentComparator, type StudentSort } from "@/lib/student-sort";
import { useRememberList, useUrlFilters } from "@/lib/use-url-filters";
import { programMessage, telLink, whatsappLink, whatsappShareLink } from "@/lib/whatsapp";
import { deleteScheduleAction, restoreSessionAction } from "../../program/actions";
import { CancelDialog, CoachDialog, MoveDialog, ScheduleDialog, useAct, WEEKDAYS } from "../../program/ProgramManager";
import { GroupEditDialog } from "../GroupEditDialog";

type Props = {
  today: string;
  range: DateRange;
  group: AgeGroupView;
  groups: { id: number; name: string }[];
  venues: Venue[];
  schedules: GroupSchedule[];
  coaches: { groupId: number; userId: number; name: string }[];
  staff: { id: number; name: string; roleName: string; portal: string }[];
  sessions: SessionView[];
  students: RegistrationDto[];
  candidates: RegistrationDto[];
  /** Ödeme durumu (aidat izni varsa). */
  pay?: Record<number, PayStatus>;
  /** Seçilen tarih aralığının devamı. */
  attendance: Record<number, { rate: number | null; present: number; absent: number }>;
  can: { files: boolean; attendance: boolean; exportList: boolean };
  /** Bugünkü yaş aralığı ("9–11"). */
  ages: string;
  /** Doğum yılı grup aralığına uymayanlar. */
  mismatch: { id: number; name: string; year: number; suggested: string | null }[];
  programRow: { group: string; years: string; ages: string; slots: ProgramSlot[] } | null;
};

const UNPAID: PayStatus[] = ["late", "due", "first", "promise"];
const SESSION_LIMIT = 6;
const weekdayName = (day: string) => WEEKDAYS[(new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7];
const headBtn = "inline-flex min-h-10 items-center gap-2 rounded-xl border border-control bg-white px-3.5 text-sm font-semibold text-ink shadow-xs hover:bg-gray-50 pointer-coarse:min-h-11";
const actionBtn = "inline-flex min-h-9 cursor-pointer items-center rounded-lg px-2.5 text-sm font-semibold transition pointer-coarse:min-h-11";

export function GroupDetail(p: Props) {
  const { group, students, today } = p;
  // Sıralama adreste (?sira=): öğrenci dosyasından geri gelince aynı sıra
  useRememberList();
  const { values: u, set } = useUrlFilters({ sira: "ad" }, { valid: { sira: (v) => isStudentSort(v) && v !== "grup" } });
  const sort = u.sira as StudentSort;
  const [editing, setEditing] = useState<{ schedule: GroupSchedule | null } | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [cancelling, setCancelling] = useState<SessionView | null>(null);
  const [moving, setMoving] = useState<{ session: SessionView | null } | null>(null);
  const [allSessions, setAllSessions] = useState(false);
  const [editGroup, setEditGroup] = useState(false);
  const toast = useToast();
  const { busy, act } = useAct();
  const [confirm, confirmDialog] = useConfirm();

  const venueName = (id: number | null) => p.venues.find((v) => v.id === id)?.name ?? "Saha seçilmedi";
  const keepers = students.filter((s) => s.isGoalkeeper).length;
  const unpaid = p.pay ? students.filter((s) => UNPAID.includes(p.pay![s.id]!)).length : null;
  const totals = Object.values(p.attendance).reduce((t, a) => ({ present: t.present + a.present, absent: t.absent + a.absent }), { present: 0, absent: 0 });
  const groupRate = totals.present + totals.absent ? Math.round((totals.present / (totals.present + totals.absent)) * 100) : null;

  const sorted = useMemo(
    () =>
      [...students].sort(
        studentComparator(sort, {
          payRank: (r) => (p.pay?.[r.id] ? PAY_STATUS[p.pay[r.id]!].order : 99),
          attendanceRate: (r) => p.attendance[r.id]?.rate ?? null,
        }),
      ),
    [students, sort, p.pay, p.attendance],
  );
  const pickSort = (v: StudentSort) => set({ sira: v });

  const sessions = allSessions ? p.sessions : p.sessions.slice(0, SESSION_LIMIT);
  const tomorrow = addDaysTo(today, 1);

  return (
    <Page>
      <PageHeader
        back={{ href: "/admin/gruplar", label: "Gruplar" }}
        title={group.name}
        description={`${formatYearRange(group)} doğumlu · şu an ${p.ages} yaş`}
        actions={
          <>
            {p.can.files ? (
              <a href={`/api/admin/cikti?tur=yoklama-listesi&grup=${group.id}`} className={headBtn}>
                <FileSpreadsheet className="h-4 w-4 text-emerald-700" aria-hidden="true" /> Yoklama listesi (Excel)
              </a>
            ) : null}
            {p.can.files ? (
              <a href={`/api/admin/cikti?tur=liste&liste=antrenor&grup=${group.id}`} target="_blank" rel="noopener" className={headBtn}>
                <FileText className="h-4 w-4 text-muted" aria-hidden="true" /> Liste (PDF)
              </a>
            ) : null}
            {p.can.files || p.can.attendance ? (
              <a href={withDateRange(`/api/admin/cikti?tur=yoklama&grup=${group.id}`, p.range)} target="_blank" rel="noopener" className={headBtn}>
                <ClipboardList className="h-4 w-4 text-muted" aria-hidden="true" /> Yoklama kağıdı
              </a>
            ) : null}
            {p.programRow && p.programRow.slots.length ? (
              <a href={whatsappShareLink(programMessage([p.programRow], dayLabel(today)))} target="_blank" rel="noopener noreferrer" className={headBtn}>
                <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Programı gönder
              </a>
            ) : null}
            <Link href={withDateRange(`/admin/gruplar/cikti?grup=${group.id}`, p.range)} className={headBtn}>
              <FileDown className="h-4 w-4 text-muted" aria-hidden="true" /> Çıktı al
            </Link>
            <button type="button" onClick={() => setEditGroup(true)} className={`${headBtn} cursor-pointer`}>
              <Pencil className="h-4 w-4 text-muted" aria-hidden="true" /> Adı ve yaşları
            </button>
          </>
        }
      />

      {p.mismatch.length ? (
        <div className="mb-5 flex gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-[15px] text-amber-950 ring-1 ring-inset ring-amber-600/25">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold">Doğum yılı bu gruba uymayan {p.mismatch.length} öğrenci</p>
            <ul className="mt-1 grid gap-0.5 text-sm">
              {p.mismatch.map((m) => (
                <li key={m.id}>
                  {p.can.files ? (
                    <Link href={`/admin/kayit/${m.id}/asil-kayit`} className="font-semibold underline underline-offset-2">
                      {m.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{m.name}</span>
                  )}{" "}
                  · {m.year} doğumlu{m.suggested ? ` · önerilen: ${m.suggested}` : " · hiçbir grubun aralığında değil"}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-sm">Bilerek bu gruptaysa sorun yok; değilse adına dokunup grubunu değiştirin.</p>
          </div>
        </div>
      ) : null}

      <DateRangeFilter range={p.range} today={today} label="Devam tarih aralığı" />
      <dl className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-[0_1px_2px_rgb(28_23_21/0.04)] sm:grid-cols-4">
        <Stat label="Öğrenci" value={String(students.length)} />
        <Stat label="Kaleci" value={String(keepers)} />
        <Stat label="Seçili aralıkta devam" value={groupRate !== null ? `%${groupRate}` : "—"} tone={groupRate !== null && groupRate < 60 ? "bad" : undefined} />
        {unpaid !== null ? <Stat label="Aidatı gelmeyen" value={String(unpaid)} tone={unpaid ? "warn" : undefined} /> : <Stat label="Aday" value={String(p.candidates.length)} />}
      </dl>

      <div className="grid grid-cols-1 gap-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
          {/* Haftalık program */}
          <Panel
            title="Antrenman günleri"
            actions={
              <button type="button" onClick={() => setEditing({ schedule: null })} className={`${actionBtn} text-gs-red hover:bg-gs-red-soft`}>
                + Gün ekle
              </button>
            }
          >
            {p.schedules.length === 0 ? (
              <p className="text-[15px] text-muted">Program girilmedi. Aidat hesabında antrenmanlar Cumartesi ve Pazar sayılır.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2">
                {p.schedules.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 rounded-xl bg-surface/70 py-2 pl-3 pr-1">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-ink">
                        {WEEKDAYS[s.weekday - 1]} ·{" "}
                        <span className="whitespace-nowrap tabular-nums">
                          {s.startTime}–{s.endTime}
                        </span>
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {venueName(s.venueId)}
                        {s.validFrom || s.validTo ? ` · ${s.validFrom ? dayLabel(s.validFrom, false) : "…"}–${s.validTo ? dayLabel(s.validTo, false) : "…"}` : ""}
                      </span>
                    </span>
                    <button type="button" onClick={() => setEditing({ schedule: s })} className={`${actionBtn} text-gs-red hover:bg-gs-red-soft`}>
                      Düzenle
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className={`${actionBtn} text-red-700 hover:bg-red-50`}
                      onClick={async () => {
                        const ok = await confirm({
                          title: `${group.name} · ${WEEKDAYS[s.weekday - 1]} ${s.startTime} silinsin mi?`,
                          text: "Bu haftalık antrenman programdan kalkar ve gelecekteki antrenmanları silinir. Geçmiş yoklamalar kalır.",
                          confirmLabel: "Programdan sil",
                        });
                        if (ok) act(() => deleteScheduleAction(s.id), "Silindi. Gelecek antrenmanlar kaldırıldı.");
                      }}
                    >
                      Sil
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[15px] text-muted">
              Antrenör: <span className="font-semibold text-ink">{p.coaches.length ? p.coaches.map((c) => c.name).join(", ") : "atanmadı"}</span>{" "}
              <button type="button" onClick={() => setCoachOpen(true)} className={`${actionBtn} -my-2 px-1.5 text-gs-red hover:bg-gs-red-soft`}>
                Değiştir
              </button>
            </p>
          </Panel>

          {/* Sıradaki antrenmanlar */}
          <Panel
            title="Sıradaki antrenmanlar"
            description="Önümüzdeki 3 hafta"
            flush
            actions={
              <button type="button" onClick={() => setMoving({ session: null })} className={`${actionBtn} text-gs-red hover:bg-gs-red-soft`}>
                + Ek antrenman
              </button>
            }
          >
            {p.sessions.length === 0 ? (
              <p className="px-4 pb-4 text-[15px] text-muted sm:px-5">Önümüzdeki 3 haftada antrenman yok. Antrenman günü ekleyin.</p>
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {sessions.map((s) => {
                  const cancelled = s.status === "cancelled";
                  return (
                    <li key={s.id} className={["flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 sm:px-5", cancelled ? "bg-stone-50" : ""].join(" ")}>
                      {/* Dar ekranda düğmeler alt satıra iner */}
                      <span className="min-w-[12rem] flex-1">
                        <span className={["block text-[15px] font-semibold", cancelled ? "text-muted line-through" : "text-ink"].join(" ")}>
                          {s.date === today ? "Bugün" : s.date === tomorrow ? "Yarın" : dayLabel(s.date, false)} {weekdayName(s.date)} ·{" "}
                          <span className="whitespace-nowrap tabular-nums">
                            {s.startTime}–{s.endTime}
                          </span>
                        </span>
                        <span className="block text-sm text-muted">
                          {cancelled ? `İptal: ${s.cancelReason ?? ""}` : (s.venueName ?? "Saha seçilmedi")}
                          {!cancelled && s.moved ? " · taşındı" : ""}
                          {!cancelled && !s.scheduleId ? " · ek antrenman" : ""}
                        </span>
                      </span>
                      {cancelled ? (
                        <button type="button" disabled={busy} onClick={() => act(() => restoreSessionAction(s.id), "Antrenman yeniden açıldı.")} className={`${actionBtn} text-ink hover:bg-stone-100`}>
                          Geri al
                        </button>
                      ) : (
                        <span className="-ml-2.5 flex items-center sm:ml-0">
                          {s.date === today && p.can.attendance ? (
                            <Link href={`/admin/yoklama?seans=${s.id}`} className={`${actionBtn} bg-gs-red text-white hover:bg-gs-red-dark`}>
                              Yoklama al
                            </Link>
                          ) : null}
                          <button type="button" onClick={() => setMoving({ session: s })} className={`${actionBtn} text-ink hover:bg-stone-100`}>
                            Taşı
                          </button>
                          <button type="button" onClick={() => setCancelling(s)} className={`${actionBtn} text-red-700 hover:bg-red-50`}>
                            İptal
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {p.sessions.length > SESSION_LIMIT ? (
              <button type="button" onClick={() => setAllSessions((v) => !v)} className="w-full cursor-pointer border-t border-line px-4 py-2.5 text-sm font-semibold text-gs-red hover:bg-gs-red-soft sm:px-5">
                {allSessions ? "Daha az göster" : `Tümünü göster (${p.sessions.length})`}
              </button>
            ) : null}
          </Panel>
        </div>

        {/* Öğrenciler */}
        <Panel title={`Öğrenciler (${students.length})`} description={students.length ? "Satıra dokununca dosyası açılır." : undefined} flush>
          {students.length === 0 ? (
            <EmptyState title="Bu grupta öğrenci yok">Okula kayıtta bu grup seçilen öğrenciler burada görünür.</EmptyState>
          ) : (
            <>
              <div className="px-4 pb-3 sm:px-5">
                <label className="relative block sm:w-72">
                  <span className="sr-only">Sırala</span>
                  <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <select
                    value={sort}
                    onChange={(e) => pickSort(e.target.value as StudentSort)}
                    aria-label="Sırala"
                    className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-control bg-white pl-9 pr-9 text-[16px] text-ink shadow-xs outline-none focus:border-gs-red/50 focus:ring-4 focus:ring-gs-red/10 md:h-10 md:text-[15px]"
                  >
                    {STUDENT_SORTS.filter((o) => !o.multiGroup && (!o.billing || p.pay)).map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                </label>
              </div>
              <ul className="divide-y divide-line border-t border-line">
                {sorted.map((r) => (
                  <StudentRow key={r.id} r={r} pay={p.pay?.[r.id]} att={p.attendance[r.id]} canOpen={p.can.files} />
                ))}
              </ul>
            </>
          )}
        </Panel>

        {/* Adaylar */}
        {p.candidates.length ? (
          <Panel title={`Bu yaştaki adaylar (${p.candidates.length})`} description="Başvurusu var, okula kaydı henüz yapılmadı." flush>
            <ul className="divide-y divide-line border-t border-line">
              {p.candidates.map((r) => (
                <li key={r.id}>
                  {p.can.files ? (
                    <Link href={`/admin/kayit/${r.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 transition hover:bg-surface/70 sm:px-5">
                      <CandidateLine r={r} />
                    </Link>
                  ) : (
                    <div className="flex min-h-14 items-center gap-3 px-4 py-2 sm:px-5">
                      <CandidateLine r={r} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>

      {editing ? (
        <ScheduleDialog
          schedule={editing.schedule}
          groupId={group.id}
          groups={p.groups}
          venues={p.venues.filter((v) => v.active || v.id === editing.schedule?.venueId)}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {coachOpen ? <CoachDialog group={{ id: group.id, name: group.name }} staff={p.staff} selected={p.coaches.map((c) => c.userId)} onClose={() => setCoachOpen(false)} /> : null}
      {cancelling ? <CancelDialog session={cancelling} onClose={() => setCancelling(null)} /> : null}
      {moving ? <MoveDialog session={moving.session} groupId={group.id} groups={p.groups} venues={p.venues.filter((v) => v.active)} today={today} onClose={() => setMoving(null)} /> : null}
      {editGroup ? (
        <GroupEditDialog
          group={group}
          onClose={() => setEditGroup(false)}
          onSaved={(text) => {
            setEditGroup(false);
            toast({ text });
          }}
        />
      ) : null}
      {confirmDialog}
    </Page>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bad" | "warn" }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={["mt-0.5 text-2xl font-bold tabular-nums tracking-tight", tone === "bad" ? "text-red-700" : tone === "warn" ? "text-amber-700" : "text-ink"].join(" ")}>{value}</dd>
    </div>
  );
}

function StudentRow({ r, pay, att, canOpen }: { r: RegistrationDto; pay?: PayStatus; att?: { rate: number | null; present: number; absent: number }; canOpen: boolean }) {
  const st = pay && pay !== "paid" && pay !== "unbilled" && pay !== "inactive" ? PAY_STATUS[pay] : null;
  const low = att?.rate !== null && att?.rate !== undefined && att.rate < 60 && att.present + att.absent >= 3;
  return (
    <li className="group relative flex items-center gap-3 px-4 py-3 transition hover:bg-surface/70 sm:px-5">
      <Avatar name={r.studentFullName} photoId={r.photoFileId} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {canOpen ? (
            <Link href={`/admin/kayit/${r.id}`} className="truncate text-[15px] font-semibold text-ink after:absolute after:inset-0 after:content-[''] group-hover:text-gs-red">
              {r.studentFullName}
            </Link>
          ) : (
            <span className="truncate text-[15px] font-semibold text-ink">{r.studentFullName}</span>
          )}
          {r.isGoalkeeper ? <KeeperBadge /> : null}
          {st ? <span className={`inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold ${st.badge}`}>{st.label}</span> : null}
        </p>
        <p className="mt-0.5 text-sm text-muted">
          {[r.studentNo ? `No ${r.studentNo}` : null, r.age !== null ? `${r.age} yaş` : null].filter(Boolean).join(" · ")}
          {" · "}
          <span className={low ? "font-medium text-red-700" : undefined}>{att && att.rate !== null ? `devam %${att.rate}` : "yoklama yok"}</span>
        </p>
      </div>
      {r.contact.phone ? (
        <span className="relative z-[1] flex shrink-0 items-center gap-1">
          <a href={telLink(r.contact.phone)} aria-label={`${r.contact.fullName || "Veli"} ara`} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-control bg-white text-ink shadow-xs hover:bg-gray-50 pointer-coarse:h-11 pointer-coarse:w-11">
            <Phone className="h-4 w-4 text-gs-red" aria-hidden="true" />
          </a>
          <a href={whatsappLink(r.contact.phone)} target="_blank" rel="noopener noreferrer" aria-label={`${r.contact.fullName || "Veli"} WhatsApp`} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-control bg-white text-ink shadow-xs hover:bg-gray-50 pointer-coarse:h-11 pointer-coarse:w-11">
            <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </a>
        </span>
      ) : null}
    </li>
  );
}

function CandidateLine({ r }: { r: RegistrationDto }) {
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-ink">{r.studentFullName}</span>
        <span className="block text-sm text-muted">
          {STATUS_LABELS[r.status as RegistrationStatus] ?? r.status}
          {r.status === "scheduled" && r.appointmentAt ? ` · ${formatDateTimeTr(r.appointmentAt)}` : ""}
          {r.age !== null ? ` · ${r.age} yaş` : ""}
        </span>
      </span>
    </>
  );
}
