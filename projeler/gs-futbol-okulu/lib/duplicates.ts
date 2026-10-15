import type { Registration } from "@/lib/db/schema";
import { normalizeForSearch } from "@/lib/search";

const phoneKey = (p: string | null | undefined) => {
  const d = (p ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
};

function phonesOf(r: Registration): string[] {
  return [r.studentPhone, r.motherPhone, r.fatherPhone, r.contactParentPhone, r.emergencyPhone].map(phoneKey).filter((x): x is string => Boolean(x));
}

function nameOf(r: Registration): string | null {
  if (/^isimsiz/i.test(normalizeForSearch(r.studentFullName))) return null;
  return normalizeForSearch(r.studentFullName);
}

function ignored(r: Registration): number[] {
  try {
    const v = JSON.parse(r.notDuplicateOf ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x)) : [];
  } catch {
    return [];
  }
}

/**
 * Olası tekrar kayıtlar: aynı ad soyad, ya da ortak telefon + aynı ilk ad (ya da birinin adı bilinmiyor).
 * Kardeşler ortak telefonu paylaşır ama ilk adları farklıdır; onlar eşleşmez.
 */
export function duplicateMap(regs: Registration[]): Map<number, number[]> {
  const out = new Map<number, number[]>();
  const add = (a: Registration, b: Registration) => {
    if (a.id === b.id || ignored(a).includes(b.id) || ignored(b).includes(a.id)) return;
    if (!(out.get(a.id) ?? []).includes(b.id)) out.set(a.id, [...(out.get(a.id) ?? []), b.id]);
    if (!(out.get(b.id) ?? []).includes(a.id)) out.set(b.id, [...(out.get(b.id) ?? []), a.id]);
  };
  const byPhone = new Map<string, Registration[]>();
  const byName = new Map<string, Registration[]>();
  for (const r of regs) {
    for (const p of new Set(phonesOf(r))) byPhone.set(p, [...(byPhone.get(p) ?? []), r]);
    const n = nameOf(r);
    if (n) byName.set(n, [...(byName.get(n) ?? []), r]);
  }
  for (const list of byName.values()) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) add(list[i]!, list[j]!);
  for (const list of byPhone.values()) {
    if (list.length > 6) continue; // aynı numara çok kayıtta: toplu/okul numarası, anlamsız
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const a = nameOf(list[i]!);
        const b = nameOf(list[j]!);
        if (!a || !b || a.split(" ")[0] === b.split(" ")[0]) add(list[i]!, list[j]!);
      }
  }
  return out;
}
