import { dateRangeLabel, type DateRange } from "@/lib/date-range";
import path from "node:path";
import pdfmake from "pdfmake";
import { listAgeGroups } from "@/lib/age-groups-db";
import { todayKey } from "@/lib/billing";
import { dayLabel, formatMoney } from "@/lib/billing-shared";
import { BRAND_NAME } from "@/lib/constants";
import type { Registration } from "@/lib/db/schema";
import type { KitStage } from "@/lib/equipment-shared";
import type { ExportColumn } from "@/lib/export/columns";
import type { PreparedExport } from "@/lib/export/request";
import { registrationValues } from "@/lib/export/xlsx";
import { extraRecords, groupAgeRange, type ExtraRecord } from "@/lib/export/extras";
import { GIVEN, isMissingCell, kitSheet } from "@/lib/export/kit-sheet";
import { computeAge, formatDateTr, resolveContactParent } from "@/lib/format";
import { ROSTER_PRESETS, type RosterPreset } from "@/lib/output-options";
import { formatPhone } from "@/lib/phone";
import { attendanceSheets, MARK_LEGEND, MARK_SYMBOL, sessionHeader, WEEKDAYS, weeklyProgram } from "@/lib/program-sheets";

/**
 * PDF çıktıları (pdfmake, Roboto; Türkçe karakterler tam). Telefonda indirilip WhatsApp'tan gönderilebilir.
 * Haftalık program · grup listeleri · dışa aktar (seçilen sütunlar) · forma sipariş / beden listesi · yoklama kağıdı.
 */

const FONT_DIR = path.join(process.cwd(), "node_modules/pdfmake/fonts/Roboto");
let ready = false;
function setup() {
  if (ready) return;
  pdfmake.setFonts({
    Roboto: {
      normal: path.join(FONT_DIR, "Roboto-Regular.ttf"),
      bold: path.join(FONT_DIR, "Roboto-Medium.ttf"),
      italics: path.join(FONT_DIR, "Roboto-Italic.ttf"),
      bolditalics: path.join(FONT_DIR, "Roboto-MediumItalic.ttf"),
    },
  });
  // Dışarıdan dosya / adres okunmaz; yalnız yazı tipleri
  pdfmake.setUrlAccessPolicy(() => false);
  pdfmake.setLocalAccessPolicy((p) => path.resolve(p).startsWith(FONT_DIR));
  ready = true;
}

const RED = "#A90432";
const INK = "#1c1715";
const MUTED = "#6b6560";
const LINE = "#d6d3d1";

type Content = Record<string, unknown> | string | Content[];

const tableLayout = {
  hLineColor: () => LINE,
  vLineColor: () => LINE,
  hLineWidth: () => 0.6,
  vLineWidth: () => 0.6,
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 4,
  paddingBottom: () => 4,
  fillColor: (row: number) => (row > 0 && row % 2 === 0 ? "#faf9f7" : null),
};

function th(text: string, extra: Record<string, unknown> = {}) {
  return { text, bold: true, color: "white", fillColor: RED, fontSize: 8.5, ...extra };
}

async function render(title: string, orientation: "portrait" | "landscape", content: Content[], today: string): Promise<Buffer> {
  setup();
  const width = orientation === "portrait" ? 595.28 - 56 : 841.89 - 56;
  const doc = {
    pageSize: "A4",
    pageOrientation: orientation,
    pageMargins: [28, 50, 28, 36],
    info: { title: `${BRAND_NAME} · ${title}`, author: BRAND_NAME },
    header: () => ({
      margin: [28, 16, 28, 0],
      stack: [
        { columns: [{ text: BRAND_NAME, bold: true, color: RED, fontSize: 10 }, { text: title, alignment: "right", color: MUTED, fontSize: 9 }] },
        { canvas: [{ type: "rect", x: 0, y: 4, w: width, h: 2.5, color: "#FDB912" }] },
      ],
    }),
    footer: (page: number, pages: number) => ({
      margin: [28, 8, 28, 0],
      columns: [
        { text: `${dayLabel(today)} tarihinde oluşturuldu`, fontSize: 7.5, color: "#9ca3af" },
        { text: `${page} / ${pages}`, alignment: "right", fontSize: 7.5, color: "#9ca3af" },
      ],
    }),
    defaultStyle: { font: "Roboto", fontSize: 9.5, color: INK, lineHeight: 1.15 },
    styles: {
      h1: { fontSize: 16, bold: true, margin: [0, 2, 0, 2] },
      info: { fontSize: 9.5, color: MUTED, margin: [0, 0, 0, 8] },
      h2: { fontSize: 11, bold: true, margin: [0, 12, 0, 4] },
    },
    content,
  };
  return pdfmake.createPdf(doc).getBuffer();
}

