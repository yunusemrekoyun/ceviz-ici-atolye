import { useCallback, useEffect, useState } from "react";
import { getCategoriesCached } from "../services/categoryCache";

const RETRY_DELAY_MS = 1500;

// useProductsCache ile aynı davranış: bir otomatik yeniden deneme, sonra error: true.
export default function useCategoriesCache() {
  const [state, setState] = useState({ data: null, loading: true, error: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    let timer = null;

    const load = (force, retriesLeft) => {
      getCategoriesCached(force)
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
