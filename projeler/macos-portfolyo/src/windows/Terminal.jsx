import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Check, Flag } from "lucide-react";

import WindowControls from "#components/WindowControls.jsx";
import { techStack } from "#constants/index.js";
import WindowWrapper from "#hoc/windowWrapper.jsx";
import useWindowStore from "#store/window.js";

const TYPE_SPEED = 0.04; 
const LOADING_DURATION = 1.4;

const Terminal = () => {
  const isOpen = useWindowStore((state) => state.windows.terminal.isOpen);
  const openWindow = useWindowStore((state) => state.openWindow);
  const [phase, setPhase] = useState("idle");
  const [typedText, setTypedText] = useState("");
  const [visibleRows, setVisibleRows] = useState(0);
  const [hireInput, setHireInput] = useState("");
  const [hireStatus, setHireStatus] = useState("idle"); 
  const command = "show tech stack";
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const prevHeightRef = useRef(null);
  const resizeTlRef = useRef(null);

  const rows = useMemo(() => techStack, []);

  useEffect(() => {
    if (!isOpen) return;
    if (phase !== "showing") return;

    const container = containerRef.current;
    const list = listRef.current;
    if (!container || !list) return;


    if (resizeTlRef.current) {
      resizeTlRef.current.kill();
      resizeTlRef.current = null;
    }
    gsap.killTweensOf(container);

    const startHeight =
      prevHeightRef.current ?? container.getBoundingClientRect().height;

    const targetHeight = container.scrollHeight || startHeight;

    prevHeightRef.current = targetHeight;


    gsap.set(container, { height: startHeight, overflow: "hidden" });

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => {
        container.style.height = "auto";
        container.style.overflow = "visible";
      },
    });


    tl.to(container, {
      height: targetHeight,
      duration: 0.28,
      overwrite: "auto",
    });

    resizeTlRef.current = tl;
  }, [visibleRows, phase, isOpen]);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("typing");
      setTypedText("");
      setVisibleRows(0);
      setHireInput("");
      setHireStatus("idle");
    } else {
      setPhase("idle");
      setTypedText("");
      setVisibleRows(0);
      setHireInput("");
      setHireStatus("idle");
    }
  }, [isOpen]);

  useEffect(() => {
    if (phase !== "typing") return;

    const tl = gsap.timeline({
      onComplete: () => setPhase("loading"),
    });

    command.split("").forEach((char, idx) => {
      tl.to(
        {},
        {
          duration: TYPE_SPEED,
          onComplete: () => setTypedText((prev) => prev + char),
        },
        idx * TYPE_SPEED
      );
    });

    return () => {
      tl.kill();
    };
  }, [command, phase]);

  useEffect(() => {
    if (phase !== "loading") return;

    const timer = setTimeout(() => {
      setPhase("showing");
    }, LOADING_DURATION * 1000);

    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "showing") return;

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
    });

    rows.forEach((_, idx) => {
      tl.to(
        {},
        {
          duration: 0.15,
          onComplete: () =>
            setVisibleRows((prev) => Math.min(prev + 1, rows.length)),
        },
        idx * 0.15
      );
    });

    return () => {
      tl.kill();
    };
  }, [phase, rows]);

  const handleHireSubmit = (e) => {
    e.preventDefault();
    const value = hireInput.trim().toLowerCase();
    if (!value) return;

    if (value.includes("hire him") || value === "hire") {
      setHireStatus("processing");
      setTimeout(() => {
        setHireStatus("success");
        openWindow("contact");
      }, 900);
    } else {
      setHireStatus("error");
    }
  };

  const renderPrompt = () => (
    <p>
      <span className="font-bold">@yunus % </span>
      <span>{typedText}</span>
      {phase === "typing" && <span className="animate-pulse">_</span>}
    </p>
  );

  const renderLoading = () => (
    <div className="mt-2 text-xs text-gray-600">
      <p>Resolving dependencies...</p>
      <p>Fetching tech stack assets...</p>
      <p className="animate-pulse">Loading...</p>
    </div>
  );

  return (
    <>
      <div id="window-header">
        <WindowControls target={"terminal"} />
        <h2>Tech Stack</h2>
      </div>
      <div className="techstack" ref={containerRef}>
        {renderPrompt()}

        {phase === "loading" && renderLoading()}

        {phase === "showing" && (
          <>
            <div className="label">
              <p className="w-32">Category</p>
              <p>Technologies</p>
            </div>

            <ul className="content" ref={listRef}>
              {rows.slice(0, visibleRows).map(({ category, items }, idx) => (
                <li className="flex items-center" key={`${category}-${idx}`}>
                  <Check className="check" size={20} />
                  <h3>{category}</h3>
                  <ul>
                    {items.map((item, i) => (
                      <li key={i}>
                        {item}
                        {i < items.length - 1 ? "," : ""}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            {visibleRows === rows.length && (
              <>
                <div className="footnote">
                  <p>
                    <Check size={20} /> {rows.length} of {rows.length} stacks
                    loaded successfully (%100)
                  </p>
                  <p className="text-black">
                    <Flag size={15} fill="black" />
                    Render time: 0.6ms
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="prompt-hint">
                    Type{" "}
                    <span className="text-green-600 font-semibold">
                      "hire him"
                    </span>{" "}
                    to proceed.
                  </p>
                  <form onSubmit={handleHireSubmit} className="space-y-2">
                    <input
                      className="prompt-input"
                      placeholder='@yunus % type "hire him"'
                      value={hireInput}
                      onChange={(e) => setHireInput(e.target.value)}
                    />
                    {hireStatus === "processing" && (
                      <p className="text-xs text-green-500 animate-pulse">
                        Opening contact window...
                      </p>
                    )}
                    {hireStatus === "error" && (
                      <p className="text-xs text-red-500">
                        Sorry, I didn&apos;t get that. Did you mean "hire him"?
                      </p>
                    )}
                    {hireStatus === "success" && (
                      <p className="text-xs text-green-500">
                        Contact window opened.
                      </p>
                    )}
                  </form>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};
const TerminalWindow = WindowWrapper(Terminal, "terminal");
export default TerminalWindow;
