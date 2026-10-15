import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const LoadingText = React.forwardRef(function LoadingText({ text }, ref) {
  return (
    <div ref={ref} className="phone-loading-text">
      {String(text ?? "")
        .split("")
        .map((char, idx) => (
          <span key={idx} className="phone-loading-letter">
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
    </div>
  );
});

const PhoneLoadingScreen = ({
  active = false,
  text = "iPhone Mirroring",
  durationMs = 1300,
  onDone,
}) => {
  const textRef = useRef(null);

  useGSAP(() => {
    if (!active) return undefined;

    const letters = textRef.current?.querySelectorAll?.(".phone-loading-letter");
    if (!letters?.length) return undefined;

    gsap.set(letters, { color: "#cbd5e1" });
    gsap.to(letters, {
      color: "#ffffff",
      duration: 0.6,
      stagger: 0.05,
      ease: "power2.out",
    });

    const timer = window.setTimeout(() => onDone?.(), durationMs);
    return () => window.clearTimeout(timer);
  }, [active, durationMs, onDone]);

  if (!active) return null;

  return (
    <div className="phone-loading">
      <LoadingText ref={textRef} text={text} />
    </div>
  );
};

export default PhoneLoadingScreen;

