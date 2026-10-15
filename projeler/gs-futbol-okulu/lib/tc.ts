/**
 * T.C. Kimlik Numarası doğrulaması.
 * - 11 rakam, ilk rakam 0 olamaz
 * - 10. hane: ((1,3,5,7,9. hanelerin toplamı × 7) − (2,4,6,8. hanelerin toplamı)) mod 10
 * - 11. hane: ilk 10 hanenin toplamı mod 10
 */
export function isValidTcKimlikNo(value: string): boolean {
  if (!/^[1-9][0-9]{10}$/.test(value)) return false;
  const d = value.split("").map((ch) => Number(ch));
  const oddSum = d[0]! + d[2]! + d[4]! + d[6]! + d[8]!;
  const evenSum = d[1]! + d[3]! + d[5]! + d[7]!;
  const tenth = (((oddSum * 7 - evenSum) % 10) + 10) % 10;
  if (tenth !== d[9]) return false;
  const first10Sum = d.slice(0, 10).reduce((acc, n) => acc + n, 0);
  return first10Sum % 10 === d[10];
}

/** Sadece rakamları bırakır ve 11 haneyle sınırlar (input maskesi için). */
export function sanitizeTcInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/** 11 hane ve 0 ile başlamıyor (kontrol hanelerine bakmaz). */
export function isTcFormat(value: string): boolean {
  return /^[1-9][0-9]{10}$/.test(value);
}

/** Biçim doğru ama kontrol haneleri tutmuyorsa hangi hanenin ne olması gerektiği. */
export function tcCheckProblem(value: string): string | null {
  if (!isTcFormat(value) || isValidTcKimlikNo(value)) return null;
  const d = value.split("").map(Number);
  const tenth = ((((d[0]! + d[2]! + d[4]! + d[6]! + d[8]!) * 7 - (d[1]! + d[3]! + d[5]! + d[7]!)) % 10) + 10) % 10;
  if (tenth !== d[9]) return `10. hane ${tenth} olmalıydı, ${d[9]} yazılmış`;
  return `11. hane ${d.slice(0, 10).reduce((a, n) => a + n, 0) % 10} olmalıydı, ${d[10]} yazılmış`;
}

/** Yazım hatası tahmini: yan yana iki rakamın yeri değişince geçerli olan numaralar. */
export function tcSwapSuggestions(value: string): string[] {
  if (!isTcFormat(value) || isValidTcKimlikNo(value)) return [];
  const out = new Set<string>();
  for (let i = 0; i < 10; i++) {
    const t = value.slice(0, i) + value[i + 1] + value[i] + value.slice(i + 2);
    if (t !== value && isValidTcKimlikNo(t)) out.add(t);
  }
  return [...out].slice(0, 4);
}

