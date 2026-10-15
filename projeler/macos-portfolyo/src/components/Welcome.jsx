import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { welcomeCopy } from "#constants";

const FONT_WEIGHTS = {
  subtitle: { min: 100, max: 400, default: 100 },
  title: { min: 400, max: 900, default: 400 },
};

const renderText = (text, className, baseWeight = 400) => {
  return [...text].map((char, i) => (
    <span
      key={i}
      className={className}
      style={{
        "--wght": String(baseWeight),
        fontVariationSettings: "'wght' var(--wght)",
      }}
    >
      {char === " " ? "\u00A0" : char}
    </span>
  ));
};

const setUpTextHover = (container, type) => {
  if (!container) return;

  const letters = Array.from(container.querySelectorAll("span"));
  const { min, max, default: base } = FONT_WEIGHTS[type];
  if (!letters.length) return;

  const items = letters.map((letter) => ({
    el: letter,
    centerX: 0,
    toWeight: gsap.quickTo(letter, "--wght", {
      duration: 0.25,
      ease: "power2.out",
    }),
  }));

  let containerRect = container.getBoundingClientRect();
  let rafId = null;
  let mouseX = 0;

  const updateGeometry = () => {
    containerRect = container.getBoundingClientRect();
    items.forEach((item) => {
      const rect = item.el.getBoundingClientRect();
      item.centerX = rect.left - containerRect.left + rect.width / 2;
    });
  };

  const tick = () => {
    rafId = null;
    items.forEach((item) => {
      const distance = Math.abs(mouseX - item.centerX);
      const intensity = Math.exp(-(distance ** 2) / 2000);
      const weight = Math.round(min + (max - min) * intensity);
      item.toWeight(weight);
    });
  };

  const handleMouseMove = (e) => {
    mouseX = e.clientX - containerRect.left;
    if (rafId) return;
    rafId = window.requestAnimationFrame(tick);
  };

  const handleMouseLeave = () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    items.forEach((item) => item.toWeight(base));
  };

  updateGeometry();
  const resizeObserver = new ResizeObserver(updateGeometry);
  resizeObserver.observe(container);
  window.addEventListener("resize", updateGeometry);

  container.addEventListener("mousemove", handleMouseMove);
  container.addEventListener("mouseleave", handleMouseLeave);

  return () => {
    if (rafId) window.cancelAnimationFrame(rafId);
    window.removeEventListener("resize", updateGeometry);
    resizeObserver.disconnect();
    container.removeEventListener("mousemove", handleMouseMove);
    container.removeEventListener("mouseleave", handleMouseLeave);
  };
};

const Welcome = () => {
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  useGSAP(() => {
    const cleanupTitle = setUpTextHover(titleRef.current, "title");
    const cleanupSubtitle = setUpTextHover(subtitleRef.current, "subtitle");

    return () => {
      cleanupTitle?.();
      cleanupSubtitle?.();
    };
  }, []);

  return (
    <section id="welcome">
      <p ref={subtitleRef}>
        {renderText(welcomeCopy.subtitle, "text-3xl font-georama", 100)}
      </p>
      <h1 ref={titleRef} className="mt-7">
        {renderText(welcomeCopy.title, "text-9xl italic font-georama")}
      </h1>

      <div className="small-screen">
        <p></p>
      </div>
    </section>
  );
};

export default Welcome;
