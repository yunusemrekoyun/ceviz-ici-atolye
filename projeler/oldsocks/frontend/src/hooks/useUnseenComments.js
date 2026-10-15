// src/hooks/useUnseenComments.js
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../api";

const isDocumentVisible = () =>
  typeof document === "undefined" ? true : !document.hidden;

export default function useUnseenComments({
  poll = false,
  interval = 120000,
} = {}) {
  const [count, setCount] = useState(0);
  const timer = useRef(null);
  const visibleRef = useRef(isDocumentVisible());

  const fetchCount = useCallback(async () => {
    try {
      // onaysız + görülmemiş yorumlar
      const { data } = await api.get("/comments?approved=false&seen=false");
      setCount(Array.isArray(data) ? data.length : 0);
    } catch {
      console.error("Error fetching unseen comment count");
    }
  }, []);

  const markSeen = useCallback(async () => {
    try {
      await api.patch("/comments/mark-seen?approved=false");
      setCount(0);
    } catch {
      console.error("Error marking comments as seen");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const handleVisibility = () => {
      visibleRef.current = isDocumentVisible();
      if (visibleRef.current) {
        fetchCount();
      }
    };

    if (poll) {
      document.addEventListener("visibilitychange", handleVisibility);
      timer.current = setInterval(() => {
        if (visibleRef.current) {
          fetchCount();
        }
      }, interval);
    }

    if (mounted && visibleRef.current) {
      fetchCount();
    }

    return () => {
      mounted = false;
      if (timer.current) {
        clearInterval(timer.current);
      }
      if (poll) {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [fetchCount, poll, interval]);

  return { count, fetchCount, markSeen, setCount };
}
