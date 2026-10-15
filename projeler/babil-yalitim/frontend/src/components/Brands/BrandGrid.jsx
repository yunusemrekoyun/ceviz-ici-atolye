// frontend/src/components/Brands/BrandGrid.jsx
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import BrandItem from "./BrandItem";
import useViewportActivation from "../../hooks/useViewportActivation";
import { usePerformanceProfile } from "../../performance/PerformanceProvider";

import brandKoster from "../../assets/brand-koster.png";
import brandSika from "../../assets/brand-sika.png";
import brandOde from "../../assets/brand-ode.png";
import brandHuntsman from "../../assets/brand-huntsman.png";
import brandAbSchomburg from "../../assets/brand-AB-Schomburg.png";
import brandOnduline from "../../assets/brand-onduline.svg";
import brandNaturelMuhendislik from "../../assets/brand-naturelmuhendislik.png";
import brandPhurex from "../../assets/brand-phurex.png";
import brandTekno from "../../assets/brand-tekno.png";

const brands = [
  { id: 1, name: "Koster", img: brandKoster, link: "https://www.kostermarket.com/" },
  { id: 2, name: "Sika", img: brandSika, link: "https://tur.sika.com/" },
  { id: 3, name: "ODE", img: brandOde, link: "https://ode.com.tr" },
  { id: 4, name: "Phurex", img: brandPhurex, link: "https://phurex.com/" },
  { id: 5, name: "Huntsman", img: brandHuntsman, link: "https://huntsman.com" },
  {
    id: 6,
    name: "AB Schomburg",
    img: brandAbSchomburg,
    link: "https://ab-schomburg.com.tr/",
  },
  {
    id: 7,
    name: "Onduline Avrasya",
    img: brandOnduline,
    link: "https://tr.onduline.com/",
  },
  {
    id: 8,
    name: "Natürel Mühendislik",
    img: brandNaturelMuhendislik,
    link: "https://www.naturelmuhendislik.com.tr/",
  },
  {
    id: 9,
    name: "Tekno Yapı Kimyasalları",
    img: brandTekno,
    link: "https://teknoyapi.com.tr/",
  },
];

const LOOP_COPIES = 3;
const RESUME_DELAY_MS = 1000;

const BrandGrid = () => {
  const [ref, inView] = useViewportActivation({
    once: false,
    rootMargin: "120px 0px",
  });
  const { allowMarquee, isMobile, tier } = usePerformanceProfile();

  const wrapperRef = useRef(null);
  const innerRef = useRef(null);
  const autoScrollRef = useRef(0);
  const resumeTimerRef = useRef(0);
  // Tracks current translateX as a float — no integer snapping
  const posRef = useRef(0);
  // Cached segment width, updated on mount and resize (avoids layout reads every frame)
  const segWidthRef = useRef(0);
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startPos: 0,
    moved: false,
    pointerId: null,
  });
  const suppressClickRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

  const fullList = useMemo(() => [...brands, ...brands, ...brands], []);

  const autoScrollSpeed =
    tier === "low"
      ? isMobile ? 0.32 : 0.42
      : tier === "standard"
        ? isMobile ? 0.5 : 0.64
        : isMobile ? 0.66 : 0.8;

  // Write position directly to DOM via transform — GPU-composited, sub-pixel smooth
  const applyPos = useCallback((pos) => {
    posRef.current = pos;
    if (innerRef.current) {
      innerRef.current.style.transform = `translate3d(${pos}px, 0, 0)`;
    }
  }, []);

  // Keep translateX within [-2*seg, 0) so the middle copy is always visible
  const normalizePos = useCallback((pos) => {
    const seg = segWidthRef.current;
    if (!seg) return pos;
    let p = pos;
    while (p <= -2 * seg) p += seg;
    while (p >= 0) p -= seg;
    return p;
  }, []);

  const updateSegWidth = useCallback(() => {
    segWidthRef.current = innerRef.current
      ? innerRef.current.scrollWidth / LOOP_COPIES
      : 0;
  }, []);

  // Initialize position synchronously before first paint to avoid flash
  useLayoutEffect(() => {
    updateSegWidth();
    if (segWidthRef.current > 0) {
      applyPos(-segWidthRef.current);
    }
  }, [updateSegWidth, applyPos]);

  // Re-normalize on resize
  useEffect(() => {
    const sync = () => {
      updateSegWidth();
      applyPos(normalizePos(posRef.current));
    };
    window.addEventListener("resize", sync, { passive: true });
    return () => window.removeEventListener("resize", sync);
  }, [updateSegWidth, applyPos, normalizePos]);

  // Auto-scroll animation — runs every rAF, float speed applied directly (no truncation)
  useEffect(() => {
    const step = () => {
      autoScrollRef.current = window.requestAnimationFrame(step);

      if (
        !allowMarquee ||
        !inView ||
        isPaused ||
        dragStateRef.current.isDragging
      ) {
        return;
      }

      applyPos(normalizePos(posRef.current - autoScrollSpeed));
    };

    autoScrollRef.current = window.requestAnimationFrame(step);
    return () => {
      if (autoScrollRef.current) window.cancelAnimationFrame(autoScrollRef.current);
    };
  }, [allowMarquee, autoScrollSpeed, inView, isPaused, normalizePos, applyPos]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
      if (autoScrollRef.current) window.cancelAnimationFrame(autoScrollRef.current);
    };
  }, []);

  const pauseAutoplay = useCallback(() => {
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = 0;
    setIsPaused(true);
  }, []);

  const scheduleResume = useCallback(() => {
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      setIsPaused(false);
      resumeTimerRef.current = 0;
    }, RESUME_DELAY_MS);
  }, []);

  const handlePointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    pauseAutoplay();
    dragStateRef.current = {
      isDragging: true,
      startX: event.clientX,
      startPos: posRef.current,
      moved: false,
      pointerId: event.pointerId,
    };
    wrapperRef.current?.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const ds = dragStateRef.current;
    if (!ds.isDragging) return;

    const deltaX = event.clientX - ds.startX;
    if (Math.abs(deltaX) > 6) ds.moved = true;

    applyPos(normalizePos(ds.startPos + deltaX));
  };

  const finishDrag = () => {
    const ds = dragStateRef.current;
    if (!ds.isDragging) return;

    if (ds.moved) suppressClickRef.current = true;

    dragStateRef.current = {
      isDragging: false,
      startX: 0,
      startPos: 0,
      moved: false,
      pointerId: null,
    };

    scheduleResume();
  };

  const handlePointerUp = () => {
    if (wrapperRef.current && dragStateRef.current.pointerId !== null) {
      wrapperRef.current.releasePointerCapture?.(dragStateRef.current.pointerId);
    }
    finishDrag();
  };

  const handleClickCapture = (event) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      ref={ref}
      id="brands"
      className="relative mt-2 w-full overflow-hidden sm:mt-5"
    >
      <div
        ref={wrapperRef}
        className={`select-none ${
          isMobile ? "" : "cursor-grab active:cursor-grabbing"
        }`}
        style={{ touchAction: "pan-x" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onClickCapture={handleClickCapture}
      >
        <div
          ref={innerRef}
          className="flex w-max items-center py-1"
          style={{ willChange: "transform" }}
        >
          {fullList.map((brand, index) => (
            <div
              key={`${brand.id}-${index}`}
              className={isMobile ? "mx-2.5 shrink-0" : "mx-3 shrink-0 sm:mx-8"}
            >
              <BrandItem brand={brand} disableLink={isMobile} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BrandGrid;
