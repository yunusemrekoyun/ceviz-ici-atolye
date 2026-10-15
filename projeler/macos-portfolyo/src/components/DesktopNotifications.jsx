import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { X } from "lucide-react";
import { desktopNotificationsConfig } from "#constants";
import useWindowStore from "#store/window.js";

const STORAGE_KEY = desktopNotificationsConfig.storageKey;
const INITIAL_SHOW_DELAY_MS = desktopNotificationsConfig.initialShowDelayMs;
const AUTO_RESTORE_DELAY_MS = desktopNotificationsConfig.autoRestoreDelayMs;
const RESTORE_EVENT = desktopNotificationsConfig.restoreEvent;

const NOTIFICATIONS = desktopNotificationsConfig.notifications;

const loadDismissedSet = () => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage?.getItem?.(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v) => typeof v === "string"));
  } catch {
    return new Set();
  }
};

const saveDismissedSet = (set) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
};

const DesktopNotifications = () => {
  const openWindow = useWindowStore((state) => state.openWindow);
  const openWindowsCount = useWindowStore((state) => {
    const windows = Object.values(state.windows ?? {});
    let count = 0;
    windows.forEach((win) => {
      if (win?.isOpen) count += 1;
    });
    return count;
  });
  const hasOpenWindows = openWindowsCount > 0;

  const closingIdsRef = useRef(new Set());
  const clearingRef = useRef(false);
  const enteredRef = useRef(false);
  const restoringIdsRef = useRef(new Set());
  const hasOpenWindowsRef = useRef(hasOpenWindows);
  const restoreTimerRef = useRef(null);
  const autoStowTimelineRef = useRef(null);
  const stowAllVisibleRef = useRef(null);
  const prevOpenWindowsCountRef = useRef(openWindowsCount);

  const [isReady, setIsReady] = useState(false);
  const [visible, setVisible] = useState(() =>
    NOTIFICATIONS.filter((n) => !loadDismissedSet().has(n.id))
  );
  const [stowed, setStowed] = useState([]);

  const rootRef = useRef(null);
  const clearRef = useRef(null);
  const itemRefs = useRef(new Map());
  const closeRefs = useRef(new Map());
  const visibleRef = useRef(visible);
  const stowedRef = useRef(stowed);

  const visibleIdsKey = useMemo(
    () => visible.map((n) => n.id).join("|"),
    [visible]
  );

  const persistDismissed = (ids) => {
    const next = loadDismissedSet();
    ids.forEach((id) => next.add(id));
    saveDismissedSet(next);
  };

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    stowedRef.current = stowed;
  }, [stowed]);

  useEffect(() => {
    hasOpenWindowsRef.current = hasOpenWindows;
  }, [hasOpenWindows]);

  const clearRestoreTimer = () => {
    if (!restoreTimerRef.current) return;
    window.clearTimeout(restoreTimerRef.current);
    restoreTimerRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearRestoreTimer();
      if (autoStowTimelineRef.current) {
        autoStowTimelineRef.current.kill();
        autoStowTimelineRef.current = null;
      }
    };
  }, []);

  const setItemRef = (id) => (el) => {
    if (!id) return;
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  };

  const setCloseRef = (id) => (el) => {
    if (!id) return;
    if (el) closeRefs.current.set(id, el);
    else closeRefs.current.delete(id);
  };

  const showClose = (id) => {
    const el = closeRefs.current.get(id);
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.set(el, { pointerEvents: "auto" });
    gsap.to(el, {
      autoAlpha: 1,
      scale: 1,
      duration: 0.14,
      ease: "power2.out",
    });
  };

  const hideClose = (id) => {
    const el = closeRefs.current.get(id);
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.to(el, {
      autoAlpha: 0,
      scale: 0.85,
      duration: 0.12,
      ease: "power2.in",
      onComplete: () => {
        gsap.set(el, { pointerEvents: "none" });
      },
    });
  };

  const animateDismiss = ({ id, onDone }) => {
    const shell = itemRefs.current.get(id);
    if (!shell) {
      onDone?.();
      return;
    }

    const card = shell.querySelector?.(".macos-notif-card") ?? null;
    const height = shell.getBoundingClientRect?.().height ?? 0;

    gsap.killTweensOf(shell);
    if (card) gsap.killTweensOf(card);

    gsap.set(shell, { height, overflow: "hidden" });

    const tl = gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: () => onDone?.(),
    });

    if (card) {
      tl.to(
        card,
        { x: 48, opacity: 0, filter: "blur(6px)", duration: 0.22, ease: "power2.in" },
        0
      );
    }

    tl.to(
      shell,
      {
        height: 0,
        marginBottom: 0,
        opacity: 0,
        duration: 0.28,
        ease: "power2.inOut",
      },
      0
    );
  };

  const dismissOne = (id) => {
    if (!id) return;
    if (clearingRef.current) return;
    if (closingIdsRef.current.has(id)) return;
    closingIdsRef.current.add(id);

    hideClose(id);

    animateDismiss({
      id,
      onDone: () => {
        persistDismissed([id]);
        closingIdsRef.current.delete(id);
        setVisible((prev) => prev.filter((n) => n.id !== id));
      },
    });
  };

  const clearAll = () => {
    if (clearingRef.current) return;
    if (!visible.length && !stowedRef.current.length) return;
    clearingRef.current = true;

    const stowedNow = stowedRef.current;
    const ids = [...visible, ...stowedNow].map((n) => n.id);
    ids.forEach((id) => hideClose(id));

    const tl = gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: () => {
        persistDismissed(ids);
        clearingRef.current = false;
        closingIdsRef.current.clear();
        setVisible([]);
        setStowed([]);
      },
    });

    visible.forEach(({ id }, idx) => {
      const shell = itemRefs.current.get(id);
      if (!shell) return;
      const card = shell.querySelector?.(".macos-notif-card") ?? null;
      const height = shell.getBoundingClientRect?.().height ?? 0;

      tl.set(shell, { height, overflow: "hidden" }, 0);

      if (card) {
        tl.to(
          card,
          { x: 48, opacity: 0, filter: "blur(6px)", duration: 0.18, ease: "power2.in" },
          idx * 0.05
        );
      }

      tl.to(
        shell,
        {
          height: 0,
          marginBottom: 0,
          opacity: 0,
          duration: 0.24,
          ease: "power2.inOut",
        },
        idx * 0.05
      );
    });

    if (clearRef.current) {
      tl.to(
        clearRef.current,
        { y: -6, opacity: 0, duration: 0.18, ease: "power2.in" },
        0
      );
    }
  };

  const getCenterFromRect = (rect) => ({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  });

  const getNotificationCenterEl = () =>
    document.querySelector?.('[data-notification-center="true"]');

  const animateStowToNotificationCenter = ({ id, onDone }) => {
    const shell = itemRefs.current.get(id);
    const card = shell?.querySelector?.(".macos-notif-card") ?? null;
    const targetEl = getNotificationCenterEl();

    if (!shell || !card || !targetEl) {
      // fallback: collapse like dismiss (without persisting)
      animateDismiss({ id, onDone });
      return;
    }

    const cardRect = card.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const fromCenter = getCenterFromRect(cardRect);
    const toCenter = getCenterFromRect(targetRect);

    const clone = card.cloneNode(true);
    clone.style.position = "fixed";
    clone.style.left = `${cardRect.left}px`;
    clone.style.top = `${cardRect.top}px`;
    clone.style.width = `${cardRect.width}px`;
    clone.style.height = `${cardRect.height}px`;
    clone.style.margin = "0";
    clone.style.zIndex = "12000";
    clone.style.pointerEvents = "none";
    clone.style.transformOrigin = "center center";

    const cloneClose = clone.querySelector?.(".macos-notif-close");
    if (cloneClose) {
      cloneClose.style.opacity = "0";
      cloneClose.style.transform = "scale(0.85)";
    }

    document.body.appendChild(clone);

    gsap.set(shell, { height: shellRect.height, overflow: "hidden" });
    gsap.set(card, { opacity: 0 });

    const tl = gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: () => {
        clone.remove();
        onDone?.();
      },
    });

    tl.to(
      clone,
      {
        x: toCenter.x - fromCenter.x,
        y: toCenter.y - fromCenter.y,
        scale: 0.12,
        opacity: 0,
        filter: "blur(10px)",
        duration: 0.34,
        ease: "power3.inOut",
      },
      0
    ).to(
      shell,
      {
        height: 0,
        marginBottom: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power2.inOut",
      },
      0
    );
  };

  const stowOne = (notif, { openAssociatedWindow = true } = {}) => {
    const id = notif?.id;
    if (!id) return;
    if (clearingRef.current) return;
    if (closingIdsRef.current.has(id)) return;
    closingIdsRef.current.add(id);

    hideClose(id);
    if (openAssociatedWindow && notif.windowKey) {
      openWindow?.(notif.windowKey);
    }

    animateStowToNotificationCenter({
      id,
      onDone: () => {
        closingIdsRef.current.delete(id);
        setVisible((prev) => prev.filter((n) => n.id !== id));
        setStowed((prev) => [...prev, notif]);
      },
    });
  };

  const stowAllVisible = () => {
    const list = visibleRef.current;
    if (!list.length) return;

    if (autoStowTimelineRef.current) {
      autoStowTimelineRef.current.kill();
    }

    const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
    list.forEach((notif, idx) => {
      tl.call(
        () => stowOne(notif, { openAssociatedWindow: false }),
        [],
        idx * 0.06
      );
    });

    autoStowTimelineRef.current = tl;
  };
  useEffect(() => {
    stowAllVisibleRef.current = stowAllVisible;
  });

  const restoreStowed = () => {
    if (clearingRef.current) return;
    const stowedNow = stowedRef.current;
    if (!stowedNow.length) return;

    const dismissed = loadDismissedSet();
    const visibleNow = visibleRef.current;
    const visibleIds = new Set(visibleNow.map((n) => n.id));
    const stowedIds = new Set(stowedNow.map((n) => n.id));
    const idsToRestore = stowedNow.map((n) => n.id);

    restoringIdsRef.current = new Set(idsToRestore);
    setVisible(
      NOTIFICATIONS.filter(
        (n) =>
          !dismissed.has(n.id) && (visibleIds.has(n.id) || stowedIds.has(n.id))
      )
    );
    setStowed([]);
  };

  useEffect(() => {
    if (isReady) return undefined;
    if (hasOpenWindows) return undefined;
    if (!visible.length) return undefined;
    const timer = window.setTimeout(() => setIsReady(true), INITIAL_SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [hasOpenWindows, isReady, visible.length]);

  useEffect(() => {
    const prevCount = prevOpenWindowsCountRef.current;
    prevOpenWindowsCountRef.current = openWindowsCount;

    if (openWindowsCount <= prevCount) return;
    if (!isReady) return;
    if (!visibleRef.current.length) return;
    stowAllVisibleRef.current?.();
  }, [isReady, openWindowsCount]);

  useEffect(() => {
    clearRestoreTimer();
    if (hasOpenWindows) return;
    if (!isReady) return;
    if (!stowed.length) return;

    restoreTimerRef.current = window.setTimeout(() => {
      restoreTimerRef.current = null;
      if (hasOpenWindowsRef.current) return;
      if (clearingRef.current) return;
      if (closingIdsRef.current.size) {
        restoreTimerRef.current = window.setTimeout(() => {
          restoreTimerRef.current = null;
          if (hasOpenWindowsRef.current) return;
          if (clearingRef.current) return;
          if (!closingIdsRef.current.size) restoreStowed();
        }, 160);
        return;
      }
      restoreStowed();
    }, AUTO_RESTORE_DELAY_MS);
  }, [hasOpenWindows, isReady, stowed.length]);

  useEffect(() => {
    const onRestore = () => restoreStowed();
    window.addEventListener(RESTORE_EVENT, onRestore);
    return () => window.removeEventListener(RESTORE_EVENT, onRestore);
  }, []);

  useLayoutEffect(() => {
    if (!isReady) return undefined;
    if (enteredRef.current) return undefined;
    if (!visible.length) return undefined;

    const shells = visible
      .map((n) => itemRefs.current.get(n.id))
      .filter(Boolean);
    const clearEl = clearRef.current;
    const closeButtons = visible
      .map((n) => closeRefs.current.get(n.id))
      .filter(Boolean);

    if (!shells.length) return undefined;

    const ctx = gsap.context(() => {
      enteredRef.current = true;

      gsap.set(closeButtons, { autoAlpha: 0, scale: 0.85, pointerEvents: "none" });
      gsap.set(shells, { x: 64, y: -10, opacity: 0, filter: "blur(8px)" });
      if (clearEl) gsap.set(clearEl, { x: 64, opacity: 0 });

      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
      tl.to(shells, {
        x: 0,
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.45,
        ease: "power3.out",
        stagger: 0.18,
      });

      if (clearEl) {
        tl.to(
          clearEl,
          { x: 0, opacity: 1, duration: 0.35, ease: "power3.out" },
          ">-0.22"
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, [isReady, visible, visibleIdsKey]);

  useLayoutEffect(() => {
    if (!isReady) return undefined;
    const ids = Array.from(restoringIdsRef.current);
    if (!ids.length) return undefined;

    const targetEl = getNotificationCenterEl();
    const targetRect = targetEl?.getBoundingClientRect?.();
    const shells = ids.map((id) => itemRefs.current.get(id)).filter(Boolean);
    if (!shells.length) {
      restoringIdsRef.current.clear();
      return undefined;
    }

    const fromPoint = targetRect
      ? getCenterFromRect(targetRect)
      : { x: window.innerWidth - 24, y: 24 };

    const ordered = ids
      .map((id) => itemRefs.current.get(id))
      .filter(Boolean);

    gsap.killTweensOf(ordered);
    ordered.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const center = getCenterFromRect(rect);
      gsap.set(el, {
        x: fromPoint.x - center.x,
        y: fromPoint.y - center.y,
        scale: 0.12,
        opacity: 0,
        filter: "blur(10px)",
      });
    });

    const tl = gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: () => {
        restoringIdsRef.current.clear();
      },
    });

    tl.to(ordered, {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      filter: "blur(0px)",
      duration: 0.45,
      ease: "power3.out",
      stagger: 0.08,
      clearProps: "transform,opacity,filter",
    });

    return () => tl.kill();
  }, [isReady, visibleIdsKey]);

  if (!visible.length || !isReady) return null;

  return (
    <aside ref={rootRef} className="macos-notifications" aria-label="Notifications">
      <div className="macos-notifications-stack">
        {visible.map((n) => (
          <div
            key={n.id}
            ref={setItemRef(n.id)}
            className="macos-notif-shell"
            onMouseEnter={() => showClose(n.id)}
            onMouseLeave={() => hideClose(n.id)}
          >
            <div
              className="macos-notif-card"
              role="status"
              aria-label={n.title}
              onClick={() => stowOne(n)}
            >
              <button
                ref={setCloseRef(n.id)}
                type="button"
                className="macos-notif-close"
                aria-label="Dismiss notification"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissOne(n.id);
                }}
              >
                <X size={12} aria-hidden />
              </button>

              <div className="macos-notif-icon" aria-hidden>
                <img src={n.icon} alt="" />
              </div>

              <div className="macos-notif-content">
                <p className="macos-notif-title">{n.title}</p>
                <p className="macos-notif-message">{n.message}</p>
              </div>
            </div>
          </div>
        ))}

        <button
          ref={clearRef}
          type="button"
          className="macos-notif-clear"
          onClick={clearAll}
        >
          Clear all notifications
        </button>
      </div>
    </aside>
  );
};

export default DesktopNotifications;
