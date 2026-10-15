import assert from "node:assert/strict";
import { SceneMotion } from "../components/home/scene-motion";
import { SectionWheelGesture } from "../components/home/section-gestures";

const swipe = new SectionWheelGesture();
let sections = 0;
for (let time = 0; time < 1800; time += 16) sections += swipe.push(30 * Math.exp(-time / 500), time);
assert.equal(sections, 1, "one sustained trackpad gesture selects one section");
assert.equal(swipe.push(80, 2200), 1);
assert.equal(swipe.push(-40, 2250), -1, "deliberate reversal responds immediately");
assert.equal(swipe.push(-20, 2280), 0);
const noise = new SectionWheelGesture();
assert.equal(noise.push(4, 0), 0);
assert.equal(noise.push(4, 10), 0);
assert.equal(noise.push(4, 20), 1);

// A new section must start from the visible intermediate pose and cancel its predecessor.
class ElementStub {
  style = { transform: "none", opacity: "1" };
  visible = { transform: "matrix(1,0,0,1,5,7)", opacity: "0.8" };
  requests: { frames: Keyframe[]; cancelled: boolean; onfinish: (() => void) | null; cancel: () => void }[] = [];
  animate(frames: Keyframe[]) {
    const animation = { frames, cancelled: false, onfinish: null as (() => void) | null, cancel() { this.cancelled = true; } };
    this.requests.push(animation);
    return animation as unknown as Animation;
  }
}
const original = globalThis.getComputedStyle;
globalThis.getComputedStyle = el => (el as unknown as ElementStub).visible as CSSStyleDeclaration;
try {
  const element = new ElementStub();
  const motion = new SceneMotion(element as unknown as HTMLElement);
  motion.select({ transform: "translateX(100px)", opacity: 1 });
  element.visible = { transform: "matrix(1,0,0,1,42,7)", opacity: "0.9" };
  motion.select({ transform: "translateX(-20px)", opacity: 0.5 });
  assert.equal(element.requests[0]!.cancelled, true);
  assert.deepEqual(element.requests[1]!.frames[0], element.visible, "interruption uses the pose on screen");
  element.requests[0]!.onfinish?.();
  motion.finish();
  assert.equal(element.requests[1]!.cancelled, true, "stale completion cannot discard the new animation");
  assert.equal(element.style.transform, "translateX(-20px)", "hidden tabs keep the latest target");
  motion.select({ transform: "scale(.8)", opacity: 1 });
  motion.reduce();
  assert.equal(element.requests[2]!.cancelled, true);
  assert.equal(element.requests.length, 3, "reduced motion creates no animation");
  assert.equal(element.style.transform, "scale(.8)");
  motion.dispose();
  console.log("Homepage gesture, interruptible scene and reduced-motion checks passed.");
} finally { globalThis.getComputedStyle = original; }
