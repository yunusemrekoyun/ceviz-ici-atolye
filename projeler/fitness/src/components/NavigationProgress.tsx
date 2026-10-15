"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";

function Progress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeRef = useRef(false);

  // Start bar on any link click that triggers navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      // Skip external, hash-only, same-page, and non-navigating links
      if (
        href.startsWith("http") ||
        href.startsWith("mailto") ||
        href.startsWith("tel") ||
        href === "#" ||
        anchor.getAttribute("target") === "_blank" ||
        anchor.getAttribute("download") != null
      ) return;

      completeRef.current = false;
      setVisible(true);
      setWidth(15);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Slowly inch toward 85% while loading
  useEffect(() => {
    if (!visible) return;
    intervalRef.current = setInterval(() => {
      setWidth((w) => {
        if (w >= 85) {
          clearInterval(intervalRef.current!);
          return 85;
        }
        return w + (85 - w) * 0.12;
      });
    }, 150);
    return () => clearInterval(intervalRef.current!);
  }, [visible]);

  // Complete when URL changes
  useEffect(() => {
    if (!visible) return;
    clearInterval(intervalRef.current!);
    completeRef.current = true;
    setWidth(100);
    const t = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  if (!visible && width === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
      <div
        className="h-[2px] bg-neon"
        style={{
          width: `${width}%`,
          transition: width === 100
            ? "width 200ms ease-out, opacity 200ms 150ms ease-out"
            : "width 150ms linear",
          opacity: width === 100 && !visible ? 0 : 1,
          boxShadow: "0 0 8px 1px rgba(198,255,61,0.6)",
        }}
      />
    </div>
  );
}

// Suspense required because useSearchParams needs it
export function NavigationProgress() {
  return (
    <Suspense>
      <Progress />
    </Suspense>
  );
}
