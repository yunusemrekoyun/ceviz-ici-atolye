import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import gsap from "gsap";
import { Phone as PhoneIcon, Delete } from "lucide-react";
import { phoneDialConfig } from "#constants";

const PhoneScreen = ({ autoDialNumber = phoneDialConfig.defaultNumber }) => {
  const defaultTab = phoneDialConfig.tabs?.[3] ?? "Keypad";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [typed, setTyped] = useState("");
  const bodyRef = useRef(null);
  const prevTabRef = useRef(defaultTab);
  const keyRefs = useRef({});
  const callRef = useRef(null);
  const pulseRef = useRef(null);
  const dialTl = useRef(null);

  const sanitizedDigits = useMemo(() => autoDialNumber.replace(/[^\d]/g, "").split(""), [autoDialNumber]);

  useEffect(() => {
    if (activeTab !== defaultTab) {
      if (pulseRef.current) {
        pulseRef.current.kill();
        pulseRef.current = null;
      }
      if (dialTl.current) dialTl.current.kill();
      return undefined;
    }

    if (pulseRef.current) {
      pulseRef.current.kill();
      pulseRef.current = null;
    }
    if (dialTl.current) dialTl.current.kill();

    const tl = gsap.timeline({ defaults: { ease: "power1.out" } });
    sanitizedDigits.forEach((digit, idx) => {
      const target = keyRefs.current[digit];
      const at = idx * 0.32;
      tl.call(() => setTyped((prev) => prev + digit), [], at);
      if (target) {
        tl.fromTo(
          target,
          { scale: 0.95 },
          { scale: 0.82, duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" },
          at
        );
      }
    });

    tl.call(() => {
      if (callRef.current) {
        pulseRef.current = gsap.fromTo(
          callRef.current,
          { scale: 1 },
          { scale: 1.08, duration: 0.55, yoyo: true, repeat: -1, ease: "sine.inOut" }
        );
      }
    });

    dialTl.current = tl;

    return () => {
      if (dialTl.current) dialTl.current.kill();
      if (pulseRef.current) pulseRef.current.kill();
    };
  }, [activeTab, defaultTab, sanitizedDigits]);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const prev = prevTabRef.current;
    if (prev === activeTab) return;

    const tabs = phoneDialConfig.tabs ?? [];
    const prevIdx = tabs.indexOf(prev);
    const nextIdx = tabs.indexOf(activeTab);
    const direction = nextIdx >= prevIdx ? 1 : -1;

    gsap.fromTo(
      el,
      { x: direction * 12, opacity: 0.01 },
      {
        x: 0,
        opacity: 1,
        duration: 0.26,
        ease: "power2.out",
        overwrite: "auto",
        clearProps: "transform,opacity",
      }
    );

    prevTabRef.current = activeTab;
  }, [activeTab]);

  const handleTapKey = (digit) => {
    setTyped((prev) => prev + digit);
    const target = keyRefs.current[digit];
    if (target) {
      gsap.fromTo(target, { scale: 0.95 }, { scale: 0.82, duration: 0.1, yoyo: true, repeat: 1 });
    }
  };

  const handleBackspace = () => setTyped((prev) => prev.slice(0, -1));

  const handleCall = () => {
    const tel = typed || autoDialNumber || phoneDialConfig.defaultNumber;
    window.location.href = `tel:${tel}`;
  };

  return (
    <div className="phone-app phone-call">
      <div ref={bodyRef} className="phone-call-body">
        {activeTab === defaultTab ? (
          <>
            <div className="phone-call-display">
              <p className="number">{typed || autoDialNumber}</p>
              <button
                type="button"
                className="add-number"
                onClick={() => setTyped(autoDialNumber.replace(/[^\d]/g, ""))}
              >
                {phoneDialConfig.addNumberLabel}
              </button>
            </div>

            <div className="phone-call-grid">
              {phoneDialConfig.dialKeys.map(({ digit, sub }) => (
                <button
                  key={digit}
                  type="button"
                  className="phone-call-key"
                  onClick={() => handleTapKey(digit)}
                  ref={(el) => {
                    if (el) keyRefs.current[digit] = el;
                  }}
                >
                  <span className="digit">{digit}</span>
                  {sub ? <span className="sub">{sub}</span> : null}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="phone-center px-6 py-10">
            <p className="phone-subtitle">{activeTab}</p>
            <p className="phone-desc">This tab is part of the Phone app UI demo.</p>
            <button
              type="button"
              className="phone-button mt-4"
              onClick={() => setActiveTab(defaultTab)}
            >
              Open Keypad
            </button>
          </div>
        )}
      </div>

      <div className="phone-call-actions">
        <div className="phone-call-cta">
          <button
            type="button"
            className="phone-call-btn"
            ref={callRef}
            onClick={handleCall}
            disabled={activeTab !== defaultTab}
          >
            <PhoneIcon size={28} />
          </button>
          <button
            type="button"
            className="phone-call-del"
            onClick={handleBackspace}
            disabled={activeTab !== defaultTab}
          >
            <Delete size={18} />
          </button>
        </div>
        <div className="phone-call-tabs">
          {phoneDialConfig.tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={clsx(activeTab === tab && "is-active")}
              onClick={() => {
                if (tab === defaultTab) setTyped("");
                setActiveTab(tab);
              }}
            >
              <p>{tab}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PhoneScreen;
