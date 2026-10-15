import ExcelJS from "exceljs";
import { eq } from "drizzle-orm";
import { listAgeGroups } from "@/lib/age-groups-db";
import { todayKey } from "@/lib/billing";
import { getDb } from "@/lib/db";
import { registrations } from "@/lib/db/schema";
import { computeAge, isoDateToDate, resolveContactParent } from "@/lib/format";

/**
 * Sahada kullanılan yoklama listesi (Excel): okulun kendi şablonunun birebir aynısı (sütun genişlikleri, satır
 * yükseklikleri, başlık rengi, yatay A4 tek sayfa). Her grup ayrı sayfa; öğrenci az olsa da 21 satır, fazlaysa
 * satır eklenir. Yoklama, Aidat ve Forma sütunları elle doldurulmak üzere boş.
 */

export const LIST_ROWS = 21;

const COLUMNS: { header: string; width: number; numFmt?: string; plain?: boolean }[] = [
  { header: "  ", width: 9 },
  { header: "Öğrenci No", width: 10 },
  { header: "Öğrenci Ad Soyad", width: 28 },
  { header: "Doğum Tarihi", width: 14, numFmt: "dd.mm.yyyy" },
  { header: "Yaş", width: 7 },
  { header: "İletişim Velisi Ad Soyad", width: 26 },
  { header: "İletişim Velisi Telefon", width: 22, numFmt: "@" },
  { header: "Grup", width: 14 },
  { header: "Kaleci Mi", width: 20.5703125 },
  { header: "Yoklama", width: 14, plain: true },
  { header: "Aidat", width: 68.140625, plain: true },
  { header: "Forma", width: 73, plain: true },
];

const BODY_FONT: Partial<ExcelJS.Font> = { size: 11, color: { theme: 1 } as ExcelJS.Color, name: "Calibri", family: 2, scheme: "minor" };
const HEAD_FONT: Partial<ExcelJS.Font> = { bold: true, size: 11, color: { argb: "FFFFFFFF" }, name: "Calibri" };
const HEAD_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA90432" } };
const HEAD_ALIGN: Partial<ExcelJS.Alignment> = { horizontal: "center", vertical: "middle", wrapText: true };
const THIN: Partial<ExcelJS.Border> = { style: "thin" };

/** Excel sayfa adı: yasak karakterler yok, en fazla 31 karakter, tekrar etmez. */
function sheetName(raw: string, used: Set<string>): string {
  const base = raw.replace(/[\\/?*[\]:]/g, "-").trim().slice(0, 31) || "Grup";
  let name = base;
  for (let i = 2; used.has(name.toLocaleLowerCase("tr-TR")); i++) name = `${base.slice(0, 28)} ${i}`;
  used.add(name.toLocaleLowerCase("tr-TR"));
  return name;
}

export async function attendanceListXlsx(groupIds: number[] | null, today: string = todayKey()): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "GS Kütahya Futbol Okulu Kayıt Sistemi";
  wb.created = new Date();
  const now = new Date(`${today}T12:00:00+03:00`);
  const all = listAgeGroups();
  const groups = all.filter((g) => !groupIds || groupIds.includes(g.id));
  const enrolled = getDb().select().from(registrations).where(eq(registrations.status, "enrolled")).all();
  const used = new Set<string>();

  const sheets: { name: string; group: string; list: typeof enrolled }[] = groups.map((g) => ({ name: g.name, group: g.name, list: enrolled.filter((r) => r.groupId === g.id) }));
  // Grubu atanmamış öğrenci varsa (tüm gruplar istendiğinde) ayrı sayfa
  const ungrouped = enrolled.filter((r) => r.groupId === null || !all.some((g) => g.id === r.groupId));
  if (!groupIds && ungrouped.length) sheets.push({ name: "Grupsuz", group: "", list: ungrouped });

  for (const s of sheets) {
    const list = [...s.list].sort((a, b) => a.studentFullName.localeCompare(b.studentFullName, "tr"));
    const total = Math.max(LIST_ROWS, list.length);
    const ws = wb.addWorksheet(sheetName(s.name, used), {
      properties: { defaultRowHeight: 15 },
      views: [{ state: "frozen", xSplit: 0, ySplit: 1, topLeftCell: "A2", activeCell: "A2" }],
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
        horizontalCentered: true,
        showGridLines: true,
        showRowColHeaders: false,
        printArea: `A1:L${total + 1}`,
      },
    });
    ws.columns = [
      ...COLUMNS.map((c) => ({ width: c.width, style: c.plain ? {} : { font: BODY_FONT, alignment: { vertical: "top" as const }, ...(c.numFmt ? { numFmt: c.numFmt } : {}) } })),
      { width: 0, hidden: true },
    ];

    const head = ws.getRow(1);
    head.height = 32.1;
    for (let i = 1; i <= 13; i++) {
      const cell = head.getCell(i);
      if (i <= COLUMNS.length) cell.value = COLUMNS[i - 1]!.header;
      cell.font = HEAD_FONT;
      cell.fill = HEAD_FILL;
      cell.alignment = HEAD_ALIGN;
      if (i <= 9) cell.border = { left: THIN, right: THIN, top: THIN, bottom: THIN };
    }

    for (let i = 0; i < total; i++) {
      const row = ws.getRow(i + 2);
      row.height = 48.75;
      const r = list[i];
      if (r) {
        const contact = resolveContactParent(r);
        row.getCell(1).value = i + 1;
        row.getCell(2).value = r.studentNo ?? null;
        row.getCell(3).value = r.studentFullName;
        row.getCell(4).value = r.birthDate ? (isoDateToDate(r.birthDate) ?? null) : null;
        row.getCell(5).value = computeAge(r.birthDate, now) ?? null;
        row.getCell(6).value = contact.fullName || null;
        row.getCell(7).value = contact.phone || null;
        row.getCell(8).value = s.group || null;
        row.getCell(9).value = r.isGoalkeeper ? "Evet" : null;
      }
      // Boş satırlarda da hücre biçimi aynı kalsın (sonradan elle yazılınca)
      for (let c = 1; c <= 9; c++) {
        const cell = row.getCell(c);
        cell.font = BODY_FONT;
        cell.alignment = { vertical: "top" };
        const fmt = COLUMNS[c - 1]!.numFmt;
        if (fmt) cell.numFmt = fmt;
      }
    }
    ws.autoFilter = `A1:I${Math.max(list.length, 1) + 1}`;
  }
  if (wb.worksheets.length === 0) wb.addWorksheet("Yoklama").getCell("A1").value = "Seçilen grup yok.";
  return Buffer.from(await wb.xlsx.writeBuffer());
}
