import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { useGSAP } from "@gsap/react";

import { uiConfig } from "#constants";
import useWindowStore from "#store/window.js";

const windowWrapper = (Component, windowKey) => {
  const Wrapped = (props) => {
    const focusWindow = useWindowStore((state) => state.focusWindow);
    const setWindowPosition = useWindowStore((state) => state.setWindowPosition);
    const setWindowSize = useWindowStore((state) => state.setWindowSize);
    const windowState = useWindowStore((state) => state.windows[windowKey]);
    const { isOpen, zIndex, position, size } = windowState ?? {};
    const ref = useRef(null);
    const wasOpenRef = useRef(false);
    const hasOpenedRef = useRef(Boolean(isOpen));
    const dragInstanceRef = useRef(null);
    const resizeStateRef = useRef({
      active: false,
      handle: null,
      pointerId: null,
      startX: 0,
      startY: 0,
      startWidth: 0,
      startHeight: 0,
      startLeft: 0,
      startTop: 0,
      startRight: 0,
      startBottom: 0,
      baseLeft: 0,
      baseTop: 0,
    });

    if (isOpen) {
      hasOpenedRef.current = true;
    }

    const viewportPadding = uiConfig?.windowViewportPadding ?? 12;
    const globalScrollEnabled = uiConfig?.enableWindowScroll ?? true;
    const windowsWithoutWindowScroll = Array.isArray(
      uiConfig?.windowsWithoutWindowScroll
    )
      ? uiConfig.windowsWithoutWindowScroll
      : [];
    const windowsWithoutResize = Array.isArray(uiConfig?.windowsWithoutResize)
      ? uiConfig.windowsWithoutResize
      : [];
    const enableWindowScroll =
      globalScrollEnabled && !windowsWithoutWindowScroll.includes(windowKey);
    const safeTopSelector = uiConfig?.topSafeAreaSelector ?? "nav";
    const avoidTransforms = Array.isArray(uiConfig?.windowsWithoutTransforms)
      ? uiConfig.windowsWithoutTransforms.includes(windowKey)
      : false;
    const allowResize = !windowsWithoutResize.includes(windowKey);
    const resizeMinWidth = uiConfig?.windowResizeMinWidth ?? 320;
    const resizeMinHeight = uiConfig?.windowResizeMinHeight ?? 240;

    const getSafeTop = () => {
      if (typeof document === "undefined") return 0;
      const el = document.querySelector(safeTopSelector);
      if (!el) return 0;
      return Math.max(0, el.getBoundingClientRect().bottom);
    };

    const getViewportBoundsTransform = () => {
      const el = ref.current;
      if (!el) return null;

      const rect = el.getBoundingClientRect();
      const currentX = Number(gsap.getProperty(el, "x")) || 0;
      const currentY = Number(gsap.getProperty(el, "y")) || 0;

      const baseLeft = rect.left - currentX;
      const baseTop = rect.top - currentY;

      const safeTop = getSafeTop();
      el.style.setProperty("--os-window-safe-top", `${safeTop}px`);
      el.style.setProperty("--os-window-viewport-padding", `${viewportPadding}px`);

      const computedMaxX =
        window.innerWidth - viewportPadding - (baseLeft + rect.width);
      const computedMaxY =
        window.innerHeight - viewportPadding - (baseTop + rect.height);
      const minX = -baseLeft;
      const minY = safeTop + viewportPadding - baseTop;
      const maxX = Math.max(minX, computedMaxX);
      const maxY = Math.max(minY, computedMaxY);

      return {
        minX,
        maxX,
        minY,
        maxY,
      };
    };

    const clampTransformToViewport = (x = 0, y = 0) => {
      const bounds = getViewportBoundsTransform();
      if (!bounds) return { x, y };

      return {
        x: Math.min(Math.max(x, bounds.minX), bounds.maxX),
        y: Math.min(Math.max(y, bounds.minY), bounds.maxY),
      };
    };

    const clampTopLeftToViewport = (left, top, rect) => {
      const safeTop = getSafeTop();

      const minLeft = viewportPadding;
      const minTop = safeTop + viewportPadding;

      const width = rect?.width ?? 0;
      const height = rect?.height ?? 0;

      const maxLeft = Math.max(minLeft, window.innerWidth - viewportPadding - width);
      const maxTop = Math.max(minTop, window.innerHeight - viewportPadding - height);

      return {
        left: Math.min(Math.max(left, minLeft), maxLeft),
        top: Math.min(Math.max(top, minTop), maxTop),
      };
    };

    const applyWindowSize = (el, nextSize) => {
      if (!el) return;
      const safeTop = getSafeTop();
      const maxWidth = Math.max(resizeMinWidth, window.innerWidth - viewportPadding * 2);
      const maxHeight = Math.max(
        resizeMinHeight,
        window.innerHeight - safeTop - viewportPadding * 2
      );

      const rawWidth =
        typeof nextSize?.width === "number" && nextSize.width > 0
          ? Math.round(nextSize.width)
          : null;
      const rawHeight =
        typeof nextSize?.height === "number" && nextSize.height > 0
          ? Math.round(nextSize.height)
          : null;

      const width =
        rawWidth == null ? null : Math.min(Math.max(rawWidth, resizeMinWidth), maxWidth);
      const height =
        rawHeight == null
          ? null
          : Math.min(Math.max(rawHeight, resizeMinHeight), maxHeight);

      if (width != null) {
        el.style.width = `${width}px`;
      } else {
        el.style.removeProperty("width");
      }

      if (height != null) {
        el.style.height = `${height}px`;
      } else {
        el.style.removeProperty("height");
      }
    };

    const updateDragBounds = (shouldClampPosition = false) => {
      const el = ref.current;
      const instance = dragInstanceRef.current;
      if (!el || !instance) return;

      const bounds = getViewportBoundsTransform();
      if (!bounds) return;
      instance.applyBounds({
        minX: bounds.minX,
        maxX: bounds.maxX,
        minY: bounds.minY,
        maxY: bounds.maxY,
      });

      if (!shouldClampPosition) return;
      const { x: cx, y: cy } = clampTransformToViewport(instance.x, instance.y);
      gsap.set(el, { x: cx, y: cy });
      setWindowPosition(windowKey, { x: cx, y: cy });
    };

    const computeDefaultTopLeft = (rect) => {
      const safeTop = getSafeTop();
      const width = rect?.width ?? 0;

      const rawLeft = Math.round((window.innerWidth - width) / 2);
      const rawTop = Math.round(safeTop + viewportPadding);

      return clampTopLeftToViewport(rawLeft, rawTop, rect);
    };

    useGSAP(() => {
      const el = ref.current;

      if (!el || !isOpen) return;

      applyWindowSize(el, size);
      gsap.killTweensOf(el);
      el.style.display = "block";

      if (avoidTransforms) {
        el.style.transform = "none";
        const rect = el.getBoundingClientRect();

        const incomingLeft = Number(position?.x ?? 0);
        const incomingTop = Number(position?.y ?? 0);
        const isUnset = incomingLeft === 0 && incomingTop === 0;

        const { left, top } = isUnset
          ? computeDefaultTopLeft(rect)
          : clampTopLeftToViewport(incomingLeft, incomingTop, rect);

        el.style.left = `${left}px`;
        el.style.top = `${top}px`;

        if (isUnset || left !== incomingLeft || top !== incomingTop) {
          setWindowPosition(windowKey, { x: left, y: top });
        }

        gsap.fromTo(
          el,
          { opacity: 0, top: top + 30 },
          {
            opacity: 1,
            top,
            duration: 0.35,
            ease: "power3.out",
            overwrite: "auto",
          }
        );
        return;
      }

      const initialX = position?.x ?? 0;
      const initialY = position?.y ?? 0;
      const { x, y } = clampTransformToViewport(initialX, initialY);

      gsap.set(el, { x, y });

      gsap.fromTo(
        el,
        { scale: 0.9, opacity: 0, x, y: y + 30 },
        {
          scale: 1,
          opacity: 1,
          x,
          y,
          duration: 0.35,
          ease: "power3.out",
          overwrite: "auto",
        }
      );
    }, [isOpen]);

    useGSAP(() => {
      const el = ref.current;
      if (!el || !isOpen) return;

      applyWindowSize(el, size);
      if (avoidTransforms) {
        el.style.transform = "none";
        const rect = el.getBoundingClientRect();

        const nextLeft = Number(position?.x ?? 0);
        const nextTop = Number(position?.y ?? 0);
        const { left, top } = clampTopLeftToViewport(nextLeft, nextTop, rect);

        el.style.left = `${left}px`;
        el.style.top = `${top}px`;

        if (left !== nextLeft || top !== nextTop) {
          setWindowPosition(windowKey, { x: left, y: top });
        }
        return;
      }

      const nextX = position?.x ?? 0;
      const nextY = position?.y ?? 0;
      const { x, y } = clampTransformToViewport(nextX, nextY);

      gsap.set(el, { x, y });

      if (x !== nextX || y !== nextY) {
        setWindowPosition(windowKey, { x, y });
      }
    }, [isOpen && wasOpenRef.current, position?.x, position?.y]);

    useGSAP(() => {
      const el = ref.current;
      if (!el || isOpen || !wasOpenRef.current) return;

      if (avoidTransforms) {
        const left = Number(position?.x ?? 0);
        const top = Number(position?.y ?? 0);

        gsap.to(el, {
          opacity: 0,
          top: top + 25,
          duration: 0.25,
          ease: "power2.in",
          onComplete: () => {
            el.style.display = "none";
            gsap.set(el, { opacity: 1, top, left });
          },
        });
        return;
      }

      const x = position?.x ?? 0;
      const y = position?.y ?? 0;

      gsap.to(el, {
        scale: 0.9,
        opacity: 0,
        x,
        y: y + 25,
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => {
          el.style.display = "none";
          gsap.set(el, { x, y, scale: 1, opacity: 1 });
        },
      });
    }, [isOpen]);

    useGSAP(() => {
      const el = ref.current;
      if (!el || !isOpen) return;

      const header = el.querySelector("#window-header");
      if (!header) return;

      if (avoidTransforms) {
        let dragPointerId = null;
        let startPointerX = 0;
        let startPointerY = 0;
        let startLeft = 0;
        let startTop = 0;

        const getLeftTop = () => ({
          left: Number.parseFloat(el.style.left) || 0,
          top: Number.parseFloat(el.style.top) || 0,
        });

        const handleResize = () => {
          const rect = el.getBoundingClientRect();
          const current = getLeftTop();
          const clamped = clampTopLeftToViewport(current.left, current.top, rect);
          el.style.left = `${clamped.left}px`;
          el.style.top = `${clamped.top}px`;
          if (clamped.left !== current.left || clamped.top !== current.top) {
            setWindowPosition(windowKey, { x: clamped.left, y: clamped.top });
          }
        };

        const cleanupPointerListeners = () => {
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          window.removeEventListener("pointercancel", onPointerUp);
        };

        const onPointerMove = (event) => {
          if (dragPointerId == null) return;
          if (event.pointerId !== dragPointerId) return;

          const dx = event.clientX - startPointerX;
          const dy = event.clientY - startPointerY;
          const rect = el.getBoundingClientRect();
          const nextLeft = startLeft + dx;
          const nextTop = startTop + dy;
          const clamped = clampTopLeftToViewport(nextLeft, nextTop, rect);
          el.style.left = `${clamped.left}px`;
          el.style.top = `${clamped.top}px`;
        };

        const onPointerUp = (event) => {
          if (dragPointerId == null) return;
          if (event.pointerId !== dragPointerId) return;

          const current = getLeftTop();
          const rect = el.getBoundingClientRect();
          const clamped = clampTopLeftToViewport(current.left, current.top, rect);
          el.style.left = `${clamped.left}px`;
          el.style.top = `${clamped.top}px`;
          setWindowPosition(windowKey, { x: clamped.left, y: clamped.top });

          try {
            header.releasePointerCapture(dragPointerId);
          } catch {
            // ignore
          }

          dragPointerId = null;
          cleanupPointerListeners();
        };

        const onPointerDown = (event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          if (event.target?.closest?.("#window-controls")) return;

          focusWindow(windowKey);
          dragPointerId = event.pointerId;
          startPointerX = event.clientX;
          startPointerY = event.clientY;
          const current = getLeftTop();
          startLeft = current.left;
          startTop = current.top;

          try {
            header.setPointerCapture(dragPointerId);
          } catch {
            // ignore
          }

          cleanupPointerListeners();
          window.addEventListener("pointermove", onPointerMove);
          window.addEventListener("pointerup", onPointerUp);
          window.addEventListener("pointercancel", onPointerUp);

          if (event.cancelable) event.preventDefault();
        };

        header.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("resize", handleResize);

        return () => {
          cleanupPointerListeners();
          window.removeEventListener("resize", handleResize);
          header.removeEventListener("pointerdown", onPointerDown);
        };
      }

      const [instance] = Draggable.create(el, {
        trigger: header,
        dragClickables: true,
        onPress: () => focusWindow(windowKey),
        onDrag: function () {
          const { x: cx, y: cy } = clampTransformToViewport(this.x, this.y);
          gsap.set(el, { x: cx, y: cy });
        },
        onDragEnd: function () {
          const { x: cx, y: cy } = clampTransformToViewport(this.x, this.y);
          gsap.set(el, { x: cx, y: cy });
          setWindowPosition(windowKey, { x: cx, y: cy });
        },
      });
      dragInstanceRef.current = instance;

      const handleResize = () => updateDragBounds(true);

      updateDragBounds(false);
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        instance.kill();
        dragInstanceRef.current = null;
      };
    }, [focusWindow, isOpen, setWindowPosition, windowKey]);

    useLayoutEffect(() => {
      const el = ref.current;
      if (!el) return;
      applyWindowSize(el, size);
    }, [size?.width, size?.height]);

    const getResizeCursor = (handle) => {
      switch (handle) {
        case "n":
        case "s":
          return "ns-resize";
        case "e":
        case "w":
          return "ew-resize";
        case "ne":
        case "sw":
          return "nesw-resize";
        case "nw":
        case "se":
          return "nwse-resize";
        default:
          return "default";
      }
    };

    const handleResizePointerDown = (handle) => (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (!allowResize) return;
      if (resizeStateRef.current.active) return;

      const el = ref.current;
      if (!el) return;

      focusWindow(windowKey);
      event.stopPropagation();

      const rect = el.getBoundingClientRect();
      const startLeft = rect.left;
      const startTop = rect.top;
      const startWidth = rect.width;
      const startHeight = rect.height;

      const startX = event.clientX;
      const startY = event.clientY;
      const startRight = startLeft + startWidth;
      const startBottom = startTop + startHeight;
      let baseLeft = 0;
      let baseTop = 0;

      if (!avoidTransforms) {
        const currentX = Number(gsap.getProperty(el, "x")) || 0;
        const currentY = Number(gsap.getProperty(el, "y")) || 0;
        baseLeft = rect.left - currentX;
        baseTop = rect.top - currentY;
      }

      resizeStateRef.current = {
        active: true,
        handle,
        pointerId: event.pointerId,
        startX,
        startY,
        startWidth,
        startHeight,
        startLeft,
        startTop,
        startRight,
        startBottom,
        baseLeft,
        baseTop,
      };

      const cursor = getResizeCursor(handle);
      document.body.style.cursor = cursor;
      document.body.style.userSelect = "none";

      const handlePointerMove = (moveEvent) => {
        const state = resizeStateRef.current;
        if (!state.active || moveEvent.pointerId !== state.pointerId) return;

        const dx = moveEvent.clientX - state.startX;
        const dy = moveEvent.clientY - state.startY;
        const activeHandle = state.handle || "";

        let width = state.startWidth;
        let height = state.startHeight;
        let left = state.startLeft;
        let top = state.startTop;

        if (activeHandle.includes("e")) width = state.startWidth + dx;
        if (activeHandle.includes("s")) height = state.startHeight + dy;
        if (activeHandle.includes("w")) {
          width = state.startWidth - dx;
          left = state.startLeft + dx;
        }
        if (activeHandle.includes("n")) {
          height = state.startHeight - dy;
          top = state.startTop + dy;
        }

        const safeTop = getSafeTop();
        const maxWidth = Math.max(
          resizeMinWidth,
          window.innerWidth - viewportPadding * 2
        );
        const maxHeight = Math.max(
          resizeMinHeight,
          window.innerHeight - safeTop - viewportPadding * 2
        );

        width = Math.min(Math.max(width, resizeMinWidth), maxWidth);
        height = Math.min(Math.max(height, resizeMinHeight), maxHeight);

        if (activeHandle.includes("w")) {
          left = state.startRight - width;
        }
        if (activeHandle.includes("n")) {
          top = state.startBottom - height;
        }

        const clamped = clampTopLeftToViewport(left, top, { width, height });
        left = clamped.left;
        top = clamped.top;

        applyWindowSize(el, { width, height });

        if (avoidTransforms) {
          el.style.left = `${left}px`;
          el.style.top = `${top}px`;
        } else {
          gsap.set(el, { x: left - state.baseLeft, y: top - state.baseTop });
        }
      };

      const handleEl = event.currentTarget;

      const handlePointerUp = (upEvent) => {
        const state = resizeStateRef.current;
        if (!state.active || upEvent.pointerId !== state.pointerId) return;

        resizeStateRef.current.active = false;

        try {
          handleEl?.releasePointerCapture?.(state.pointerId);
        } catch {
          // ignore
        }

        const rect = el.getBoundingClientRect();
        const nextWidth = Math.round(rect.width);
        const nextHeight = Math.round(rect.height);
        setWindowSize(windowKey, { width: nextWidth, height: nextHeight });

        if (avoidTransforms) {
          const nextLeft = Number.parseFloat(el.style.left) || rect.left;
          const nextTop = Number.parseFloat(el.style.top) || rect.top;
          setWindowPosition(windowKey, { x: nextLeft, y: nextTop });
        } else {
          const nextX = Number(gsap.getProperty(el, "x")) || 0;
          const nextY = Number(gsap.getProperty(el, "y")) || 0;
          setWindowPosition(windowKey, { x: nextX, y: nextY });
          updateDragBounds(true);
        }

        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // ignore
      }

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);

      if (event.cancelable) event.preventDefault();
    };

    useLayoutEffect(() => {
      const el = ref.current;
      if (!el) return;

      if (isOpen) {
        el.style.display = "block";
      } else if (!wasOpenRef.current) {
        el.style.display = "none";
      }

      wasOpenRef.current = isOpen;
    }, [isOpen]);

    if (!hasOpenedRef.current) return null;
    const inlineSize = {};
    if (typeof size?.width === "number" && size.width > 0) {
      inlineSize.width = `${Math.round(size.width)}px`;
    }
    if (typeof size?.height === "number" && size.height > 0) {
      inlineSize.height = `${Math.round(size.height)}px`;
    }

    return (
      <section
        id={windowKey}
        ref={ref}
        style={{ zIndex, ...inlineSize }}
        className={`absolute${enableWindowScroll ? " os-window--scroll" : ""}${
          allowResize ? " os-window--resizable" : ""
        }`}
        onMouseDown={() => focusWindow(windowKey)}
      >
        <Component {...props} />
        {allowResize && isOpen ? (
          <>
            <div
              className="os-window-resize-handle is-n"
              data-resize-handle="n"
              onPointerDown={handleResizePointerDown("n")}
            />
            <div
              className="os-window-resize-handle is-s"
              data-resize-handle="s"
              onPointerDown={handleResizePointerDown("s")}
            />
            <div
              className="os-window-resize-handle is-e"
              data-resize-handle="e"
              onPointerDown={handleResizePointerDown("e")}
            />
            <div
              className="os-window-resize-handle is-w"
              data-resize-handle="w"
              onPointerDown={handleResizePointerDown("w")}
            />
            <div
              className="os-window-resize-handle is-ne"
              data-resize-handle="ne"
              onPointerDown={handleResizePointerDown("ne")}
            />
            <div
              className="os-window-resize-handle is-nw"
              data-resize-handle="nw"
              onPointerDown={handleResizePointerDown("nw")}
            />
            <div
              className="os-window-resize-handle is-se"
              data-resize-handle="se"
              onPointerDown={handleResizePointerDown("se")}
            />
            <div
              className="os-window-resize-handle is-sw"
              data-resize-handle="sw"
              onPointerDown={handleResizePointerDown("sw")}
            />
          </>
        ) : null}
      </section>
    );
  };

  Wrapped.displayName = `WindowWrapper(${
    Component.displayName || Component.name || "Component"
  })`;
  return Wrapped;
};

export default windowWrapper;
