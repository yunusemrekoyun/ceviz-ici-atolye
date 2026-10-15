export type ScenePose = { transform: string; opacity: number };

/** Retarget from the visible pose. No queued timelines or per-frame React updates. */
export class SceneMotion {
  private animation: Animation | null = null;
  private pose: ScenePose | null = null;

  constructor(private element: HTMLElement) {}

  select(pose: ScenePose, reduced = false, duration = 700) {
    const current = getComputedStyle(this.element);
    const from = { transform: current.transform, opacity: current.opacity };
    this.animation?.cancel();
    this.animation = null;
    this.pose = pose;
    this.element.style.transform = pose.transform;
    this.element.style.opacity = String(pose.opacity);
    if (reduced || typeof this.element.animate !== "function") return;
    const animation = this.element.animate(
      [from, { transform: pose.transform, opacity: pose.opacity }],
      { duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
    this.animation = animation;
    animation.onfinish = () => {
      if (this.animation === animation) this.animation = null;
    };
  }

  finish() {
    this.animation?.cancel();
    this.animation = null;
    // The target already lives in the underlying style, including without WAAPI.
  }

  reduce() {
    if (this.pose) this.select(this.pose, true);
  }

  dispose() { this.finish(); }
}
