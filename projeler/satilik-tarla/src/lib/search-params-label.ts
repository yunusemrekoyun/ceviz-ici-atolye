// Kayıtlı arama paramlarını insan-okur çiplere çevirir (hesap sayfası +
// günlük özet e-postası aynı etiketleri kullanır). Client-safe.
import { IMAR_LABELS, TAPU_LABELS, YOL_LABELS } from './mappers';

export function paramsToChips(params: Record<string, string>): string[] {
  const chips: string[] = [];
  if (params.ilce) chips.push(params.ilce);
  if (params.tur) chips.push(params.tur);
  if (params.q) chips.push(`“${params.q}”`);
  if (params.imar) chips.push(IMAR_LABELS[params.imar] ?? params.imar);
  if (params.tapu) chips.push(`${TAPU_LABELS[params.tapu] ?? params.tapu} tapu`);
  if (params.yol) chips.push(YOL_LABELS[params.yol] ?? params.yol);
  if (params.su) chips.push('Su var');
  if (params.elektrik) chips.push('Elektrik var');
  if (params.minFiyat || params.maxFiyat) {
    chips.push(
      params.minFiyat && params.maxFiyat
        ? `${params.minFiyat}–${params.maxFiyat} ₺`
        : params.minFiyat
          ? `≥ ${params.minFiyat} ₺`
          : `≤ ${params.maxFiyat} ₺`,
    );
  }
  if (params.minAlan || params.maxAlan) {
    chips.push(
      params.minAlan && params.maxAlan
        ? `${params.minAlan}–${params.maxAlan} m²`
        : params.minAlan
          ? `≥ ${params.minAlan} m²`
          : `≤ ${params.maxAlan} m²`,
    );
  }
  return chips;
}

export function paramsToQuery(params: Record<string, string>): string {
  const p = new URLSearchParams(params);
  return `/ilanlar${p.size ? `?${p.toString()}` : ''}`;
}
