import { useEffect, useRef, useState } from "react";

export default function useViewportActivation({
  once = true,
  rootMargin = "320px 0px",
  threshold = 0.01,
  disabled = false,
} = {}) {
  const ref = useRef(null);
  const [active, setActive] = useState(Boolean(disabled));

  useEffect(() => {
    if (disabled) {
      setActive(true);
      return undefined;
    }

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setActive(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (once) {
          if (entry.isIntersecting) {
            setActive(true);
            observer.disconnect();
          }
          return;
        }

        setActive(entry.isIntersecting);
      },
      { rootMargin, threshold }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [disabled, once, rootMargin, threshold]);

  return [ref, active];
}
