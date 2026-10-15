import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, XCircle } from "lucide-react";
import { phoneAboutConfig } from "#constants";
import { runIOSSlideTransition } from "#components/phone/phoneTransitions.js";

const safeLoadName = () => {
  try {
    const saved = window.localStorage?.getItem?.(phoneAboutConfig.storageKey);
    const value = String(saved ?? "").trim();
    return value || phoneAboutConfig.defaultDeviceName;
  } catch {
    return phoneAboutConfig.defaultDeviceName;
  }
};

const normalizeCommand = (value) => String(value ?? "").trim().toLowerCase();

const SettingsNav = ({
  backLabel,
  onBack,
  title,
  actionLabel,
  onAction,
  actionDisabled,
}) => (
  <div className="phone-about-nav" role="navigation" aria-label="Settings navigation">
    <button
      type="button"
      className="phone-about-nav-btn"
      onClick={onBack}
      disabled={!onBack || actionDisabled}
    >
      <ChevronLeft size={18} aria-hidden />
      <span>{backLabel}</span>
    </button>
    <p className="phone-about-nav-title">{title}</p>
    {actionLabel ? (
      <button
        type="button"
        className="phone-about-nav-action"
        onClick={onAction}
        disabled={actionDisabled}
      >
        {actionLabel}
      </button>
    ) : (
      <span aria-hidden className="phone-about-nav-spacer" />
    )}
  </div>
);

const SettingsRow = ({ label, value, isLink, onClick, valueClassName }) => {
  const Component = isLink ? "button" : "div";
  return (
    <Component
      type={isLink ? "button" : undefined}
      className={clsx("phone-about-row", isLink && "is-link")}
      onClick={isLink ? onClick : undefined}
    >
      <span className="phone-about-row-label">{label}</span>
      <span className={clsx("phone-about-row-value", valueClassName)}>{value}</span>
      {isLink ? (
        <ChevronRight size={18} className="phone-about-row-chevron" aria-hidden />
      ) : null}
    </Component>
  );
};