/* ---------------- Haftalık program ---------------- */

export async function programPdf(today: string = todayKey()): Promise<Buffer> {
  const { rows, venues } = weeklyProgram(today);
  const groups = new Map(listAgeGroups().map((g) => [g.id, g]));
  const body: Content[] = [
    [th("Grup"), th("Yaş"), th("Günler ve saatler"), th("Saha"), th("Antrenör"), th("Öğrenci", { alignment: "center" })],
    ...rows.map((r) => {
      const g = groups.get(r.groupId)!;
      return [
        { text: [{ text: r.group, bold: true }, { text: `\n${r.years} doğumlu`, color: MUTED, fontSize: 8 }] },
        `${groupAgeRange(g.minBirthYear, g.maxBirthYear, today)} yaş`,
        r.slots.length ? r.slots.map((s) => `${s.day} ${s.startTime}–${s.endTime}${s.validFrom && s.validFrom > today ? ` (${dayLabel(s.validFrom, false)}'den)` : ""}`).join("\n") : { text: "Program girilmedi", color: MUTED },
        [...new Set(r.slots.map((s) => s.venue ?? "—"))].join("\n") || "—",
        r.coaches.join(", ") || "—",
        { text: String(r.students), alignment: "center" },
      ];
    }),
  ];
  // Haftalık takvim: her gün hangi grup, saat kaçta
  const grid = [1, 2, 3, 4, 5, 6, 7].map((wd) =>
    rows
      .flatMap((r) => r.slots.filter((s) => s.weekday === wd).map((s) => ({ t: s.startTime, text: `${s.startTime}  ${r.group}` })))
      .sort((a, b) => a.t.localeCompare(b.t))
      .map((x) => x.text)
      .join("\n"),
  );
  const content: Content[] = [
    { text: "Haftalık antrenman programı", style: "h1" },
    { text: `${dayLabel(today)} itibarıyla · ${rows.filter((r) => r.slots.length).length} grup`, style: "info" },
    { table: { headerRows: 1, widths: [70, 46, "*", 95, 80, 38], body }, layout: tableLayout },
    { text: "Haftalık görünüm", style: "h2" },
    {
      table: {
        headerRows: 1,
        widths: Array(7).fill("*"),
        body: [WEEKDAYS.map((d) => th(d, { alignment: "center", fontSize: 8 })), grid.map((txt) => ({ text: txt || "—", fontSize: 8, color: txt ? INK : "#c4bbb4" }))],
      },
      layout: tableLayout,
    },
  ];
  if (venues.length) {
    content.push({ text: "Sahalar", style: "h2" });
    content.push({ ul: venues.map((v) => ({ text: [{ text: v.name, bold: true }, [v.address, v.note].filter(Boolean).length ? ` · ${[v.address, v.note].filter(Boolean).join(" · ")}` : ""] })) });
  }
  return render("Antrenman programı", "portrait", content, today);
}

/* ---------------- Grup listeleri ---------------- */

type Col = { header: string; width: number | string; value: (r: Registration, x: ExtraRecord) => Content; center?: boolean };

const phone = (r: Registration) => {
  const c = resolveContactParent(r);
  return c.phone ? formatPhone(c.phone) : "—";
};
const COLS: Record<string, Col> = {
  no: { header: "No", width: 28, value: (r) => (r.studentNo ? String(r.studentNo) : "—"), center: true },
  name: { header: "Ad Soyad", width: "*", value: (r) => ({ text: r.studentFullName, bold: true }) },
  age: { header: "Yaş", width: 24, value: (r) => String(computeAge(r.birthDate) ?? "—"), center: true },
  birth: { header: "Doğum", width: 50, value: (r) => (r.birthDate ? formatDateTr(r.birthDate) : "—") },
  keeper: { header: "K", width: 14, value: (r) => (r.isGoalkeeper ? "K" : ""), center: true },
  parent: { header: "Veli", width: 90, value: (r) => resolveContactParent(r).fullName || "—" },
  phone: { header: "Telefon", width: 72, value: phone },
  emergency: { header: "Acil durum", width: 110, value: (r) => (r.emergencyFullName ? `${r.emergencyFullName}${r.emergencyPhone ? `\n${formatPhone(r.emergencyPhone)}` : ""}` : "—") },
  blood: { header: "Kan", width: 30, value: (r) => r.bloodGroup || "—", center: true },
  attendance: { header: "Devam", width: 36, value: (_r, x) => (x.attendanceRate !== null && x.attendanceRate !== undefined ? `%${x.attendanceRate}` : "—"), center: true },
  pay: {
    header: "Aidat",
    width: 82,
    value: (_r, x) => ({ text: String(x.payStatus ?? "—"), color: x.payStatus === "Gecikti" ? "#b91c1c" : x.payStatus === "Ödedi" ? "#047857" : INK }),
  },
  due: { header: "Ödeme günü", width: 52, value: (_r, x) => (x.nextPayment ? dayLabel(String(x.nextPayment), false) : "—") },
  amount: { header: "Beklenen", width: 50, value: (_r, x) => (x.amountDue ? formatMoney(Number(x.amountDue)) : "—"), center: true },
  kit: { header: "Forma", width: 110, value: (_r, x) => ({ text: String(x.kit || "—"), fontSize: 7.5 }) },
};
const PRESET_COLS: Record<RosterPreset, string[]> = {
  antrenor: ["no", "name", "age", "keeper", "parent", "phone", "emergency", "blood", "attendance"],
  iletisim: ["no", "name", "age", "keeper", "parent", "phone"],
  aidat: ["no", "name", "parent", "phone", "pay", "due", "amount"],
  tam: ["no", "name", "age", "keeper", "parent", "phone", "pay", "due", "attendance", "kit"],
};

export async function rosterPdf(regs: Registration[], opts: { groupIds: number[] | null; preset: RosterPreset; billing: boolean; today?: string }): Promise<Buffer> {
  const today = opts.today ?? todayKey();
  const preset = !opts.billing && (opts.preset === "aidat" || opts.preset === "tam") ? "antrenor" : opts.preset;
  const cols = PRESET_COLS[preset].map((k) => COLS[k]!);
  const program = new Map(weeklyProgram(today).rows.map((r) => [r.groupId, r]));
  const groups = listAgeGroups().filter((g) => !opts.groupIds || opts.groupIds.includes(g.id));
  const students = regs.filter((r) => r.status === "enrolled");
  const extras = extraRecords(students, { billing: opts.billing, today });
  const content: Content[] = [];
  groups.forEach((g, i) => {
    const list = students.filter((r) => r.groupId === g.id).sort((a, b) => a.studentFullName.localeCompare(b.studentFullName, "tr"));
    const p = program.get(g.id);
    const keepers = list.filter((r) => r.isGoalkeeper).length;
    content.push({ text: `${g.name} · ${p?.years ?? ""} doğumlu (${groupAgeRange(g.minBirthYear, g.maxBirthYear, today)} yaş)`, style: "h1", ...(i > 0 ? { pageBreak: "before" } : {}) });
    content.push({
      text: [
        p?.slots.length ? p.slots.map((s) => `${s.day} ${s.startTime}–${s.endTime}`).join(" · ") : "Program girilmedi",
        p?.slots.some((s) => s.venue) ? ` · ${[...new Set(p.slots.map((s) => s.venue).filter(Boolean))].join(", ")}` : "",
        p?.coaches.length ? ` · Antrenör: ${p.coaches.join(", ")}` : "",
        `\n${list.length} öğrenci${keepers ? ` · ${keepers} kaleci` : ""}`,
      ].join(""),
      style: "info",
    });
    if (list.length === 0) {
      content.push({ text: "Bu grupta öğrenci yok.", color: MUTED });
      return;
    }
    content.push({
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: [14, ...cols.map((c) => c.width)],
        body: [[th("#", { alignment: "center" }), ...cols.map((c) => th(c.header, c.center ? { alignment: "center" } : {}))], ...list.map((r, n) => [{ text: String(n + 1), alignment: "center", color: MUTED }, ...cols.map((c) => { const v = c.value(r, extras.get(r.id) ?? {}); return c.center && typeof v === "string" ? { text: v, alignment: "center" } : v; })])],
      },
      layout: tableLayout,
    });
  });
  if (content.length === 0) content.push({ text: "Seçilen grup yok.", color: MUTED });
  const title = ROSTER_PRESETS.find((x) => x.key === preset)!.label;
  return render(title, cols.length > 7 ? "landscape" : "portrait", content, today);
}

/* ---------------- Dışa aktar: seçilen sütunlarla liste ---------------- */

const pad = (n: number) => String(n).padStart(2, "0");
/** Durum sözcükleri renkli (renk hep yazıyla birlikte). */
const TONE: Record<string, string> = { Ödenmedi: "#b91c1c", Gecikti: "#b91c1c", Girilmedi: "#b45309", "Sipariş verilecek": "#b45309", "Teslim edilmedi": "#b45309", Ödendi: "#047857", "Teslim edildi": "#047857" };

function cellText(col: ExportColumn, v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  // Tarihler Excel için "İstanbul saati UTC bileşenlerinde" Date olarak gelir
  if (v instanceof Date) return `${pad(v.getUTCDate())}.${pad(v.getUTCMonth() + 1)}.${v.getUTCFullYear()}${col.kind === "datetime" ? ` ${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}` : ""}`;
  if (col.kind === "money") return formatMoney(Number(v));
  if (col.kind === "percent") return `%${v}`;
  if (col.kind === "date" && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) return formatDateTr(String(v));
  if (/Phone$/.test(col.key) && /^0\d{10}$/.test(String(v))) return formatPhone(String(v));
  return String(v);
}

/** "Excel'e aktar" penceresindeki süzgeç ve sütunlarla PDF; grup grup ayrı sayfa seçilebilir. Çok sütunda yatay ve küçük yazı. */
export async function listPdf(data: PreparedExport, title: string, today: string = todayKey()): Promise<Buffer> {
  const { rows, groups, columns, extras, splitByGroup } = data;
  const groupNames = new Map(groups.map((g) => [g.id, g.name]));
  const now = new Date();
  // Excel sütun genişliği (karakter) → nokta; ad sütunu kalan yeri alır
  const fixed = columns.filter((c) => c.key !== "studentFullName").reduce((s, c) => s + c.width * 4.6, 18);
  const landscape = columns.length > 7 || fixed > 400;
  const room = (landscape ? 841.89 : 595.28) - 56 - (columns.some((c) => c.key === "studentFullName") ? 110 : 0);
  const scale = Math.min(1, room / fixed);
  const small = scale < 0.85 || columns.length > 9;
  const widths = [14, ...columns.map((c) => (c.key === "studentFullName" ? "*" : Math.max(24, Math.round(c.width * 4.6 * scale))))];
  const table = (list: Registration[]): Content => ({
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths,
      body: [
        [th("#", { alignment: "center" }), ...columns.map((c) => th(c.header, { fontSize: small ? 7.5 : 8.5 }))],
        ...list.map((r, n) => {
          const base = registrationValues(r, groupNames, now);
          const extra = extras?.get(r.id) ?? {};
          return [
            { text: String(n + 1), alignment: "center", color: MUTED, fontSize: small ? 7.5 : 8.5 },
            ...columns.map((c) => {
              const text = cellText(c, c.computed ? extra[c.key] : base[c.key]);
              return { text: text || "—", color: text ? (TONE[text] ?? INK) : "#c4bbb4", bold: c.key === "studentFullName", fontSize: small ? 7.5 : 8.5 };
            }),
          ];
        }),
      ],
    },
    layout: tableLayout,
  });
  const content: Content[] = [
    { text: title, style: "h1" },
    { text: `${dayLabel(today)} · ${rows.length} öğrenci · ${columns.length} sütun`, style: "info" },
  ];
  if (rows.length === 0) content.push({ text: "Seçilen süzgeçte kayıt yok.", color: MUTED });
  else if (splitByGroup) {
    const buckets = new Map<string, Registration[]>();
    for (const g of groups) buckets.set(g.name, []);
    for (const r of rows) {
      const name = r.groupId ? (groupNames.get(r.groupId) ?? "Grupsuz") : "Grupsuz";
      buckets.set(name, [...(buckets.get(name) ?? []), r]);
    }
    let first = true;
    for (const [name, list] of buckets) {
      if (!list.length) continue;
      content.push({ text: `${name} · ${list.length} öğrenci`, style: "h2", ...(first ? {} : { pageBreak: "before" }) });
      content.push(table(list));
      first = false;
    }
  } else content.push(table(rows));
  return render(title, landscape ? "landscape" : "portrait", content, today);
}

