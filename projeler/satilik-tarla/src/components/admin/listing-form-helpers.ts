// Eski panelden taşınan metin↔dizi dönüştürücüleri: görseller satır satır,
// etiketler virgülle, "Arazi bilgileri" satırları "Etiket | Değer" biçiminde.
export const tagsToStr = (a: string[]) => a.join(', ');
export const strToTags = (s: string) =>
  s
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

export const linesToStr = (a: string[]) => a.join('\n');
export const strToLines = (s: string) =>
  s
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);

export type Spec = { label: string; value: string };

export const specsToStr = (specs: Spec[]) => specs.map((s) => `${s.label} | ${s.value}`).join('\n');
export const strToSpecs = (s: string): Spec[] =>
  s
    .split('\n')
    .map((line) => line.split('|'))
    .filter((p) => p[0] && p[0].trim())
    .map((p) => ({ label: (p[0] || '').trim(), value: (p[1] || '').trim() }));
