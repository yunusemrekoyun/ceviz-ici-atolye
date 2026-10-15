"use client";

import { DateRangeFilter } from "@/components/DateRangeFilter";
import { ATTENDANCE_START, withDateRange, type DateRange } from "@/lib/date-range";
import { useState } from "react";
import { CalendarRange, ClipboardList, FileSpreadsheet, FileText, MessageCircle, Users } from "lucide-react";
import { Page, PageHeader, Panel } from "@/components/admin/kit";
import type { RegistrationDto } from "@/lib/api";
import type { AgeGroupView } from "@/lib/age-groups";
import { ROSTER_PRESETS, type RosterPreset } from "@/lib/output-options";
import type { ProgramSlot } from "@/lib/program-sheets";
import { programMessage, whatsappShareLink } from "@/lib/whatsapp";
import { ExportDialog } from "../../ExportDialog";

type Selection = "all" | "bugun" | "yarin" | number[];
const primary = "inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gs-red px-4 text-[15px] font-semibold text-white shadow-xs transition hover:bg-gs-red-dark active:scale-[0.98] sm:flex-none";
const secondary = "inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-control bg-white px-4 text-[15px] font-semibold text-ink shadow-xs transition hover:bg-gray-50 active:scale-[0.98] sm:flex-none";

type Props = {
  initialRange: DateRange;
  today: string;
  todayLabel: string;
  tomorrow: string;
  groups: { id: number; name: string; ages: string; students: number }[];
  todayGroupIds: number[];
  tomorrowGroupIds: number[];
  programRows: { group: string; years: string; ages: string; slots: ProgramSlot[] }[];
  initial: Selection;
  can: { lists: boolean; sheets: boolean; excel: boolean; billing: boolean };
  registrations: RegistrationDto[];
  ageGroups: AgeGroupView[];
};