/* ---------------- Forma sipariş / beden listesi ---------------- */

export async function kitSheetPdf(stage: KitStage, today: string = todayKey(), groupId: number | null = null): Promise<Buffer> {
  const sheet = kitSheet(stage, today, groupId);
  const content: Content[] = [
    { text: sheet.title, style: "h1" },
    { text: sheet.subtitle, style: "info" },
  ];
  if (sheet.tables.length === 0) content.push({ text: "Bu listede malzeme yok.", color: MUTED });
  // Adet tabloları yan yana ikişer (forma ve tozluk tek bakışta)
  const blocks = sheet.tables.map((t) => {
    const split = t.keepers > 0;
    return {
      stack: [
        { text: `${t.title} · ${t.total} adet${t.keepers ? ` (${t.keepers} kaleci)` : ""}`, bold: true, fontSize: 11, margin: [0, 0, 0, 4] },
        {
          table: {
            headerRows: 1,
            widths: split ? ["*", 40, 40, 44] : ["*", 50],
            body: [
              [th(t.part === "socks" ? "Numara" : "Beden"), ...(split ? [th("Oyuncu", { alignment: "center" }), th("Kaleci", { alignment: "center" })] : []), th(split ? "Toplam" : "Adet", { alignment: "center" })],
              ...t.rows.map((r) => [
                { text: r.label, bold: true, color: r.size ? INK : "#b45309" },
                ...(split ? [{ text: r.players.length ? String(r.players.length) : "—", alignment: "center", color: r.players.length ? INK : MUTED }, { text: r.keepers.length ? String(r.keepers.length) : "—", alignment: "center", color: r.keepers.length ? INK : MUTED }] : []),
                { text: String(r.players.length + r.keepers.length), alignment: "center", bold: true, fontSize: 11 },
              ]),
              [{ text: "Toplam", bold: true, fillColor: "#f5f5f4" }, ...(split ? [{ text: String(t.total - t.keepers), alignment: "center", bold: true, fillColor: "#f5f5f4" }, { text: String(t.keepers), alignment: "center", bold: true, fillColor: "#f5f5f4" }] : []), { text: String(t.total), alignment: "center", bold: true, fontSize: 11, fillColor: "#f5f5f4" }],
            ],
          },
          layout: tableLayout,
        },
      ],
      margin: [0, 0, 0, 12],
    };
  });
  for (let i = 0; i < blocks.length; i += 2) content.push({ columns: [blocks[i], blocks[i + 1] ?? { text: "" }], columnGap: 16 });

  if (sheet.students.length) {
    content.push({ text: "Öğrenciler", style: "h2", pageBreak: sheet.tables.length > 2 ? "before" : undefined });
    content.push({
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: [14, 30, "*", 44, 14, ...sheet.columns.map(() => 52)],
        body: [
          [th("#", { alignment: "center" }), th("No", { alignment: "center" }), th("Ad Soyad"), th("Grup"), th("K", { alignment: "center" }), ...sheet.columns.map((c) => th(c, { alignment: "center" }))],
          ...sheet.students.map((s, n) => [
            { text: String(n + 1), alignment: "center", color: MUTED },
            { text: s.no ? String(s.no) : "—", alignment: "center" },
            { text: s.name, bold: true },
            s.group,
            { text: s.keeper ? "K" : "", alignment: "center" },
            ...s.cells.map((v) => ({ text: v ?? "—", alignment: "center", bold: Boolean(v && v !== GIVEN && !isMissingCell(v)), color: isMissingCell(v) ? "#b45309" : v === GIVEN ? MUTED : v ? INK : "#c4bbb4" })),
          ]),
        ],
      },
      layout: tableLayout,
    });
    content.push({ text: "K: kaleci (forması ayrı). “Beden yok” / “Numara yok”: siparişten önce panelden tamamlanmalı. Verildi: öğrenciye daha önce verilmiş. —: o malzemesi yok.", fontSize: 8.5, color: MUTED, margin: [0, 6, 0, 0] });
  }
  return render(sheet.title, "portrait", content, today);
}

