import ExcelJS from "exceljs";
import { listAgeGroups } from "@/lib/age-groups-db";
import { todayKey } from "@/lib/billing";
import { dayLabel } from "@/lib/billing-shared";
import { listOrders, type OrderRow } from "@/lib/equipment";
import { KIT_STAGES, kitTables, shirtLabel, type KitStage, type KitTable } from "@/lib/equipment-shared";

/**
 * Forma sipariş / beden listesi (PDF ve Excel ortak verisi): ürün ürün bedene göre adetler (kaleci ayrı) ve öğrenci
 * öğrenci liste. Yalnız okulda kayıtlı öğrenciler.
 */

/** Öğrenci listesinde eksik beden / numara (turuncu yazılır). */
export const MISSING = { main: "Beden yok", socks: "Numara yok" } as const;
export const isMissingCell = (v: string | null) => v === MISSING.main || v === MISSING.socks;
/** Listede başka bir malzemesi için yer alan öğrencinin bu malzemesi zaten verilmişse. */
export const GIVEN = "Verildi";

export const KIT_SHEET_TITLE: Record<KitStage, string> = { to_order: "Forma sipariş listesi", open: "Teslim edilmeyen formalar", all: "Forma beden listesi" };

export type KitSheetStudent = { no: number | null; name: string; group: string; keeper: boolean; cells: (string | null)[] };
export type KitSheet = { stage: KitStage; title: string; subtitle: string; tables: KitTable<OrderRow>[]; columns: string[]; students: KitSheetStudent[] };

/** Öğrenci listesinde sütun adı: "Forma ve şort" → "Forma". */
const shortTitle = (t: KitTable) => (t.part === "socks" ? "Tozluk" : t.title === "Forma ve şort" ? "Forma" : t.title);

/** groupId verilirse yalnız o grubun öğrencileri (sahada dağıtım listesi). */
export function kitSheet(stage: KitStage, today: string = todayKey(), groupId: number | null = null): KitSheet {
  const orders = listOrders().filter((o) => o.studentStatus === "enrolled" && (groupId === null || o.groupId === groupId));
  const groups = listAgeGroups();
  const groupName = groupId !== null ? (groups.find((g) => g.id === groupId)?.name ?? null) : null;
  const tables = kitTables(orders, stage);
  const groupOrder = new Map(groups.map((g, i) => [g.id, i]));
  const students = new Map<number, KitSheetStudent & { groupIndex: number }>();
  tables.forEach((t, col) => {
    for (const o of t.orders) {
      const s = students.get(o.registrationId) ?? { no: o.studentNo, name: o.studentName, group: o.groupName ?? "Grupsuz", keeper: o.isGoalkeeper, cells: tables.map(() => null), groupIndex: o.groupId !== null ? (groupOrder.get(o.groupId) ?? 999) : 999 };
      const size = t.part === "socks" ? o.sockSize : shirtLabel(o.size);
      s.cells[col] = size ?? (t.part === "socks" ? MISSING.socks : MISSING.main);
      students.set(o.registrationId, s);
    }
  });
  // Tabloya girmeyen malzemesi verilmişse "Verildi" (ör. teslim edilmeyenlerde forması verilmiş, tozluğu bekleyen)
  for (const [regId, s] of students)
    tables.forEach((t, col) => {
      if (s.cells[col] !== null) return;
      const o = orders.find((x) => x.registrationId === regId && x.itemId === t.itemId);
      if (o && (t.part === "socks" ? o.sockDelivery === "delivered" : o.owned || o.delivery === "delivered")) s.cells[col] = GIVEN;
    });
  const stageLabel = KIT_STAGES.find((s) => s.key === stage)!.label;
  return {
    stage,
    title: `${KIT_SHEET_TITLE[stage]}${groupName ? ` · ${groupName}` : ""}`,
    subtitle: `${dayLabel(today)} · ${stageLabel.toLocaleLowerCase("tr-TR")} · ${students.size} öğrenci`,
    tables,
    columns: tables.map(shortTitle),
    students: [...students.values()].sort((a, b) => a.groupIndex - b.groupIndex || a.name.localeCompare(b.name, "tr")),
  };
}

