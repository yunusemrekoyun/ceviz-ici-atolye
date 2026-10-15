/** A wheel burst, including its inertial tail, selects only one section. */
export class SectionWheelGesture {
  private lastEvent = -Infinity;
  private direction = 0;
  private distance = 0;
  private fired = false;

  push(delta: number, now: number): number {
    if (!delta) return 0;
    const direction = Math.sign(delta);
    if (now - this.lastEvent > 220 || direction !== this.direction) {
      this.distance = 0;
      this.fired = false;
    }
    this.lastEvent = now;
    this.direction = direction;
    this.distance += Math.abs(delta);
    if (this.fired || this.distance < 12) return 0;
    this.fired = true;
    return direction;
  }
}

/** Keep native scrolling inside an overflowing panel, even at either edge. */
export function hasLocalScroll(target: EventTarget | null, root: HTMLElement): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select, [contenteditable], [role='textbox']")) return true;
  for (let el: Element | null = target; el && el !== root; el = el.parentElement) {
    if (el.scrollHeight > el.clientHeight + 1 && /^(auto|scroll)$/.test(getComputedStyle(el).overflowY)) return true;
  }
  return false;
}
