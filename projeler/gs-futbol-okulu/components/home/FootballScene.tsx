"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { SceneMotion, type ScenePose } from "./scene-motion";
import "./football-scene.css";

type Part = "pitch" | "ball" | "shadow" | "crest" | "goal" | "pin" | "route";
const pose = (transform: string, opacity = 1): ScenePose => ({ transform, opacity });
const center = "translate(-50%, -50%)";
const POSES: Record<Part, ScenePose[]> = {
  pitch: [52, 12, 38, 8].map((tilt, i) => pose(`${center} perspective(900px) rotateX(${tilt}deg) rotateZ(${[-18, -8, -4, 0][i]}deg) scale(${[1.08, 1, 1.04, .9][i]})`, i === 3 ? .45 : 1)),
  ball: [pose(`${center} rotate(-16deg)`), pose(`${center} translate(-48%, 36%) scale(.65) rotate(28deg)`), pose(`${center} translate(10%, -42%) scale(.45) rotate(105deg)`), pose(`${center} translate(45%, 40%) scale(.38) rotate(145deg)`, 0)],
  shadow: [pose(`${center} scale(1)`), pose(`${center} translate(-40%, 15%) scale(.7)`), pose(`${center} translate(10%, -120%) scale(.4)`, .5), pose(`${center} scale(.4)`, 0)],
  crest: [pose(`${center} rotate(8deg)`), pose(`${center} translate(8%, -10%) rotate(0deg) scale(.85)`, .6), pose(`${center} translate(8%, -10%) rotate(0deg) scale(.75)`, .35), pose(`${center} translateY(-14%) rotate(0deg) scale(.85)`, 0)],
  goal: [pose(`${center} translateY(-15%) scale(.85)`, 0), pose(`${center} scale(.9)`, .35), pose(`${center} scale(1)`, 1), pose(`${center} scale(.9)`, 0)],
  pin: [pose(`${center} translateY(20%) scale(.8)`, 0), pose(`${center} translateY(20%) scale(.8)`, 0), pose(`${center} translateY(20%) scale(.8)`, 0), pose(`${center} scale(1)`, 1)],
  route: [pose("scaleX(.75)", 0), pose("scaleX(1)", 1), pose("scaleX(1)", .45), pose("scaleX(.85)", 0)],
};
const CAPTIONS = ["Aynı arma. Aynı heyecan.", "İlk pas. Yeni arkadaşlar.", "Birlikte başlayalım.", "Kütahya’da, sahada."];

export function FootballScene({ scene }: { scene: number }) {
  const root = useRef<HTMLDivElement>(null);
  const motion = useRef<Map<Part, SceneMotion>>(new Map());

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const part of Object.keys(POSES) as Part[]) {
      let controller = motion.current.get(part);
      if (!controller) {
        const node = el.querySelector<HTMLElement>(`[data-part="${part}"]`);
        if (!node) continue;
        controller = new SceneMotion(node);
        motion.current.set(part, controller);
      }
      controller.select(POSES[part][scene] ?? POSES[part][0]!, reduced, part === "ball" ? 1000 : 700);
    }
  }, [scene]);

  useEffect(() => {
    const controllers = motion.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => { if (reduced.matches) controllers.forEach(c => c.reduce()); };
    const visibility = () => { if (document.hidden) controllers.forEach(c => c.finish()); };
    reduced.addEventListener("change", reduce);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      reduced.removeEventListener("change", reduce);
      document.removeEventListener("visibilitychange", visibility);
      controllers.forEach(c => c.dispose());
      controllers.clear();
    };
  }, []);

  return (
    <div className="football-scene" ref={root} data-section={scene} aria-hidden="true">
      <div className="football-scene-disc" />
      <span className="football-scene-city">KÜTAHYA</span>
      <div className="football-pitch" data-part="pitch">
        <svg viewBox="0 0 600 380" fill="none">
          <defs>
            <linearGradient id="gs-pitch" x1="0" y1="0" x2="600" y2="380" gradientUnits="userSpaceOnUse"><stop stopColor="#a7193c"/><stop offset="1" stopColor="#670c25"/></linearGradient>
            <pattern id="gs-grass" width="60" height="380" patternUnits="userSpaceOnUse"><path fill="white" fillOpacity=".035" d="M0 0H30V380H0z"/></pattern>
          </defs>
          <rect x="2" y="2" width="596" height="376" rx="14" fill="url(#gs-pitch)"/>
          <rect x="2" y="2" width="596" height="376" rx="14" fill="url(#gs-grass)"/>
          <g stroke="#f9e8e6" strokeWidth="2" strokeOpacity=".75">
            <rect x="25" y="24" width="550" height="332" rx="2"/><path d="M300 24V356"/>
            <circle cx="300" cy="190" r="50"/><circle cx="300" cy="190" r="3" fill="#f9e8e6"/>
            <path d="M25 102H118V278H25M575 102H482V278H575M25 145H65V235H25M575 145H535V235H575"/>
            <path d="M118 151A48 48 0 0 1 118 229M482 151A48 48 0 0 0 482 229"/>
          </g>
          <g fill="#fdb912"><circle cx="165" cy="260" r="7"/><circle cx="325" cy="230" r="7"/><circle cx="440" cy="130" r="7"/></g>
        </svg>
        <div className="football-route" data-part="route">
          <svg viewBox="0 0 600 380" fill="none"><path d="M165 260Q220 190 325 230T440 130" stroke="#fdb912" strokeWidth="3" strokeDasharray="8 8"/><path d="m423 133 17-3-1 17" stroke="#fdb912" strokeWidth="3" strokeLinecap="round"/></svg>
        </div>
      </div>
      <div className="football-goal" data-part="goal">
        <svg viewBox="0 0 240 150" fill="none">
          <defs><pattern id="gs-net" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 0H14V14" stroke="#fdb912" strokeOpacity=".45" strokeWidth="1"/></pattern></defs>
          <path d="M25 40 53 17H208L218 114 199 137H25Z" fill="#83112e"/>
          <path d="M25 40H199V137H25Z" fill="url(#gs-net)"/>
          <path d="M25 137V40H199V137M25 40 53 17H208L218 114 199 137M199 40 208 17" stroke="#fff" strokeWidth="5" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="football-shadow" data-part="shadow" />
      <div className="football-ball" data-part="ball">
        {/* The illustration is vector art; rotation/scale happen on its composited wrapper. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home/football.svg" width="320" height="320" alt="" fetchPriority="high" draggable="false" />
      </div>
      <div className="football-crest" data-part="crest">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home/crest.webp" width="100" height="100" alt="" draggable="false"/>
      </div>
      <div className="football-pin" data-part="pin">
        <svg viewBox="0 0 180 230" fill="none"><path d="M90 217S17 140 17 91a73 73 0 1 1 146 0c0 49-73 126-73 126Z" fill="#fdb912"/><circle cx="90" cy="90" r="50" fill="#fff"/></svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/home/crest.webp" width="84" height="84" alt="" draggable="false"/>
      </div>
      <p className="football-caption" key={scene}>{CAPTIONS[scene]}</p>
    </div>
  );
}