const HEAD_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" } };
const HEAD_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA90432" } };
const TOTAL_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F4" } };
const THIN: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFD6D3D1" } };
const BOX = { left: THIN, right: THIN, top: THIN, bottom: THIN };

export async function kitSheetXlsx(stage: KitStage, today: string = todayKey(), groupId: number | null = null): Promise<Buffer> {
  const sheet = kitSheet(stage, today, groupId);
  const wb = new ExcelJS.Workbook();
  wb.creator = "GS Kütahya Futbol Okulu Kayıt Sistemi";
  wb.created = new Date();

  // 1. Bedenler: her ürün için beden × oyuncu / kaleci / toplam
  const ws = wb.addWorksheet("Bedenler", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.columns = [{ width: 22 }, { width: 11 }, { width: 11 }, { width: 11 }];
  ws.addRow([sheet.title]).font = { bold: true, size: 14 };
  ws.addRow([sheet.subtitle]).font = { color: { argb: "FF6B6560" } };
  for (const t of sheet.tables) {
    ws.addRow([]);
    ws.addRow([`${t.title} · ${t.total} adet${t.keepers ? ` (${t.keepers} kaleci)` : ""}`]).font = { bold: true, size: 12 };
    const head = ws.addRow([t.part === "socks" ? "Numara" : "Beden", "Oyuncu", "Kaleci", "Toplam"]);
    head.eachCell((c, col) => {
      c.font = HEAD_FONT;
      c.fill = HEAD_FILL;
      c.border = BOX;
      c.alignment = { horizontal: col === 1 ? "left" : "center" };
    });
    for (const r of t.rows) {
      const row = ws.addRow([r.label, r.players.length || null, r.keepers.length || null, r.players.length + r.keepers.length]);
      row.eachCell({ includeEmpty: true }, (c, col) => {
        c.border = BOX;
        if (col > 1) c.alignment = { horizontal: "center" };
      });
      if (!r.size) row.getCell(1).font = { color: { argb: "FFB45309" }, bold: true };
    }
    const total = ws.addRow(["Toplam", t.total - t.keepers, t.keepers, t.total]);
    total.eachCell((c, col) => {
      c.font = { bold: true };
      c.fill = TOTAL_FILL;
      c.border = BOX;
      if (col > 1) c.alignment = { horizontal: "center" };
    });
  }
  if (sheet.tables.length === 0) ws.addRow(["Bu listede malzeme yok."]);

  // 2. Liste: öğrenci başına bedenler (gruba ve ada göre)
  const list = wb.addWorksheet("Öğrenciler", { views: [{ state: "frozen", ySplit: 1 }], pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  list.columns = [{ width: 8 }, { width: 28 }, { width: 12 }, { width: 8 }, ...sheet.columns.map(() => ({ width: 13 }))];
  const head = list.addRow(["No", "Ad Soyad", "Grup", "Kaleci", ...sheet.columns]);
  head.eachCell((c) => {
    c.font = HEAD_FONT;
    c.fill = HEAD_FILL;
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  for (const s of sheet.students) {
    const row = list.addRow([s.no, s.name, s.group, s.keeper ? "Evet" : null, ...s.cells]);
    s.cells.forEach((v, i) => {
      const c = row.getCell(5 + i);
      c.alignment = { horizontal: "center" };
      if (isMissingCell(v)) c.font = { color: { argb: "FFB45309" }, bold: true };
      else if (v === GIVEN) c.font = { color: { argb: "FF6B6560" }, italic: true };
    });
  }
  list.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(sheet.students.length, 1) + 1, column: 4 + sheet.columns.length } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
