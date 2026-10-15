import { useCallback, useEffect, useState } from "react";
import { getProductsCached } from "../services/productCache";

const RETRY_DELAY_MS = 1500;

// Geçici hatada bir kez kendiliğinden yeniden dener; yine olmazsa error: true döner.
// Hata durumunda data boş dizi olur, sayfa "ürün yok" yerine tekrar dene göstermeli.
export default function useProductsCache() {
  const [state, setState] = useState({ data: null, loading: true, error: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    let timer = null;

    const load = (force, retriesLeft) => {
      getProductsCached(force)
        .then((data) => {
          if (mounted) setState({ data, loading: false, error: false });
        })
        .catch(() => {
          if (!mounted) return;
          if (retriesLeft > 0) {
            timer = setTimeout(() => load(true, retriesLeft - 1), RETRY_DELAY_MS);
            return;
          }
          setState({ data: [], loading: false, error: true });
        });
    };

    setState((prev) => (prev.loading ? prev : { ...prev, loading: true, error: false }));
    load(attempt > 0, 1);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, retry };
}
