import { useEffect, useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 12;

/**
 * Uzun listeleri parça parça gösterir.
 *
 * Liste sayfaları filtrelenmiş tüm kayıtları tek seferde DOM'a basıyordu.
 * Her kart kendi medyasını (video/poster) yüklediği için içerik sayısı
 * arttıkça bu ciddi bir yüke dönüşüyor: 52 hizmetle yapılan testte
 * /services sayfası 37 video elementi ve 55 MB medya anlamına geliyordu.
 *
 * Filtre veya arama değiştiğinde sayaç başa dönüyor.
 */
export default function usePagedList(items, pageSize = DEFAULT_PAGE_SIZE) {
  const list = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const [count, setCount] = useState(pageSize);

  useEffect(() => {
    setCount(pageSize);
  }, [list, pageSize]);

  const visible = useMemo(() => list.slice(0, count), [list, count]);

  return {
    visible,
    hasMore: count < list.length,
    remaining: Math.max(0, list.length - count),
    showMore: () => setCount((current) => current + pageSize),
    total: list.length,
  };
}
