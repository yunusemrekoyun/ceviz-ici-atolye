import { useEffect, useState } from "react";
import publicApi from "../../publicApi";

// Ana sayfa bölümlerinin ürünleri tek istekte gelir (tüm ürün listesi indirilmez).
// Aynı sayfadaki bölümler tek isteği paylaşır; hata olursa bir kez yeniden denenir.
let pending = null;

function loadHomeProducts() {
  if (!pending) {
    pending = publicApi
      .get("/storefront/home-products")
      .then(({ data }) => ({
        sections: data?.sections && typeof data.sections === "object" ? data.sections : {},
        variants: Array.isArray(data?.variants) ? data.variants : [],
      }))
      .finally(() => {
        // Sonraki ana sayfa açılışında güncel (ve rastgele bölümde farklı) ürünler gelsin.
        setTimeout(() => {
          pending = null;
        }, 30_000);
      });
  }
  return pending;
}

export default function useHomeProducts() {
  const [state, setState] = useState({ data: null, loading: true, error: false });

  useEffect(() => {
    let mounted = true;
    const run = (retries) =>
      loadHomeProducts()
        .then((data) => mounted && setState({ data, loading: false, error: false }))
        .catch(() => {
          pending = null;
          if (!mounted) return;
          if (retries > 0) setTimeout(() => mounted && run(retries - 1), 1500);
          else setState({ data: null, loading: false, error: true });
        });
    run(1);
    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
