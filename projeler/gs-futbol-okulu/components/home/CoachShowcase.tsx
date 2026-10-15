"use client";
import { useEffect, useRef } from "react";
import { ArrowDown } from "lucide-react";
import type { HomeCoach } from "@/lib/home-coaches";
import "./coaches.css";

export function CoachShowcase({ coaches, active }: { coaches: readonly HomeCoach[]; active: boolean }) {
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroll.current;
    if (!el || !active || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { (entry.target as HTMLElement).dataset.visible = String(entry.isIntersecting); });
    }, { root: el, threshold: .35 });
    el.querySelectorAll(".coach-profile").forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [active]);
  return (
    <div className="coach-scroll" ref={scroll} tabIndex={0} role="region" aria-label="Hocaların tanıtımları, bu alanda kaydırabilirsiniz">
      {coaches.map((coach, index) => (
        <article className="coach-profile" key={coach.id} data-visible="true">
          <div className="coach-art"><div className="coach-art-circle"/><div className="coach-sticker">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coach.photo} alt={coach.name} width={640} height={760} loading="lazy" draggable="false"/>
          </div></div>
          <div className="coach-copy">{coach.isDemo ? <span className="coach-demo-label">Örnek profil</span> : null}<p className="coach-role">{coach.role}</p><h3>{coach.name}</h3><p className="coach-bio">{coach.bio}</p>
            {index < coaches.length - 1 ? <p className="coach-next"><ArrowDown size={16} aria-hidden="true"/> Diğer hocayla tanışmak için bu alanı kaydırın</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
