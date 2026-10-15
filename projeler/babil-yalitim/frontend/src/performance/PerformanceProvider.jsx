/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import PropTypes from "prop-types";

const PerformanceContext = createContext(null);

const getConnection = () =>
  navigator.connection || navigator.mozConnection || navigator.webkitConnection;

const subscribeMediaQuery = (mediaQuery, listener) => {
  if (!mediaQuery) return () => {};

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }

  mediaQuery.addListener(listener);
  return () => mediaQuery.removeListener(listener);
};

const subscribeConnection = (connection, listener) => {
  if (!connection) return () => {};

  if (connection.addEventListener) {
    connection.addEventListener("change", listener);
    return () => connection.removeEventListener("change", listener);
  }

  return () => {};
};

const computeTier = ({
  isMobile,
  isTouch,
  saveData,
  effectiveType,
  deviceMemory,
  hardwareConcurrency,
}) => {
  if (saveData) return "low";
  if (effectiveType && /(^|slow-)?2g|3g/i.test(effectiveType)) return "low";
  if (
    (deviceMemory && deviceMemory <= 4) ||
    (hardwareConcurrency && hardwareConcurrency <= 4)
  ) {
    return isMobile || isTouch ? "low" : "standard";
  }
  if (isMobile || isTouch) return "standard";
  return "high";
};

const readSnapshot = () => {
  if (typeof window === "undefined") {
    return {
      tier: "high",
      isMobile: false,
      isTouch: false,
      saveData: false,
      effectiveType: "",
      prefersReducedMotion: false,
      deviceMemory: 0,
      hardwareConcurrency: 0,
    };
  }

  const connection = getConnection();
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const isMobile = window.innerWidth < 640;
  const deviceMemory = Number(navigator.deviceMemory || 0);
  const hardwareConcurrency = Number(navigator.hardwareConcurrency || 0);
  const saveData = Boolean(connection?.saveData);
  const effectiveType = connection?.effectiveType || "";
  const prefersReducedMotion = mediaQuery.matches;

  return {
    tier: computeTier({
      isMobile,
      isTouch,
      saveData,
      effectiveType,
      deviceMemory,
      hardwareConcurrency,
    }),
    isMobile,
    isTouch,
    saveData,
    effectiveType,
    prefersReducedMotion,
    deviceMemory,
    hardwareConcurrency,
  };
};

export function PerformanceProvider({ children }) {
  const [snapshot, setSnapshot] = useState(readSnapshot);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const connection = getConnection();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSnapshot(readSnapshot()));
    };

    sync();

    window.addEventListener("resize", sync, { passive: true });
    const unsubscribeMotion = subscribeMediaQuery(motionQuery, sync);
    const unsubscribeConnection = subscribeConnection(connection, sync);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", sync);
      unsubscribeMotion();
      unsubscribeConnection();
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.dataset.perf = snapshot.tier;
    root.dataset.motion = snapshot.prefersReducedMotion ? "reduced" : "full";
    root.dataset.touch = snapshot.isTouch ? "true" : "false";
  }, [snapshot]);

  const value = useMemo(() => {
    const isLow = snapshot.tier === "low";
    const isStandard = snapshot.tier === "standard";
    const hasFastConnection =
      !snapshot.effectiveType || /4g|5g/i.test(snapshot.effectiveType);
    const hasEnoughMemory =
      !snapshot.deviceMemory || snapshot.deviceMemory >= 4;
    const hasEnoughCores =
      !snapshot.hardwareConcurrency || snapshot.hardwareConcurrency >= 4;
    const allowAmbientVideoMobile =
      snapshot.isMobile &&
      !isLow &&
      !snapshot.prefersReducedMotion &&
      !snapshot.saveData &&
      hasFastConnection &&
      hasEnoughMemory &&
      hasEnoughCores;

    return {
      ...snapshot,
      allowAmbientVideo:
        !snapshot.prefersReducedMotion &&
        !snapshot.saveData &&
        !snapshot.isMobile,
      allowAmbientVideoMobile,
      allowMarquee: !snapshot.prefersReducedMotion,
      deferOffscreenMedia: isLow || isStandard,
      imageQuality: isLow ? "auto:eco" : "auto:good",
      videoQuality: isLow ? "auto:eco" : "auto:good",
      backgroundVideoWidth: isLow ? 1280 : isStandard ? 1600 : 1920,
      mobileBackgroundVideoWidth: isLow ? 720 : 960,
      cardImageWidth: isLow ? 640 : isStandard ? 800 : 960,
      detailImageWidth: isLow ? 960 : isStandard ? 1280 : 1600,
      glassBlurScale: isLow ? 0.5 : isStandard ? 0.72 : 1,
      hoverBlurScale: isLow ? 0.35 : isStandard ? 0.65 : 1,
      sectionRootMargin: isLow ? "220px 0px" : isStandard ? "320px 0px" : "420px 0px",
    };
  }, [snapshot]);

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}

PerformanceProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const usePerformanceProfile = () => {
  const context = useContext(PerformanceContext);

  if (!context) {
    throw new Error("usePerformanceProfile must be used within PerformanceProvider");
  }

  return context;
};