/* ---------------- Yoklama kağıdı ---------------- */

export async function attendanceSheetPdf(range: DateRange, groupIds: number[] | null, withMarks: boolean, today: string = todayKey()): Promise<Buffer> {
  const sheets = attendanceSheets(range, groupIds, withMarks, today);
  const content: Content[] = [];
  const pages = sheets.flatMap(sh => {
    const chunks = Math.max(1, Math.ceil(sh.sessions.length / 14));
    return Array.from({ length: chunks }, (_, i) => ({ ...sh, sessions: sh.sessions.slice(i * 14, (i + 1) * 14) }));
  });
  pages.forEach((sh, i) => {
    content.push({ text: `${sh.group} · ${sh.years} doğumlu · ${dateRangeLabel(range)} yoklaması`, style: "h1", ...(i > 0 ? { pageBreak: "before" } : {}) });
    content.push({ text: [sh.slots || "Program girilmedi", sh.coaches.length ? ` · Antrenör: ${sh.coaches.join(", ")}` : "", ` · ${sh.students.length} öğrenci`].join(""), style: "info" });
    const blanks = 3;
    const rows = [...sh.students, ...Array.from({ length: blanks }, () => null)];
    const dateCols = sh.sessions.length ? sh.sessions : [];
    content.push({
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: [14, 28, "*", 12, ...dateCols.map(() => 27), 30],
        body: [
          [
            th("#", { alignment: "center" }),
            th("No", { alignment: "center" }),
            th("Ad Soyad"),
            th("K", { alignment: "center" }),
            ...dateCols.map((s) => {
              const [d, w] = sessionHeader(s.date).split(" ");
              return th(`${d}\n${w}`, { alignment: "center", fontSize: 7.5 });
            }),
            th("Geldi", { alignment: "center" }),
          ],
          ...rows.map((st, n) => [
            { text: String(n + 1), alignment: "center", color: MUTED },
            { text: st?.no ? String(st.no) : "", alignment: "center" },
            { text: st?.name ?? " ", bold: true, margin: [0, 3, 0, 3] },
            { text: st?.keeper ? "K" : "", alignment: "center" },
            ...dateCols.map((s) => {
              const m = st?.marks[s.id];
              return { text: m ? MARK_SYMBOL[m] : "", alignment: "center", bold: true, color: m === "absent" ? "#b91c1c" : m === "present" ? "#047857" : INK };
            }),
            { text: st && withMarks && sh.sessions.some((s) => s.date <= today) ? String(sh.sessions.filter((s) => st.marks[s.id] === "present").length) : "", alignment: "center" },
          ]),
        ],
      },
      layout: tableLayout,
    });
    if (dateCols.length === 0) content.push({ text: "Bu aralıkta antrenman görünmüyor; programı kontrol edin.", color: MUTED, margin: [0, 6, 0, 0] });
    content.push({
      margin: [0, 10, 0, 0],
      columns: [
        { text: MARK_LEGEND, fontSize: 8.5, color: MUTED },
        { text: "Antrenör imzası: ______________________", alignment: "right", fontSize: 9 },
      ],
    });
  });
  if (content.length === 0) content.push({ text: "Seçilen grup yok.", color: MUTED });
  return render(`Yoklama kağıdı · ${dateRangeLabel(range)}`, "landscape", content, today);
}
