"use client";

import { DateRangeFilter } from "@/components/DateRangeFilter";
import { defaultDateRange, isDateKey, type DateRange } from "@/lib/date-range";
import { istanbulDayKey } from "@/lib/format";
import { useMemo, useState } from "react";
import type { RegistrationDto } from "@/lib/api";
import type { AgeGroupView } from "@/lib/age-groups";
import { FileSpreadsheet, FileText } from "lucide-react";
import { ALL_COLUMN_KEYS, COLUMN_GROUPS, COLUMN_PRESETS, FORMA_LIST_COLUMNS } from "@/lib/export/columns";
import { filterRegistrations } from "@/lib/export/filter";
import { REGISTRATION_STATUSES, STATUS_LABELS, type RegistrationStatus } from "@/lib/registration-status";
import { DatePicker } from "@/components/Calendar";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui";

const COLUMNS_STORAGE_KEY = "gs-export-columns";
/** Öğrenci / grup listesi için ayrı hatırlanır (ödeme, devam, program sütunlarıyla). */
const STUDENT_COLUMNS_KEY = "gs-export-columns-ogrenci";
/** Forma sayfasındaki liste ayrı hatırlanır. */
const FORMA_COLUMNS_KEY = "gs-export-columns-forma";
/** PDF sayfasına sığan sütun sayısı. */
const PDF_MAX_COLUMNS = 12;

function loadSavedColumns(key: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string" && ALL_COLUMN_KEYS.includes(k)) : null;
  } catch {
    return null;
  }
}

type Props = {
  initialDateRange?: DateRange;
  attendanceRange?: DateRange;
  registrations: RegistrationDto[];
  groups: AgeGroupView[];
  initialStatuses: RegistrationStatus[];
  initialGroups: string[] | null;
  onClose: () => void;
  /** Aidat ve forma sütunları (aidat izni). */
  billing?: boolean;
  /** "students": yalnız kayıtlı öğrenciler; durum / başvuru tarihi sorulmaz, her grup ayrı sayfa seçilebilir. */
  mode?: "registrations" | "students";
  /** "forma": Forma sayfasından; varsayılan sütunlar forma bedeni, durumu, parası, tozluk. */
  preset?: "forma";
};

const STUDENT_DEFAULT = ["studentNo", "studentFullName", "age", "group", "groupAges", "schedule", "isGoalkeeper", "contactParentFullName", "contactParentPhone", "attendanceRate"];
const STUDENT_DEFAULT_BILLING = [...STUDENT_DEFAULT, "payStatus", "nextPayment", "amountDue"];

