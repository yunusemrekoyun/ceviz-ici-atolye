import ExcelJS from "exceljs";
import type { AgeGroup, Registration } from "@/lib/db/schema";
import { statusLabel } from "@/lib/registration-status";
import { ALL_COLUMNS, type ExportColumn } from "@/lib/export/columns";

const ORDER_COLUMN: ExportColumn = { key: "order", header: "Sıra No", width: 9 };
import { computeAge, contactParentTypeLabel, isoDateToDate, resolveContactParent } from "@/lib/format";

const TEXT_FORMAT = "@";
const DATE_FORMAT = "dd.mm.yyyy";
const DATETIME_FORMAT = "dd.mm.yyyy hh:mm";

/**
 * ISO zaman damgasını, Excel'de Türkiye saatiyle görünecek şekilde "UTC bileşenleri = İstanbul yerel bileşenleri"
 * olan bir Date'e çevirir (exceljs tarihleri UTC bileşenleriyle yazar).
 */
function toIstanbulExcelDate(iso: string): Date | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const hour = get("hour") === 24 ? 0 : get("hour");
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second")));
}

export function buildXlsxFileName(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `galatasaray-futbol-okulu-kayitlari-${yyyy}-${mm}-${dd}.xlsx`;
}

const MONEY_FORMAT = '#,##0.00 "₺"';
const PERCENT_FORMAT = '0"%"';

export type XlsxOptions = {
  /** Hesaplanan sütunların değerleri (lib/export/extras.ts). */
  extras?: Map<number, Record<string, string | number | null>>;
  /** Her grup ayrı sayfa (grupsuzlar en sonda). */
  splitByGroup?: boolean;
};

export async function buildRegistrationsXlsx(
  rows: Registration[],
  groups: Pick<AgeGroup, "id" | "name">[] = [],
  columns: ExportColumn[] = ALL_COLUMNS,
  options: XlsxOptions = {},
): Promise<Buffer> {
  const groupNames = new Map(groups.map((g) => [g.id, g.name]));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GS Kütahya Futbol Okulu Kayıt Sistemi";
  workbook.created = new Date();
  if (options.splitByGroup) {
    const buckets = new Map<string, Registration[]>();
    for (const g of groups) buckets.set(g.name, []);
    for (const r of rows) {
      const name = r.groupId ? (groupNames.get(r.groupId) ?? "Grupsuz") : "Grupsuz";
      buckets.set(name, [...(buckets.get(name) ?? []), r]);
    }
    for (const [name, list] of buckets) if (list.length) addRegistrationsSheet(workbook, name.slice(0, 31), list, groupNames, columns, options);
    if (workbook.worksheets.length === 0) addRegistrationsSheet(workbook, "Kayıtlar", [], groupNames, columns, options);
  } else addRegistrationsSheet(workbook, "Kayıtlar", rows, groupNames, columns, options);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function addRegistrationsSheet(workbook: ExcelJS.Workbook, name: string, rows: Registration[], groupNames: Map<number, string>, columns: ExportColumn[], options: XlsxOptions): void {
  const COLUMNS = [ORDER_COLUMN, ...columns];
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { orientation: columns.length > 8 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  // Metin sütunları: TC ve telefonlar hiçbir koşulda sayıya dönüşmesin.
  for (const col of COLUMNS) {
    const column = sheet.getColumn(col.key);
    if (col.kind === "text") column.numFmt = TEXT_FORMAT;
    if (col.kind === "date") column.numFmt = DATE_FORMAT;
    if (col.kind === "datetime") column.numFmt = DATETIME_FORMAT;
    if (col.kind === "money") column.numFmt = MONEY_FORMAT;
    if (col.kind === "percent") column.numFmt = PERCENT_FORMAT;
    column.alignment = { vertical: "top", wrapText: col.key === "homeAddress" };
  }

  const now = new Date();
  rows.forEach((reg, index) => {
    const extra = options.extras?.get(reg.id) ?? {};
    const computed: Record<string, unknown> = {};
    for (const col of columns) {
      if (!col.computed) continue;
      const v = extra[col.key];
      computed[col.key] = v === null || v === undefined ? "" : col.kind === "money" ? Number(v) / 100 : col.kind === "date" ? (isoDateToDate(String(v)) ?? v) : v;
    }
    const row = sheet.addRow({ ...computed, order: index + 1, ...registrationValues(reg, groupNames, now) });

    // Hücre bazında da metin formatını sabitle (sütun formatı bazı istemcilerde yeterli olmayabilir).
    for (const col of COLUMNS) {
      if (col.kind === "text") {
        const cell = row.getCell(col.key);
        cell.numFmt = TEXT_FORMAT;
        cell.value = cell.value === null || cell.value === undefined ? "" : String(cell.value);
      }
    }
  });

  // Başlık satırı
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA90432" } };
  header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  header.height = 32;
  header.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, rows.length + 1), column: COLUMNS.length },
  };
}

/** Kaydın kayıttan gelen sütun değerleri (Excel ve PDF ortak; tarihler Date, Excel'de İstanbul saatiyle). */
export function registrationValues(reg: Registration, groupNames: Map<number, string>, now: Date = new Date()): Record<string, unknown> {
  const contact = resolveContactParent(reg);
  return {
    studentNo: reg.studentNo ?? "",
    studentTc: reg.studentTc ?? "",
    studentFullName: reg.studentFullName,
    birthDate: isoDateToDate(reg.birthDate) ?? reg.birthDate,
    age: computeAge(reg.birthDate, now) ?? "",
    homeAddress: reg.homeAddress,
    studentPhone: reg.studentPhone,
    bloodGroup: reg.bloodGroup,
    email: reg.email ?? "",
    fatherFullName: reg.fatherFullName ?? "",
    fatherTc: reg.fatherTc ?? "",
    fatherPhone: reg.fatherPhone ?? "",
    motherFullName: reg.motherFullName ?? "",
    motherTc: reg.motherTc ?? "",
    motherPhone: reg.motherPhone ?? "",
    contactParentType: contactParentTypeLabel(reg.contactParentType),
    contactParentFullName: contact.fullName,
    contactParentPhone: contact.phone,
    emergencyFullName: reg.emergencyFullName,
    emergencyRelation: reg.emergencyRelation,
    emergencyPhone: reg.emergencyPhone,
    status: statusLabel(reg.status),
    appointmentAt: reg.appointmentAt ? (toIstanbulExcelDate(reg.appointmentAt) ?? reg.appointmentAt) : "",
    group: reg.groupId ? (groupNames.get(reg.groupId) ?? "") : "",
    isGoalkeeper: reg.isGoalkeeper ? "Evet" : "",
    heightCm: reg.heightCm ?? "",
    weightKg: reg.weightKg ?? "",
    enrolledAt: reg.enrolledAt ? (toIstanbulExcelDate(reg.enrolledAt) ?? reg.enrolledAt) : "",
    adminNote: reg.adminNote ?? "",
    createdAt: toIstanbulExcelDate(reg.createdAt) ?? reg.createdAt,
    updatedAt: toIstanbulExcelDate(reg.updatedAt) ?? reg.updatedAt,
  };
}