export function OutputCenter(p: Props) {
  const [sel, setSel] = useState<Selection>(p.initial);
  const [preset, setPreset] = useState<RosterPreset>("antrenor");
  const [range, setRange] = useState(p.initialRange);
  const [marks, setMarks] = useState(true);
  const [excel, setExcel] = useState(false);

  const ids = sel === "all" ? p.groups.map((g) => g.id) : sel === "bugun" ? p.todayGroupIds : sel === "yarin" ? p.tomorrowGroupIds : sel;
  const grupParam = sel === "all" || sel === "bugun" || sel === "yarin" ? sel : sel.join(",");
  const studentCount = p.groups.filter((g) => ids.includes(g.id)).reduce((n, g) => n + g.students, 0);
  const none = ids.length === 0;
  const toggle = (id: number) => setSel((s) => {
    const list = Array.isArray(s) ? s : [];
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    return next.length ? next : "all";
  });


  return (
    <Page width="narrow">
      <PageHeader
        back={{ href: "/admin/gruplar", label: "Gruplar" }}
        title="Çıktı al"
        description="PDF telefonda açılır: “Paylaş” ile WhatsApp'tan gönderebilir ya da yazdırabilirsiniz. Excel bilgisayarda düzenlemek, süzmek içindir."
      />

      <Panel title="1. Hangi gruplar?" description={none ? "Seçime uyan grup yok." : `${ids.length} grup · ${studentCount} öğrenci`}>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Gruplar">
          <Chip on={sel === "all"} onClick={() => setSel("all")}>
            Tüm gruplar
          </Chip>
          {p.todayGroupIds.length ? (
            <Chip on={sel === "bugun"} onClick={() => setSel("bugun")}>
              Bugün antrenmanı olanlar ({p.todayGroupIds.length})
            </Chip>
          ) : null}
          {p.tomorrowGroupIds.length ? (
            <Chip on={sel === "yarin"} onClick={() => setSel("yarin")}>
              Yarın antrenmanı olanlar ({p.tomorrowGroupIds.length})
            </Chip>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {p.groups.map((g) => (
            <Chip key={g.id} on={Array.isArray(sel) && sel.includes(g.id)} onClick={() => toggle(g.id)}>
              {g.name} <span className="font-normal opacity-75">· {g.ages} yaş · {g.students}</span>
            </Chip>
          ))}
        </div>
      </Panel>

      <div className="mt-5 grid grid-cols-1 gap-5">
        {p.can.lists ? (
          <Panel title="Yoklama listesi · Excel" description="Okulun kendi listesi: her grup ayrı sayfa; No, ad soyad, doğum tarihi, yaş, veli, telefon, grup, kaleci; Yoklama, Aidat ve Forma sütunları boş. Öğrenci az olsa da 21 satır, yatay A4 tek sayfa.">
            <a href={none ? undefined : `/api/admin/cikti?tur=yoklama-listesi&grup=${grupParam}`} className={`${primary} ${none ? "pointer-events-none opacity-50" : ""}`}>
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" /> Excel indir
            </a>
          </Panel>
        ) : null}

        {p.can.lists ? (
          <Panel title="Grup listeleri" description="Her grup ayrı sayfada: yaş aralığı, günler ve saatler, saha, antrenör ve öğrenciler.">
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Liste türü">
              {ROSTER_PRESETS.filter((x) => p.can.billing || !x.billing).map((x) => (
                <button
                  key={x.key}
                  type="button"
                  role="radio"
                  aria-checked={preset === x.key}
                  onClick={() => setPreset(x.key)}
                  className={["min-h-16 cursor-pointer rounded-xl border px-3 py-2.5 text-left transition", preset === x.key ? "border-gs-red bg-gs-red-soft ring-1 ring-gs-red" : "border-control bg-white hover:border-gray-400"].join(" ")}
                >
                  <span className={`block font-semibold ${preset === x.key ? "text-gs-red" : "text-ink"}`}>{x.label}</span>
                  <span className="block text-sm text-muted">{x.hint}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={none ? undefined : `/api/admin/cikti?tur=liste&liste=${preset}&grup=${grupParam}`} target="_blank" rel="noopener" aria-disabled={none} className={`${primary} ${none ? "pointer-events-none opacity-50" : ""}`}>
                <FileText className="h-5 w-5" aria-hidden="true" /> PDF aç
              </a>
              {p.can.excel ? (
                <button type="button" disabled={none} onClick={() => setExcel(true)} className={`${secondary} disabled:opacity-50`}>
                  <FileSpreadsheet className="h-5 w-5 text-emerald-700" aria-hidden="true" /> Excel (sütunları seç)
                </button>
              ) : null}
            </div>
            {p.can.excel ? <p className="mt-2 text-sm text-muted">Excel&apos;de istediğiniz bilgiyi ekleyebilirsiniz: öğrenci ve veli bilgileri, grup programı, aidat durumu ve son ödeme, forma, devam.</p> : null}
          </Panel>
        ) : null}

        {p.can.sheets ? (
          <Panel title="Yoklama kağıdı" description="Sahada kalemle doldurmak için: seçilen aralığın antrenman tarihleri sütun, öğrenciler satır; altta boş satırlar ve imza yeri.">
            <DateRangeFilter range={range} today={p.today} min={ATTENDANCE_START} onChange={setRange} />
            <label className="mt-3 flex cursor-pointer items-center gap-3 text-[15px] text-ink">
              <input type="checkbox" checked={marks} onChange={(e) => setMarks(e.target.checked)} className="h-5 w-5 accent-[var(--color-gs-red)]" />
              Alınmış yoklamaları kağıda yaz (boş kağıt için kaldırın)
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={none ? undefined : withDateRange(`/api/admin/cikti?tur=yoklama&grup=${grupParam}&isaret=${marks ? 1 : 0}`, range)} target="_blank" rel="noopener" className={`${primary} ${none ? "pointer-events-none opacity-50" : ""}`}>
                <ClipboardList className="h-5 w-5" aria-hidden="true" /> PDF aç
              </a>
              <a href={none ? undefined : withDateRange(`/api/admin/cikti?tur=yoklama&grup=${grupParam}&isaret=${marks ? 1 : 0}&bicim=xlsx`, range)} className={`${secondary} ${none ? "pointer-events-none opacity-50" : ""}`}>
                <FileSpreadsheet className="h-5 w-5 text-emerald-700" aria-hidden="true" /> Excel indir
              </a>
            </div>
          </Panel>
        ) : null}

        <Panel title="Haftalık antrenman programı" description="Tüm gruplar: yaş, günler ve saatler, saha, antrenör; altta haftalık takvim ve sahalar.">
          <div className="flex flex-wrap gap-2">
            <a href="/api/admin/cikti?tur=program" target="_blank" rel="noopener" className={primary}>
              <CalendarRange className="h-5 w-5" aria-hidden="true" /> PDF aç
            </a>
            <a href="/api/admin/cikti?tur=program&bicim=xlsx" className={secondary}>
              <FileSpreadsheet className="h-5 w-5 text-emerald-700" aria-hidden="true" /> Excel indir
            </a>
            <a href={whatsappShareLink(programMessage(p.programRows, p.todayLabel))} target="_blank" rel="noopener noreferrer" className={secondary}>
              <MessageCircle className="h-5 w-5 text-emerald-600" aria-hidden="true" /> WhatsApp&apos;la gönder
            </a>
          </div>
        </Panel>
      </div>

      {excel ? (
        <ExportDialog
          registrations={p.registrations}
          groups={p.ageGroups}
          initialStatuses={["enrolled"]}
          initialGroups={sel === "all" ? null : ids.map(String)}
          onClose={() => setExcel(false)}
          billing={p.can.billing}
          mode="students"
        />
      ) : null}
      <p className="mt-6 flex items-center gap-2 text-sm text-muted">
        <Users className="h-4 w-4" aria-hidden="true" /> Çıktılar yalnız okula kayıtlı öğrencileri içerir.
      </p>
    </Page>
  );
}

function Chip({ on, onClick, children, block }: { on: boolean; onClick: () => void; children: React.ReactNode; block?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={[
        "min-h-11 cursor-pointer rounded-xl border px-3.5 py-1.5 text-[15px] font-semibold transition active:scale-[0.97]",
        block ? "text-center" : "",
        on ? "border-ink bg-ink text-white" : "border-control bg-white text-ink hover:border-stone-400",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