export function ExportDialog({ registrations, groups, initialStatuses, initialGroups, onClose, billing = false, mode = "registrations", preset, initialDateRange, attendanceRange }: Props) {
  const forma = preset === "forma";
  const students = mode === "students" || forma;
  const groupKeys = useMemo(() => [...groups.map((g) => String(g.id)), "none"], [groups]);
  const visibleGroups = COLUMN_GROUPS.filter((g) => billing || !g.billing);
  const visibleKeys = visibleGroups.flatMap((g) => g.columns.map((c) => c.key));
  const [statuses, setStatuses] = useState<string[]>(students ? ["enrolled"] : initialStatuses);
  const [groupSel, setGroupSel] = useState<string[]>(initialGroups ?? groupKeys);
  const [from, setFrom] = useState(initialDateRange?.from ?? "");
  const [to, setTo] = useState(initialDateRange?.to ?? "");
  const today = istanbulDayKey(new Date());
  const [summaryRange, setSummaryRange] = useState(attendanceRange ?? defaultDateRange(today));
  const [split, setSplit] = useState(students);
  const storageKey = forma ? FORMA_COLUMNS_KEY : students ? STUDENT_COLUMNS_KEY : COLUMNS_STORAGE_KEY;
  const [columns, setColumns] = useState<string[]>(() => {
    const saved = typeof window !== "undefined" ? loadSavedColumns(storageKey)?.filter((k) => visibleKeys.includes(k)) : null;
    if (saved && saved.length > 0) return saved;
    if (forma) return FORMA_LIST_COLUMNS.filter((k) => visibleKeys.includes(k));
    return students ? (billing ? STUDENT_DEFAULT_BILLING : STUDENT_DEFAULT) : ALL_COLUMN_KEYS.filter((k) => visibleKeys.includes(k));
  });

  const allGroups = groupSel.length === groupKeys.length;
  const allStatuses = statuses.length === REGISTRATION_STATUSES.length;
  const filter = {
    statuses: allStatuses ? null : statuses,
    groups: allGroups ? null : groupSel,
    from: from || null,
    to: to || null,
    dateField: students ? "enrolled" as const : "created" as const,
    ids: registrations.map(r => r.id),
  };
  // Sunucuyla aynı filtre: indirilecek kayıt sayısı önceden gösterilir.
  const count = filterRegistrations(registrations, groups, filter).length;

  function toggle(list: string[], key: string): string[] {
    return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
  }

  function open(format: "xlsx" | "pdf") {
    const params = new URLSearchParams();
    if (filter.statuses) params.set("status", filter.statuses.join(","));
    if (filter.groups) params.set("group", filter.groups.join(","));
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);
    params.set("dateField", filter.dateField);
    params.set("ids", registrations.map(r => r.id).join(","));
    params.set("devamFrom", summaryRange.from);
    params.set("devamTo", summaryRange.to);
    params.set("cols", ALL_COLUMN_KEYS.filter((k) => columns.includes(k)).join(","));
    if (students) params.set(split ? "split" : "sira", "grup");
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(columns));
    } catch {
      // tarayıcı depolaması kapalı olabilir; seçim yalnızca bu seferlik kullanılır
    }
    if (format === "pdf") params.set("baslik", forma ? "forma" : students ? "ogrenci" : "kayit");
    const query = params.toString();
    // Excel sayfadan ayrılmadan iner; PDF yeni sekmede açılır (telefonda Paylaş → WhatsApp)
    const link = document.createElement("a");
    link.href = `/api/admin/export/${format}${query ? `?${query}` : ""}`;
    if (format === "xlsx") link.download = "";
    else {
      link.target = "_blank";
      link.rel = "noopener";
    }
    document.body.appendChild(link);
    link.click();
    link.remove();
    onClose();
  }

  const datesValid = (!from || isDateKey(from)) && (!to || isDateKey(to)) && (!from || !to || from <= to);
  const canDownload = datesValid && count > 0 && columns.length > 0 && statuses.length > 0 && groupSel.length > 0;
  const canPdf = canDownload && columns.length <= PDF_MAX_COLUMNS;

  return (
    <Modal
      open
      title={forma ? "Forma listesi · PDF / Excel" : students ? "Öğrenci listesi · PDF / Excel" : "Dışa aktar · PDF / Excel"}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <span className="mr-auto self-center text-sm text-muted max-sm:basis-full!">
            <span className="font-bold text-ink">{count}</span> {students ? "öğrenci" : "kayıt"} · {columns.length} sütun
            {canDownload && !canPdf ? <span className="block text-xs">PDF için en fazla {PDF_MAX_COLUMNS} sütun seçin</span> : null}
          </span>
          <Button type="button" variant="secondary" onClick={() => open("pdf")} disabled={!canPdf}>
            <FileText className="h-4 w-4" aria-hidden="true" /> PDF aç
          </Button>
          <Button type="button" onClick={() => open("xlsx")} disabled={!canDownload}>
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Excel indir
          </Button>
        </>
      }
    >
      <div className="grid gap-6">
        {!students ? (
        <fieldset>
          <Legend title="Durum" onAll={() => setStatuses([...REGISTRATION_STATUSES])} onNone={() => setStatuses([])} />
          <div className="flex flex-wrap gap-2">
            {REGISTRATION_STATUSES.map((s) => (
              <Chip key={s} checked={statuses.includes(s)} onChange={() => setStatuses((l) => toggle(l, s))} label={STATUS_LABELS[s]} />
            ))}
          </div>
        </fieldset>
        ) : null}

        <fieldset>
          <Legend title="Grup" hint={students ? undefined : "Öğrencilerde atanmış grup, diğerlerinde doğum yılına göre grup"} onAll={() => setGroupSel(groupKeys)} onNone={() => setGroupSel([])} />
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <Chip key={g.id} checked={groupSel.includes(String(g.id))} onChange={() => setGroupSel((l) => toggle(l, String(g.id)))} label={g.name} />
            ))}
            <Chip checked={groupSel.includes("none")} onChange={() => setGroupSel((l) => toggle(l, "none"))} label="Grup dışı / grupsuz" />
          </div>
        </fieldset>

        {students ? (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-[15px] text-ink">
            <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} className="h-5 w-5 accent-gs-red" />
            <span>
              <span className="block font-semibold">Her grup ayrı sayfa</span>
              <span className="block text-sm text-muted">Excel&apos;de ve PDF&apos;te her grubun öğrencileri kendi sayfasında</span>
            </span>
          </label>
        ) : null}

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">{students ? "Okula kayıt tarihi" : "Başvuru tarihi"}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <DatePicker value={from} onChange={setFrom} max={to || undefined} placeholder="Başlangıç (opsiyonel)" clearable />
            <DatePicker value={to} onChange={setTo} min={from || undefined} placeholder="Bitiş (opsiyonel)" clearable />
          </div>
        </fieldset>
        <DateRangeFilter range={summaryRange} today={today} onChange={setSummaryRange} syncUrl={false} label="Devam ve alınan aidat tarih aralığı" />

        <fieldset>
          <legend className="mb-2 text-sm font-bold text-ink">Sütunlar</legend>
          <div className="mb-3 flex flex-wrap gap-2">
            {COLUMN_PRESETS.filter((p) => billing || !p.billing).map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setColumns(p.keys.filter((k) => visibleKeys.includes(k)))}
                className="min-h-9 cursor-pointer rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-ink hover:bg-gray-50"
              >
                {p.label}
              </button>
            ))}
            <button type="button" onClick={() => setColumns([])} className="min-h-9 cursor-pointer rounded-lg px-3 text-sm font-semibold text-muted hover:text-ink">
              Hiçbiri
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {visibleGroups.map((group) => {
              const keys = group.columns.map((c) => c.key);
              const all = keys.every((k) => columns.includes(k));
              return (
                <div key={group.title} className="rounded-xl border border-line p-3">
                  <label className="mb-1.5 flex cursor-pointer items-center gap-2 text-sm font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={all}
                      onChange={() => setColumns((l) => (all ? l.filter((k) => !keys.includes(k)) : [...new Set([...l, ...keys])]))}
                      className="h-4 w-4 accent-gs-red"
                    />
                    {group.title}
                  </label>
                  <div className="grid gap-1 pl-6">
                    {group.columns.map((c) => (
                      <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                        <input type="checkbox" checked={columns.includes(c.key)} onChange={() => setColumns((l) => toggle(l, c.key))} className="h-4 w-4 accent-gs-red" />
                        {c.header}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}

function Legend({ title, hint, onAll, onNone }: { title: string; hint?: string; onAll: () => void; onNone: () => void }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <legend className="text-sm font-bold text-ink">{title}</legend>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      <span className="ml-auto flex gap-3 text-xs font-semibold">
        <button type="button" onClick={onAll} className="cursor-pointer text-gs-red hover:underline">
          Tümü
        </button>
        <button type="button" onClick={onNone} className="cursor-pointer text-muted hover:underline">
          Hiçbiri
        </button>
      </span>
    </div>
  );
}

function Chip({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label
      className={[
        "flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition",
        checked ? "border-gs-red bg-gs-red-soft text-gs-red" : "border-gray-300 bg-white text-muted",
      ].join(" ")}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-gs-red" />
      {label}
    </label>
  );
}
