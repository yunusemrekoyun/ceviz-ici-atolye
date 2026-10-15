import { useEffect } from "react";

const useVisitTracker = (type, targetId) => {
  useEffect(() => {
    if (!targetId) return;

    const key = `visited-${type}-${targetId}`;
    const today = new Date().toISOString().split("T")[0];
    const stored = localStorage.getItem(key);
    const startTime = Date.now();

    const handleUnload = () => {
      const duration = Date.now() - startTime;

      if (stored === today) return;

      fetch(`${import.meta.env.VITE_API_BASE_URL}/api/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, targetId, duration }),
      });

      localStorage.setItem(key, today);
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      handleUnload(); // sayfa React içinde unmount olursa da çalışsın
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [type, targetId]);
};

export default useVisitTracker;
