import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const DRAG_MAX = 280;
const DRAG_OVER_RESISTANCE = 0.22;
const DRAG_TRANSLATE_FACTOR = 0.72;
const CLOSE_PROGRESS_THRESHOLD = 0.42;
const CLOSE_VELOCITY_THRESHOLD = 0.85; // px/ms

const usePhoneMirrorFlow = ({ isMobileView = false, isOpen = false } = {}) => {
  const [phase, setPhase] = useState(isMobileView ? "home" : "loading"); // loading | home | app
  const [activeApp, setActiveApp] = useState(null);

  const appContainerRef = useRef(null);
  const dockRef = useRef(null);
  const homeRef = useRef(null);
  const scrimRef = useRef(null);
  const gestureAreaRef = useRef(null);
  const activePointerIdRef = useRef(null);
  const windowGestureListenersActiveRef = useRef(false);
  const windowGestureListenersRef = useRef(null);
  const dragRafRef = useRef(null);
  const dragPendingDeltaRef = useRef(0);
  const dragVisualsRef = useRef({
    blurPx: null,
    shadowAlpha: null,
  });

  const dragState = useRef({
    startY: 0,
    lastY: 0,
    lastTime: 0,
    velocityY: 0,
    active: false,
  });
  const gestureTlRef = useRef(null);
  const isGestureAnimatingRef = useRef(false);
  const lastOpenRectRef = useRef(null);

  const cancelDragRaf = useCallback(() => {
    if (dragRafRef.current != null) {
      window.cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
  }, []);

  const removeWindowGestureListeners = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!windowGestureListenersActiveRef.current) return;

    windowGestureListenersActiveRef.current = false;
    const listeners = windowGestureListenersRef.current;
    windowGestureListenersRef.current = null;

    if (!listeners) return;
    window.removeEventListener("pointermove", listeners.move);
    window.removeEventListener("pointerup", listeners.up);
    window.removeEventListener("pointercancel", listeners.cancel);
    window.removeEventListener("blur", listeners.blur);
  }, []);

  const resetGestureVisuals = useCallback(() => {
    removeWindowGestureListeners();
    activePointerIdRef.current = null;
    lastOpenRectRef.current = null;
    dragVisualsRef.current.blurPx = null;
    dragVisualsRef.current.shadowAlpha = null;
    dragState.current.active = false;
    isGestureAnimatingRef.current = false;
    cancelDragRaf();

    if (gestureTlRef.current) {
      gestureTlRef.current.kill();
      gestureTlRef.current = null;
    }

    if (homeRef.current) {
      gsap.set(homeRef.current, {
        opacity: 1,
        scale: 1,
        filter: "none",
        pointerEvents: "auto",
      });
    }

    if (dockRef.current) {
      gsap.set(dockRef.current, { y: 0 });
    }

    if (scrimRef.current) {
      gsap.set(scrimRef.current, { opacity: 0 });
    }
  }, [cancelDragRaf, removeWindowGestureListeners]);

  useEffect(() => {
    if (!isMobileView) return undefined;
    resetGestureVisuals();
    return undefined;
  }, [isMobileView, resetGestureVisuals]);

  useEffect(() => {
    if (isMobileView || !isOpen) return undefined;

    resetGestureVisuals();
    const timer = window.setTimeout(() => {
      setPhase("loading");
      setActiveApp(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isMobileView, isOpen, resetGestureVisuals]);

  const openApp = useCallback(
    (id, originEl) => {
      if (!id || phase === "loading") return;

      lastOpenRectRef.current = originEl?.getBoundingClientRect?.() ?? null;
      dragState.current.active = false;
      setActiveApp(id);
      setPhase("app");
    },
    [phase]
  );

  const hireSuccess = useCallback(() => {
    lastOpenRectRef.current = null;
    dragState.current.active = false;
    isGestureAnimatingRef.current = false;

    if (gestureTlRef.current) {
      gestureTlRef.current.kill();
      gestureTlRef.current = null;
    }

    setActiveApp("contact");
    setPhase("app");
  }, []);

  const backHome = useCallback(() => {
    cancelDragRaf();
    removeWindowGestureListeners();
    activePointerIdRef.current = null;
    setActiveApp(null);
    setPhase("home");
    lastOpenRectRef.current = null;
    dragVisualsRef.current.blurPx = null;
    dragVisualsRef.current.shadowAlpha = null;
    dragState.current.active = false;
    isGestureAnimatingRef.current = false;

    if (gestureTlRef.current) {
      gestureTlRef.current.kill();
      gestureTlRef.current = null;
    }

    if (appContainerRef.current) {
      gsap.set(appContainerRef.current, {
        opacity: 0,
        display: "none",
        x: 0,
        y: 0,
        scale: 1,
        borderRadius: 0,
        boxShadow: "0 0 0 rgba(0,0,0,0)",
        clearProps: "filter",
      });
    }

    if (dockRef.current) {
      gsap.set(dockRef.current, { y: 0 });
    }

    if (homeRef.current) {
      gsap.set(homeRef.current, {
        opacity: 1,
        scale: 1,
        filter: "none",
        pointerEvents: "auto",
      });
    }

    if (scrimRef.current) {
      gsap.set(scrimRef.current, { opacity: 0 });
    }
  }, [cancelDragRaf, removeWindowGestureListeners]);

  const finishLoading = useCallback(() => {
    setPhase("home");
  }, []);

  const applyDrag = useCallback((deltaYRaw = 0) => {
    const raw = Math.max(0, deltaYRaw);
    const clamped = Math.min(raw, DRAG_MAX);
    const over = Math.max(0, raw - DRAG_MAX);
    const delta = clamped + over * DRAG_OVER_RESISTANCE;
    const app = appContainerRef.current;
    const dock = dockRef.current;
    const home = homeRef.current;
    const t = Math.min(1, delta / DRAG_MAX);
    const progress = 1 - (1 - t) ** 3;
    const scale = Math.max(0.82, 1 - progress * 0.18);
    const y = -delta * DRAG_TRANSLATE_FACTOR;
    const radius = progress * 28;
    const shadowOpacity = progress > 0.015 ? 0.08 + progress * 0.18 : 0;
    const shadowAlphaRounded = Number(shadowOpacity.toFixed(3));
    const blurPx = Math.round((1 - progress) * 10);
    const prev = dragVisualsRef.current;

    if (app) {
      gsap.set(app, {
        y,
        scale,
        borderRadius: radius,
      });

      if (prev.shadowAlpha !== shadowAlphaRounded) {
        gsap.set(app, {
          boxShadow: shadowAlphaRounded
            ? `0 24px 70px rgba(0, 0, 0, ${shadowAlphaRounded})`
            : "0 0 0 rgba(0,0,0,0)",
        });
        prev.shadowAlpha = shadowAlphaRounded;
      }
    }
    if (dock) {
      gsap.set(dock, { y: (1 - progress) * 64, force3D: true });
    }
    if (home) {
      gsap.set(home, {
        opacity: progress,
        scale: 0.98 + progress * 0.02,
        force3D: true,
      });

      if (prev.blurPx !== blurPx) {
        gsap.set(home, { filter: `blur(${blurPx}px)` });
        prev.blurPx = blurPx;
      }
    }

    return delta;
  }, []);

  const animateBack = useCallback(() => {
    const app = appContainerRef.current;
    const dock = dockRef.current;
    const home = homeRef.current;

    if (gestureTlRef.current) {
      gestureTlRef.current.kill();
      gestureTlRef.current = null;
    }

    const killTargets = [app, dock, home, scrimRef.current].filter(Boolean);
    if (killTargets.length) gsap.killTweensOf(killTargets);

    isGestureAnimatingRef.current = true;
    const tl = gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: () => {
        isGestureAnimatingRef.current = false;
      },
    });
    gestureTlRef.current = tl;

    if (app) {
      tl.to(
        app,
        {
          x: 0,
          y: 0,
          scale: 1,
          borderRadius: 0,
          boxShadow: "0 0 0 rgba(0,0,0,0)",
          duration: 0.32,
          ease: "power3.out",
          force3D: true,
        },
        0
      );
    }
    if (dock) {
      tl.to(
        dock,
        { y: 64, duration: 0.3, ease: "power2.out", force3D: true },
        0
      );
    }
    if (home) {
      tl.to(
        home,
        {
          opacity: 0,
          scale: 0.98,
          filter: "blur(10px)",
          duration: 0.3,
          ease: "power2.out",
          force3D: true,
        },
        0
      );
    }
  }, []);

  const animateClose = useCallback(
    ({ velocityY = 0 } = {}) => {
      const app = appContainerRef.current;
      const dock = dockRef.current;
      const home = homeRef.current;
      const targetRect = lastOpenRectRef.current;

      if (!app) {
        backHome();
        return;
      }

      if (gestureTlRef.current) {
        gestureTlRef.current.kill();
        gestureTlRef.current = null;
      }
      const killTargets = [app, dock, home, scrimRef.current].filter(Boolean);
      if (killTargets.length) gsap.killTweensOf(killTargets);

      isGestureAnimatingRef.current = true;

      const startingScale = Number(gsap.getProperty(app, "scale")) || 1;
      const startingX = Number(gsap.getProperty(app, "x")) || 0;
      const startingY = Number(gsap.getProperty(app, "y")) || 0;
      const currentProgress = Math.max(
        0,
        Math.min(1, (1 - startingScale) / 0.18)
      );
      const remaining = 1 - currentProgress;

      const durationScale = Math.max(
        0.65,
        Math.min(1.05, 1 - velocityY * 0.25)
      );
      const homeDuration = (0.18 + remaining * 0.12) * durationScale;
      const appDuration = (0.22 + remaining * 0.18) * durationScale;
      const fadeDuration = Math.min(0.1, appDuration * 0.35);
      const fadeStart = Math.max(0, appDuration - fadeDuration);

      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut", overwrite: "auto" },
        onComplete: () => {
          backHome();
        },
      });
      gestureTlRef.current = tl;

      if (home) {
        tl.to(
          home,
          {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            duration: homeDuration,
            ease: "power2.out",
          },
          0
        );
      }
      if (dock) {
        tl.to(
          dock,
          { y: 0, duration: homeDuration, ease: "power2.out", force3D: true },
          0
        );
      }

      if (targetRect) {
        const appRect = app.getBoundingClientRect();
        const finalScale = startingScale * (targetRect.width / appRect.width);
        const finalX = startingX + (targetRect.left - appRect.left);
        const finalY = startingY + (targetRect.top - appRect.top);

        tl.to(
          app,
          {
            x: finalX,
            y: finalY,
            scale: finalScale,
            borderRadius: 24,
            boxShadow: "0 16px 52px rgba(0,0,0,0.22)",
            duration: appDuration,
            force3D: true,
          },
          0
        );
        tl.to(
          app,
          { opacity: 0, duration: fadeDuration, ease: "power1.out" },
          fadeStart
        );
      } else {
        tl.to(
          app,
          {
            y: -420,
            scale: 0.82,
            borderRadius: 28,
            boxShadow: "0 16px 52px rgba(0,0,0,0.22)",
            duration: appDuration,
            force3D: true,
          },
          0
        );
        tl.to(
          app,
          { opacity: 0, duration: fadeDuration, ease: "power1.out" },
          fadeStart
        );
      }
    },
    [backHome]
  );

  useGSAP(() => {
    if (phase !== "app") return undefined;

    const app = appContainerRef.current;
    const home = homeRef.current;
    const dock = dockRef.current;
    if (!app) return undefined;

    const fromRect = lastOpenRectRef.current;
    const tl = gsap.timeline();

    gsap.set(home, { pointerEvents: "none" });
    gsap.set(home, { opacity: 1, scale: 1, filter: "blur(0px)" });
    gsap.set(dock, { y: 0 });
    gsap.set(app, {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      borderRadius: 0,
      boxShadow: "0 0 0 rgba(0,0,0,0)",
      transformOrigin: "0 0",
      force3D: true,
    });
    gsap.set(home, { force3D: true });
    gsap.set(dock, { force3D: true });

    if (fromRect) {
      const toRect = app.getBoundingClientRect();
      const scale = Math.max(0.2, Math.min(1, fromRect.width / toRect.width));
      const x = fromRect.left - toRect.left;
      const y = fromRect.top - toRect.top;

      tl.set(app, {
        x,
        y,
        scale,
        borderRadius: 24,
        boxShadow: "0 24px 70px rgba(0,0,0,0.22)",
      })
        .to(
          app,
          {
            x: 0,
            y: 0,
            scale: 1,
            borderRadius: 0,
            boxShadow: "0 0 0 rgba(0,0,0,0)",
            duration: 0.44,
            ease: "power3.out",
          },
          0
        )
        .to(
          home,
          {
            opacity: 0,
            scale: 0.98,
            filter: "blur(10px)",
            duration: 0.3,
            ease: "power2.out",
          },
          0
        )
        .to(dock, { y: 64, duration: 0.3, ease: "power2.out" }, 0);
    } else {
      tl.fromTo(
        app,
        { y: 36, scale: 0.96, opacity: 0.7, filter: "blur(10px)" },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.35,
          ease: "power3.out",
        }
      );
      tl.to(
        home,
        {
          opacity: 0,
          scale: 0.98,
          filter: "blur(10px)",
          duration: 0.3,
          ease: "power2.out",
        },
        0
      );
      tl.to(dock, { y: 64, duration: 0.3, ease: "power2.out" }, 0);
    }

    return () => tl.kill();
  }, [phase, activeApp]);

  const handlePointerCancel = useCallback(
    (e) => {
      if (!dragState.current.active || phase !== "app") return;
      const activePointerId = activePointerIdRef.current;
      if (
        activePointerId != null &&
        e?.pointerId != null &&
        e.pointerId !== activePointerId
      ) {
        return;
      }
      dragState.current.active = false;
      activePointerIdRef.current = null;
      cancelDragRaf();
      removeWindowGestureListeners();

      if (gestureAreaRef.current?.releasePointerCapture && e.pointerId != null) {
        try {
          gestureAreaRef.current.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }

      animateBack();
    },
    [animateBack, cancelDragRaf, phase, removeWindowGestureListeners]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (
        !dragState.current.active ||
        phase !== "app" ||
        isGestureAnimatingRef.current
      ) {
        return;
      }

      const activePointerId = activePointerIdRef.current;
      if (
        activePointerId != null &&
        e?.pointerId != null &&
        e.pointerId !== activePointerId
      ) {
        return;
      }

      // If we missed a mouseup (e.g., pointer released outside the window), finalize the gesture.
      if (e?.pointerType === "mouse" && e.buttons === 0) {
        handlePointerCancel(e);
        return;
      }

      const y = e.clientY;
      const now = performance.now();
      const lastTime = dragState.current.lastTime || now;
      const dt = now - lastTime;

      if (dt > 0) {
        dragState.current.velocityY = (dragState.current.lastY - y) / dt;
      }

      dragState.current.lastY = y;
      dragState.current.lastTime = now;

      const delta = dragState.current.startY - y;
      dragPendingDeltaRef.current = delta;
      if (dragRafRef.current == null) {
        dragRafRef.current = window.requestAnimationFrame(() => {
          dragRafRef.current = null;
          applyDrag(dragPendingDeltaRef.current);
        });
      }
      e.preventDefault?.();
    },
    [applyDrag, handlePointerCancel, phase]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (!dragState.current.active || phase !== "app") return;
      const activePointerId = activePointerIdRef.current;
      if (
        activePointerId != null &&
        e?.pointerId != null &&
        e.pointerId !== activePointerId
      ) {
        return;
      }
      const y = e.clientY;
      const delta = Math.max(0, dragState.current.startY - y);
      dragState.current.active = false;
      activePointerIdRef.current = null;
      cancelDragRaf();
      removeWindowGestureListeners();

      const progress = Math.min(1, delta / DRAG_MAX);
      const velocityY = dragState.current.velocityY || 0;
      const shouldClose =
        progress >= CLOSE_PROGRESS_THRESHOLD ||
        velocityY >= CLOSE_VELOCITY_THRESHOLD;

      if (gestureAreaRef.current?.releasePointerCapture && e.pointerId != null) {
        try {
          gestureAreaRef.current.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }

      if (shouldClose) animateClose({ velocityY });
      else animateBack();
      e.preventDefault?.();
    },
    [animateBack, animateClose, cancelDragRaf, phase, removeWindowGestureListeners]
  );

  const addWindowGestureListeners = useCallback(() => {
    if (typeof window === "undefined") return;
    if (windowGestureListenersActiveRef.current) return;

    windowGestureListenersActiveRef.current = true;

    const move = (event) => handlePointerMove(event);
    const up = (event) => handlePointerUp(event);
    const cancel = (event) => handlePointerCancel(event);
    const blur = (event) => handlePointerCancel(event);

    windowGestureListenersRef.current = { move, up, cancel, blur };

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up, { passive: false });
    window.addEventListener("pointercancel", cancel, { passive: false });
    window.addEventListener("blur", blur);
  }, [handlePointerCancel, handlePointerMove, handlePointerUp]);

  const handlePointerDown = useCallback(
    (e) => {
      if (phase !== "app" || isGestureAnimatingRef.current) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      cancelDragRaf();

      const y = e.clientY;
      const now = performance.now();

      dragState.current.startY = y;
      dragState.current.lastY = y;
      dragState.current.lastTime = now;
      dragState.current.velocityY = 0;
      dragState.current.active = true;
      activePointerIdRef.current = e.pointerId ?? null;

      if (gestureTlRef.current) {
        gestureTlRef.current.kill();
        gestureTlRef.current = null;
      }

      const killTargets = [
        appContainerRef.current,
        dockRef.current,
        homeRef.current,
        scrimRef.current,
      ].filter(Boolean);
      if (killTargets.length) gsap.killTweensOf(killTargets);

      if (gestureAreaRef.current?.setPointerCapture && e.pointerId != null) {
        try {
          gestureAreaRef.current.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }

      addWindowGestureListeners();
      e.preventDefault?.();
    },
    [addWindowGestureListeners, cancelDragRaf, phase]
  );
  
  useEffect(() => {
    return () => removeWindowGestureListeners();
  }, [removeWindowGestureListeners]);

  return {
    phase,
    activeApp,
    openApp,
    hireSuccess,
    backHome,
    finishLoading,
    refs: {
      appContainerRef,
      dockRef,
      homeRef,
      scrimRef,
      gestureAreaRef,
    },
    gestureHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
    },
  };
};

export default usePhoneMirrorFlow;
