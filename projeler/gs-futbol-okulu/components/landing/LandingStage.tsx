"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import manifest from "@/public/landing/frames/manifest.json";
import { NAV_ITEMS } from "./content";
import { drawCover, FrameSequence, smoothstep, type FrameSet } from "./frame-sequence";
import { LandingHeader } from "./LandingHeader";
import { AboutSection, HeroSection, RegisterSection, TrainingSection } from "./sections";

const SECTION_COUNT = NAV_ITEMS.length;
/** Viewport heights of scrolling per section; the video is scrubbed across the whole range. */
const SCROLL_PER_SECTION = 1;
const FADE = 0.16;
const LERP = 0.16;

export function LandingStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dimRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const scrollToSection = useCallback((index: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const top = stage.getBoundingClientRect().top + window.scrollY;
    const scrollable = stage.offsetHeight - window.innerHeight;
    const target = index <= 0 ? top : top + ((index + 0.5) / SECTION_COUNT) * scrollable;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: target, behavior: reduce ? "auto" : "smooth" });
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const set: FrameSet = window.innerWidth <= 768 ? "sm" : "lg";
    const seq = new FrameSequence(set, manifest.count);

    let target = 0;
    let current = 0;
    let raf = 0;
    let drawnIndex = -1;
    let lastActive = -1;
    let width = 0;
    let height = 0;

    const draw = (force = false) => {
      const wanted = Math.round(current * (seq.count - 1));
      const frame = seq.nearest(wanted);
      if (!frame) return;
      if (!force && frame.index === drawnIndex) return;
      drawnIndex = frame.index;
      ctx.clearRect(0, 0, width, height);
      drawCover(ctx, frame.image, width, height);
    };

    const updateLayers = () => {
      const slot = 1 / SECTION_COUNT;
      for (let i = 0; i < SECTION_COUNT; i++) {
        const el = layerRefs.current[i];
        if (!el) continue;
        const local = (current - i * slot) / slot;
        const isLast = i === SECTION_COUNT - 1;
        let opacity = 0;
        let shift = 0;
        if (local >= 0 && (local < 1 || (isLast && local <= 1))) {
          const fadeIn = i === 0 ? 1 : smoothstep(0, FADE, local);
          const fadeOut = isLast ? 1 : 1 - smoothstep(1 - FADE, 1, local);
          opacity = Math.min(fadeIn, fadeOut);
          shift = reduce ? 0 : (1 - fadeIn) * 28 - (1 - fadeOut) * 28;
        }
        el.style.opacity = opacity.toFixed(3);
        el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
        el.dataset.active = opacity > 0.5 ? "true" : "false";
      }
      // Darken the video once the hero is left so the text sections stay readable.
      if (dimRef.current) {
        const dim = 0.42 * smoothstep(0.12, 0.3, current);
        dimRef.current.style.opacity = dim.toFixed(3);
      }
      const next = Math.min(SECTION_COUNT - 1, Math.floor(current * SECTION_COUNT + 1e-6));
      if (next !== lastActive) {
        lastActive = next;
        setActive(next);
      }
    };

    const tick = () => {
      raf = 0;
      const diff = target - current;
      current = reduce || Math.abs(diff) < 0.0006 ? target : current + diff * LERP;
      draw();
      updateLayers();
      if (current !== target) raf = requestAnimationFrame(tick);
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const readScroll = () => {
      const rect = stage.getBoundingClientRect();
      const scrollable = stage.offsetHeight - window.innerHeight;
      const progress = scrollable > 0 ? -rect.top / scrollable : 0;
      target = Math.min(1, Math.max(0, progress));
      schedule();
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(true);
      readScroll();
    };

    seq.onFrameLoaded = () => {
      // A closer frame may have arrived for the current position.
      if (!raf) draw();
    };
    seq.start();

    resize();
    updateLayers();
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
      seq.dispose();
    };
  }, []);

  const sections = [
    <HeroSection key="hero" onExplore={() => scrollToSection(1)} />,
    <AboutSection key="about" />,
    <TrainingSection key="training" />,
    <RegisterSection key="register" />,
  ];

  return (
    <div ref={stageRef} style={{ height: `${(SECTION_COUNT * SCROLL_PER_SECTION + 1) * 100}vh` }}>
      <div className="sticky top-0 h-[100dvh] p-2 sm:p-4 lg:p-6">
        <div className="relative h-full w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#7a0a24] shadow-2xl sm:rounded-[36px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- first frame, shown until the canvas paints */}
          <img
            src="/landing/frames/poster.webp"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <canvas ref={canvasRef} className="lp-canvas" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.12)_35%,rgba(0,0,0,0.18)_65%,rgba(0,0,0,0.6)_100%)]" />
          <div ref={dimRef} className="lp-dim" />

          <LandingHeader active={active} onNavigate={scrollToSection} />

          {sections.map((section, i) => (
            <div
              key={NAV_ITEMS[i]?.id ?? i}
              id={NAV_ITEMS[i]?.id}
              ref={(el) => {
                layerRefs.current[i] = el;
              }}
              className="lp-layer z-20"
              data-active={i === 0 ? "true" : "false"}
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              {section}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
