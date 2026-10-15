// "Etiket | Değer" satırlarından yapısal filtre alanlarını türetir (seed +
// geçmiş kayıt backfill'i). Admin formu yapısal alanları doğrudan girer;
// bu türetme yalnız serbest metinden makul varsayılanlar çıkarmak içindir.
import type { ImarDurumu, TapuDurumu, YolDurumu } from '@prisma/client';

type Spec = { label: string; value: string };

const norm = (s: string) => s.toLocaleLowerCase('tr-TR');

export function deriveStructured(specs: Spec[]): {
  imarDurumu: ImarDurumu | null;
  yolDurumu: YolDurumu | null;
  tapuDurumu: TapuDurumu | null;
  suVar: boolean;
  elektrikVar: boolean;
} {
  const find = (key: string) => specs.find((s) => norm(s.label).includes(key))?.value ?? '';

  const imarRaw = norm(find('imar'));
  const imarDurumu: ImarDurumu | null = !imarRaw
    ? null
    : imarRaw.includes('konut')
      ? 'konutImarli'
      : imarRaw.includes('köy')
        ? 'koyYerlesik'
        : imarRaw.includes('sanayi') || imarRaw.includes('ticari')
          ? 'sanayiTicari'
          : imarRaw.includes('tarla') || imarRaw.includes('imarsız')
            ? 'imarsiz'
            : 'diger';

  const yolRaw = norm(find('yol'));
  const yolDurumu: YolDurumu | null = !yolRaw
    ? null
    : yolRaw.includes('cephe')
      ? 'cepheli'
      : yolRaw.includes('yok')
        ? 'yok'
        : 'yakin';

  const tapuRaw = norm(find('tapu'));
  const tapuDurumu: TapuDurumu | null = !tapuRaw
    ? null
    : tapuRaw.includes('hisse')
      ? 'hisseli'
      : tapuRaw.includes('tahsis')
        ? 'tahsisli'
        : 'mustakil';

  const suRaw = norm(find('su'));
  const elektrikRaw = norm(find('elektrik'));
  const positive = (v: string) => Boolean(v) && !v.includes('yok');

  return {
    imarDurumu,
    yolDurumu,
    tapuDurumu,
    suVar: positive(suRaw),
    elektrikVar: positive(elektrikRaw),
  };
}
