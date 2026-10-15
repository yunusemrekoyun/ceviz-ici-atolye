/**
 * Loads the hero video frames (WebP sequence) progressively and draws them on a canvas.
 * Frame 0 is fetched first so the page can paint immediately; the rest stream in with limited concurrency.
 */

export type FrameSet = "lg" | "sm";

export type NearestFrame = { image: HTMLImageElement; index: number } | null;

export class FrameSequence {
  readonly count: number;
  private readonly set: FrameSet;
  private readonly images: Array<HTMLImageElement | null>;
  private loadedCount = 0;
  private started = false;
  private disposed = false;
  onFrameLoaded?: (index: number) => void;

  constructor(set: FrameSet, count: number) {
    this.set = set;
    this.count = count;
    this.images = new Array<HTMLImageElement | null>(count).fill(null);
  }

  url(index: number): string {
    return `/landing/frames/${this.set}/f-${String(index + 1).padStart(3, "0")}.webp`;
  }

  get loaded(): number {
    return this.loadedCount;
  }

  isLoaded(index: number): boolean {
    return this.images[index] !== null;
  }

  /** Closest loaded frame to `index`, preferring earlier frames so motion never jumps ahead. */
  nearest(index: number): NearestFrame {
    const clamped = Math.max(0, Math.min(this.count - 1, index));
    for (let d = 0; d < this.count; d++) {
      const down = clamped - d;
      if (down >= 0) {
        const img = this.images[down];
        if (img) return { image: img, index: down };
      }
      const up = clamped + d;
      if (up < this.count) {
        const img = this.images[up];
        if (img) return { image: img, index: up };
      }
    }
    return null;
  }

  start(concurrency = 6): void {
    if (this.started) return;
    this.started = true;

    let next = 0;
    const loadOne = (index: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          if (!this.disposed) {
            this.images[index] = img;
            this.loadedCount++;
            this.onFrameLoaded?.(index);
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = this.url(index);
      });

    const worker = async () => {
      while (next < this.count && !this.disposed) {
        const index = next++;
        await loadOne(index);
      }
    };

    // First frame alone, then the rest in parallel.
    void loadOne(next++).then(() => {
      for (let i = 0; i < concurrency; i++) void worker();
    });
  }

  dispose(): void {
    this.disposed = true;
    this.onFrameLoaded = undefined;
  }
}

/** Draws `image` into a canvas context with object-fit: cover semantics. */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
): void {
  const iw = image.naturalWidth || 1;
  const ih = image.naturalHeight || 1;
  const scale = Math.max(width / iw, height / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;
  ctx.drawImage(image, dx, dy, dw, dh);
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