const TerminalScreen = ({ techStack = [], onHireSuccess }) => {
  const [route, setRoute] = useState("about"); // about | general | name
  const [transition, setTransition] = useState(null); // { direction, from, to }
  const [deviceName, setDeviceName] = useState(() => safeLoadName());
  const [draftName, setDraftName] = useState(deviceName);
  const [hireStatus, setHireStatus] = useState("idle"); // idle | processing
  const stageRef = useRef(null);
  const fromPanelRef = useRef(null);
  const toPanelRef = useRef(null);
  const transitionTlRef = useRef(null);
  const inputRef = useRef(null);
  const hireTimerRef = useRef(null);

  useEffect(() => {
    try {
      window.localStorage?.setItem?.(phoneAboutConfig.storageKey, deviceName);
    } catch {
      // ignore
    }
  }, [deviceName]);

  useEffect(() => {
    return () => {
      if (hireTimerRef.current) {
        window.clearTimeout(hireTimerRef.current);
        hireTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (route !== "name") return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus?.(), 50);
    return () => window.clearTimeout(timer);
  }, [route]);

  const navigate = (nextRoute, direction) => {
    if (!nextRoute || nextRoute === route || transition) return;
    setTransition({ direction, from: route, to: nextRoute });
    setRoute(nextRoute);
  };

  const openNameEditor = () => {
    setDraftName(deviceName);
    setHireStatus("idle");
    navigate("name", "forward");
  };

  const aboutRows = [
    {
      id: "name",
      label: "Name",
      value: deviceName,
      isLink: true,
      onClick: openNameEditor,
    },
    { id: "ios", label: "iOS Version", value: phoneAboutConfig.iosVersion },
    { id: "model", label: "Model Name", value: phoneAboutConfig.modelName },
    { id: "modelNo", label: "Model Number", value: phoneAboutConfig.modelNumber },
    { id: "serial", label: "Serial Number", value: phoneAboutConfig.serialNumber },
  ];

  const handleNameDone = () => {
    if (hireStatus === "processing") return;

    const trimmed = String(draftName ?? "").trim();
    const normalized = normalizeCommand(trimmed);
    const longKeyword = phoneAboutConfig.hireKeywords?.[0] ?? "hire him";
    const shortKeyword = phoneAboutConfig.hireKeywords?.[1] ?? "hire";
    const shouldHire =
      (longKeyword && normalized.includes(longKeyword)) || normalized === shortKeyword;

    if (normalized && shouldHire) {
      setHireStatus("processing");
      if (hireTimerRef.current) window.clearTimeout(hireTimerRef.current);
      hireTimerRef.current = window.setTimeout(() => {
        onHireSuccess?.();
      }, phoneAboutConfig.hireDelayMs ?? 650);
      return;
    }

    if (trimmed) setDeviceName(trimmed);
    navigate("about", "back");
  };

  useLayoutEffect(() => {
    if (!transition) return undefined;

    const stageEl = stageRef.current;
    const fromEl = fromPanelRef.current;
    const toEl = toPanelRef.current;
    if (!stageEl || !fromEl || !toEl) return undefined;

    if (transitionTlRef.current?.kill) {
      transitionTlRef.current.kill();
      transitionTlRef.current = null;
    }

    fromEl.style.display = "flex";
    toEl.style.display = "flex";
    fromEl.style.zIndex = "1";
    toEl.style.zIndex = "2";

    const tl = runIOSSlideTransition({
      stageEl,
      fromEl,
      toEl,
      direction: transition.direction,
      onComplete: () => {
        fromEl.style.zIndex = "";
        toEl.style.zIndex = "";
        setTransition(null);
      },
    });

    transitionTlRef.current = tl;

    return () => {
      if (tl?.kill) tl.kill();
      if (transitionTlRef.current === tl) transitionTlRef.current = null;
    };
  }, [transition]);

  const renderRoute = (routeKey) => {
    if (routeKey === "general") {
      return (
        <>
          <SettingsNav backLabel="Settings" title="General" />
          <div className="phone-about-content">
            <h3 className="phone-about-large-title">General</h3>

            <div className="phone-about-section">
              <div className="phone-about-card">
                <SettingsRow
                  label="About"
                  value=""
                  isLink
                  onClick={() => navigate("about", "forward")}
                  valueClassName="phone-about-row-value--chevron-only"
                />
              </div>
            </div>

            <p className="phone-about-footnote">
              {phoneAboutConfig.footnoteGeneral}
            </p>
          </div>
        </>
      );
    }

    if (routeKey === "name") {
      return (
        <>
          <SettingsNav
            backLabel="About"
            onBack={hireStatus === "processing" ? null : () => navigate("about", "back")}
            title="Name"
            actionLabel="Done"
            onAction={handleNameDone}
            actionDisabled={hireStatus === "processing"}
          />

          <div className="phone-about-content">
            <div className="phone-about-section">
              <form
                className="phone-about-card"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleNameDone();
                }}
              >
                <div className="phone-about-input-row">
                  <input
                    ref={inputRef}
                    className="phone-about-input"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    aria-label="Device name"
                  />
                  {draftName ? (
                    <button
                      type="button"
                      className="phone-about-input-clear"
                      onClick={() => setDraftName("")}
                      aria-label="Clear"
                    >
                      <XCircle size={18} aria-hidden />
                    </button>
                  ) : null}
                </div>
              </form>

              {hireStatus === "processing" ? (
                <p className="phone-about-footnote phone-about-footnote--active">
                  {phoneAboutConfig.openingContact}
                </p>
              ) : (
                <p className="phone-about-footnote">
                  {phoneAboutConfig.nameTip}
                </p>
              )}
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <SettingsNav
          backLabel="General"
          onBack={() => navigate("general", "back")}
          title="About"
        />

        <div className="phone-about-content">
          <div className="phone-about-section">
            <div className="phone-about-card">
              {aboutRows.map((row) => (
                <SettingsRow key={row.id} {...row} />
              ))}
            </div>
          </div>

          <div className="phone-about-section">
            <p className="phone-about-section-title">{phoneAboutConfig.skillSectionTitle}</p>
            <div className="phone-about-card">
              {techStack.map(({ category, items }) => (
                <SettingsRow
                  key={category}
                  label={category}
                  value={Array.isArray(items) ? items.join(", ") : ""}
                  valueClassName="phone-about-row-value--wrap"
                />
              ))}
            </div>
          </div>

          <p className="phone-about-footnote">
            {phoneAboutConfig.aboutFootnote}
          </p>
        </div>
      </>
    );
  };

  return (
    <div className="phone-app phone-about">
      <div
        ref={stageRef}
        className={`phone-slide-stage${transition ? " is-transitioning" : ""}`}
      >
        {transition ? (
          <div ref={fromPanelRef} className="phone-slide-panel" aria-hidden="true">
            {renderRoute(transition.from)}
          </div>
        ) : null}

        <div ref={toPanelRef} className="phone-slide-panel">
          {renderRoute(route)}
        </div>
      </div>
    </div>
  );
};

export default TerminalScreen;
