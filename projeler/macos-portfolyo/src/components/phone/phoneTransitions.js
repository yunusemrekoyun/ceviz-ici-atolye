import gsap from "gsap";

const EDGE_OFFSET_RATIO = 0.28;
const MIN_WIDTH = 320;
const DEFAULT_DURATION = 0.32;
const FORWARD_FROM_OPACITY = 0.92;

const getStageWidth = (stageEl) => {
  if (!stageEl) return MIN_WIDTH;
  const width = stageEl.getBoundingClientRect?.().width ?? 0;
  return Math.max(MIN_WIDTH, Number(width) || 0);
};

const prefersReducedMotion = () => {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  } catch {
    return false;
  }
};

const runIOSSlideTransition = ({
  stageEl,
  fromEl,
  toEl,
  direction = "forward", // forward | back
  duration = DEFAULT_DURATION,
  onComplete,
} = {}) => {
  if (!fromEl || !toEl) return null;

  const reduceMotion = prefersReducedMotion();
  const width = getStageWidth(stageEl);
  const edgeOffset = Math.round(width * EDGE_OFFSET_RATIO);
  const inX = direction === "forward" ? width : -edgeOffset;
  const outX = direction === "forward" ? -edgeOffset : width;
  const fromOpacity = direction === "forward" ? FORWARD_FROM_OPACITY : 1;

  gsap.set([fromEl, toEl], { willChange: "transform, opacity" });
  gsap.set(fromEl, { x: 0, opacity: 1 });
  gsap.set(toEl, { x: inX, opacity: 1 });

  if (reduceMotion) {
    gsap.set(fromEl, { x: outX, opacity: fromOpacity });
    gsap.set(toEl, { x: 0, opacity: 1 });
    gsap.set([fromEl, toEl], { clearProps: "willChange" });
    onComplete?.();
    return null;
  }

  const tl = gsap.timeline({
    defaults: { overwrite: "auto" },
    onComplete: () => {
      gsap.set([fromEl, toEl], { clearProps: "willChange" });
      onComplete?.();
    },
  });

  tl.to(fromEl, { x: outX, opacity: fromOpacity, duration, ease: "power2.out" }, 0)
    .to(toEl, { x: 0, opacity: 1, duration, ease: "power3.out" }, 0)
    .set(toEl, { clearProps: "transform" })
    .set(fromEl, { clearProps: "transform,opacity" });

  return tl;
};

export { runIOSSlideTransition };

