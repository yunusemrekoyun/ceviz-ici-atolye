import type { Registration } from "@/lib/db/schema";
import { formatDateTr, resolveContactParent } from "@/lib/format";
import { toInternationalPhone } from "@/lib/phone";

export const VCF_FILE_NAME = "galatasaray-futbol-okulu-kisiler.vcf";
const CRLF = "\r\n";
const MAX_LINE_OCTETS = 75;

/** vCard 3.0 metin değeri kaçışları (RFC 2426 §2.4.2 + Apple uyumu). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,");
}

/** Satırı 75 oktette katlar; UTF-8 çok baytlı karakterleri bölmez. Devam satırları tek boşlukla başlar. */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= MAX_LINE_OCTETS) return line;

  const out: string[] = [];
  let current = "";
  let currentBytes = 0;
  let limit = MAX_LINE_OCTETS;
  for (const ch of line) {
    const chBytes = encoder.encode(ch).length;
    if (currentBytes + chBytes > limit) {
      out.push(current);
      current = " " + ch;
      currentBytes = 1 + chBytes;
      limit = MAX_LINE_OCTETS;
    } else {
      current += ch;
      currentBytes += chBytes;
    }
  }
  if (current) out.push(current);
  return out.join(CRLF);
}

type PhoneEntry = { label: string; number: string };

function buildPhoneEntries(reg: Registration): PhoneEntry[] {
  const entries: PhoneEntry[] = [];
  const seen = new Set<string>();
  const push = (label: string, number: string | null | undefined) => {
    if (!number) return;
    // Aynı numara birden fazla rolde ise etiketleri birleştir (Apple aynı numarayı iki kez göstermesin).
    if (seen.has(number)) {
      const existing = entries.find((e) => e.number === number);
      if (existing && !existing.label.split(" / ").includes(label)) existing.label += ` / ${label}`;
      return;
    }
    seen.add(number);
    entries.push({ label, number });
  };

  push("Öğrenci", reg.studentPhone);
  push("Anne", reg.motherPhone);
  push("Baba", reg.fatherPhone);
  if (reg.contactParentType === "diger") {
    push(reg.contactParentFullName ? `İletişim Velisi (${reg.contactParentFullName})` : "İletişim Velisi", reg.contactParentPhone);
  }
  push(
    reg.emergencyRelation ? `Acil Durum (${reg.emergencyRelation})` : "Acil Durum",
    reg.emergencyPhone,
  );
  return entries;
}

function buildNote(reg: Registration): string {
  const contact = resolveContactParent(reg);
  const lines = [
    "Galatasaray Kütahya Futbol Okulu",
    `Öğrenci: ${reg.studentFullName}`,
    `Doğum Tarihi: ${formatDateTr(reg.birthDate)}`,
    `Kan Grubu: ${reg.bloodGroup}`,
  ];
  if (reg.motherFullName) lines.push(`Anne: ${reg.motherFullName}`);
  if (reg.fatherFullName) lines.push(`Baba: ${reg.fatherFullName}`);
  lines.push(
    contact.fullName ? `İletişim Velisi: ${contact.typeLabel} - ${contact.fullName}` : `İletişim Velisi: ${contact.typeLabel}`,
  );
  lines.push(`Acil Durum: ${reg.emergencyFullName} (${reg.emergencyRelation})`);
  return lines.join("\n");
}

export function buildVCard(reg: Registration, revDate: Date): string {
  const displayName = `GS Futbol - ${reg.studentFullName}`;
  const lines: string[] = [];
  lines.push("BEGIN:VCARD");
  lines.push("VERSION:3.0");
  lines.push("PRODID:-//Galatasaray Kutahya Futbol Okulu//Kayit Sistemi//TR");
  // Tüm ad "soyad" bileşenine yazılır: Apple'da görüntü adı ve sıralama "GS Futbol - ..." olur.
  lines.push(`N:${escapeText(displayName)};;;;`);
  lines.push(`FN:${escapeText(displayName)}`);
  lines.push(`ORG:${escapeText("Galatasaray Kütahya Futbol Okulu")}`);

  buildPhoneEntries(reg).forEach((entry, i) => {
    const item = `item${i + 1}`;
    // itemN.TEL + itemN.X-ABLabel: Apple Contacts'ın kendi export formatı; özel etiket bu şekilde gösterilir.
    lines.push(`${item}.TEL;type=CELL;type=VOICE${i === 0 ? ";type=pref" : ""}:${toInternationalPhone(entry.number)}`);
    lines.push(`${item}.X-ABLabel:${escapeText(entry.label)}`);
  });

  if (reg.email) lines.push(`EMAIL;type=INTERNET;type=HOME;type=pref:${escapeText(reg.email)}`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(reg.birthDate)) lines.push(`BDAY:${reg.birthDate}`);
  lines.push(`NOTE:${escapeText(buildNote(reg))}`);
  lines.push(`CATEGORIES:${escapeText("GS Futbol Okulu")}`);
  lines.push(`REV:${revDate.toISOString().replace(/\.\d{3}Z$/, "Z")}`);
  lines.push("END:VCARD");

  return lines.map(foldLine).join(CRLF) + CRLF;
}

export function buildRegistrationsVcf(rows: Registration[], now: Date = new Date()): string {
  return rows.map((reg) => buildVCard(reg, now)).join("");
}
