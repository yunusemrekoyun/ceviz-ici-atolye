import { useEffect } from "react";
import { applyPageMeta } from "../utils/pageMeta";

// meta nesnesi her render'da yeniden oluşabileceği için bağımlılık olarak alanlar kullanılır.
export default function usePageMeta(meta) {
  const { title, description, noindex, image, canonicalPath, type } = meta || {};
  useEffect(() => {
    applyPageMeta({ title, description, noindex, image, canonicalPath, type });
  }, [title, description, noindex, image, canonicalPath, type]);
}
