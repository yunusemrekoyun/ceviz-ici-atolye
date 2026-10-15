import React, { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import ContactScreen from "#components/phone/ContactScreen.jsx";
import FinderScreen from "#components/phone/FinderScreen.jsx";
import HomeScreen from "#components/phone/HomeScreen.jsx";
import MessagesScreen from "#components/phone/MessagesScreen.jsx";
import PhotosScreen from "#components/phone/PhotosScreen.jsx";
import ResumeScreen from "#components/phone/ResumeScreen.jsx";
import SafariScreen from "#components/phone/SafariScreen.jsx";
import TerminalScreen from "#components/phone/TerminalScreen.jsx";
import PhoneScreen from "#components/phone/PhoneScreen.jsx";
import PhoneLoadingScreen from "#components/phone/mirror/PhoneLoadingScreen.jsx";
import PhoneStatusBar from "#components/phone/mirror/PhoneStatusBar.jsx";
import usePhoneMirrorFlow from "#components/phone/mirror/usePhoneMirrorFlow.js";
import WindowControls from "#components/WindowControls.jsx";
import WindowWrapper from "#hoc/windowWrapper.jsx";
import {
  phoneApps,
  personalInfo,
  photosLinks,
  phoneMessagesConfig,
  socials,
  techStack,
} from "#constants";
import { useContent } from "#components/ContentProvider.jsx";
import useLocationStore from "#store/location.js";
import useWindowStore from "#store/window.js";
import { parseShareParams } from "../utils/shareUrl.js";

const requestIdle = (callback, timeoutMs = 1200) => {
  if (typeof window === "undefined") return null;

  if ("requestIdleCallback" in window) {
    return window.requestIdleCallback(callback, { timeout: timeoutMs });
  }

  return window.setTimeout(
    () =>
      callback({
        didTimeout: true,
        timeRemaining: () => 0,
      }),
    timeoutMs
  );
};

const cancelIdle = (id) => {
  if (typeof window === "undefined" || id == null) return;
  if ("cancelIdleCallback" in window) {
    window.cancelIdleCallback(id);
  } else {
    window.clearTimeout(id);
  }
};

const preloadImages = async (urls, { max = 24 } = {}) => {
  if (typeof window === "undefined") return;

  const unique = Array.from(new Set(urls.filter(Boolean))).slice(0, max);
  for (let i = 0; i < unique.length; i += 1) {
    const src = unique[i];
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = src;

    try {
      if (img.decode) {
        // decode() is async and helps reduce first-open jank on some Android devices.
        await img.decode();
      } else {
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }
    } catch {
      // ignore
    }

    // Yield periodically to keep the main thread responsive.
    if (i % 2 === 1) {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    }
  }
};

const PhoneMirrorContent = ({ isMobileView = false }) => {
  const phoneIsOpen = useWindowStore((state) => state.windows.phone?.isOpen);
  const { phoneLocations, findFolderLocationById, photosGallery, photosSections } =
    useContent();
  const activeLocationId = useLocationStore((state) => state.activeLocationId);
  const setActiveLocationId = useLocationStore((state) => state.setActiveLocationId);
  const activeLocation =
    findFolderLocationById(activeLocationId, { scope: "phone" }) ??
    phoneLocations.work ??
    null;
  const photosActiveTab = useLocationStore((state) => state.photosActiveTab);
  const setPhotosActiveTab = useLocationStore((state) => state.setPhotosActiveTab);
  const [now, setNow] = useState(() => new Date());
  const isOpen = isMobileView ? true : Boolean(phoneIsOpen);
  const locationList = useMemo(() => Object.values(phoneLocations), [phoneLocations]);
  const allPhotos = useMemo(() => photosGallery.filter(Boolean), [photosGallery]);
  const hasAppliedMobileDeepLinkRef = useRef(false);
  const hasWarmedPhotosRef = useRef(false);
  const idlePreloadRef = useRef(null);
  const rafPreloadRef = useRef(null);
  const avatarUrl = phoneMessagesConfig?.threadAvatar ?? personalInfo?.avatar ?? null;

  const {
    phase,
    activeApp,
    openApp,
    hireSuccess,
    finishLoading,
    refs: { appContainerRef, dockRef, homeRef, scrimRef, gestureAreaRef },
    gestureHandlers,
  } = usePhoneMirrorFlow({ isMobileView, isOpen });

  useEffect(() => {
    if (!isMobileView) return;
    if (hasAppliedMobileDeepLinkRef.current) return;

    const share = parseShareParams();
    if (!share) return;

    hasAppliedMobileDeepLinkRef.current = true;

    if (share.view !== "finder") return;

    if (share.locId != null) {
      setActiveLocationId(share.locId);
    }

    openApp("finder");
  }, [isMobileView, openApp, setActiveLocationId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    if (hasWarmedPhotosRef.current) return undefined;

    hasWarmedPhotosRef.current = true;
    const photoUrls = allPhotos.map((p) => p?.img).filter(Boolean);

    if (typeof window !== "undefined" && avatarUrl) {
      rafPreloadRef.current = window.requestAnimationFrame(() => {
        preloadImages([avatarUrl], { max: 1 }).catch(() => undefined);
      });
    }

    idlePreloadRef.current = requestIdle(() => {
      preloadImages(photoUrls, { max: 24 }).catch(() => undefined);
    }, 900);

    return () => {
      if (typeof window !== "undefined" && rafPreloadRef.current != null) {
        window.cancelAnimationFrame(rafPreloadRef.current);
        rafPreloadRef.current = null;
      }
      cancelIdle(idlePreloadRef.current);
      idlePreloadRef.current = null;
    };
  }, [allPhotos, avatarUrl, isOpen]);

  useEffect(() => {
    if (!isMobileView && !isOpen) return undefined;

    const tick = () => setNow(new Date());
    tick();
    const interval = window.setInterval(tick, 30_000);
    return () => window.clearInterval(interval);
  }, [isMobileView, isOpen]);

  const renderActiveApp = () => {
    switch (activeApp) {
      case "finder":
        return (
          <FinderScreen
            locations={locationList}
            activeLocation={activeLocation}
            onSelectLocation={(loc) => setActiveLocationId(loc?.id)}
          />
        );
      case "photos": {
        const activeTabId = photosActiveTab ?? photosLinks[0]?.id ?? null;
        return (
          <PhotosScreen
            photos={allPhotos}
            sections={photosSections}
            tabs={photosLinks}
            activeTabId={activeTabId}
            onChangeTab={setPhotosActiveTab}
          />
        );
      }
      case "messages":
        return (
          <MessagesScreen
            socials={socials}
            techStack={techStack}
            onOpenContact={() => openApp("contact")}
          />
        );
      case "safari":
        return <SafariScreen />;
      case "contact":
        return <ContactScreen socials={socials} />;
      case "terminal":
        return <TerminalScreen techStack={techStack} onHireSuccess={hireSuccess} />;
      case "resume":
        return <ResumeScreen />;
      case "phoneapp":
        return <PhoneScreen />;
      default:
        return null;
    }
  };

  const phoneDeviceInner = (
    <div
      className={clsx(
        "phone-frame",
        isMobileView ? "phone-mobile" : "phone-window phone-window-device-inner"
      )}
    >
      <div className="phone-inner">
        <PhoneStatusBar now={now} />
        <PhoneLoadingScreen active={phase === "loading"} onDone={finishLoading} />

        {phase !== "loading" && (
          <div className="phone-stage">
            <HomeScreen ref={homeRef} apps={phoneApps} onOpenApp={openApp} dockRef={dockRef} />

            {phase === "app" && (
              <div
                className={clsx(
                  "phone-app-wrapper",
                  activeApp === "phoneapp" && "phone-app-wrapper--call"
                )}
                ref={appContainerRef}
              >
                {activeApp !== "phoneapp" &&
                  activeApp !== "finder" &&
                  activeApp !== "photos" &&
                  activeApp !== "messages" &&
                  activeApp !== "contact" &&
                  activeApp !== "terminal" &&
                  activeApp !== "safari" && (
                    <div className="phone-app-bar">
                      <p className="phone-app-title">
                        {phoneApps.find((a) => a.id === activeApp)?.label ?? "App"}
                      </p>
                    </div>
                  )}
                {renderActiveApp()}
              </div>
            )}

            <div className="phone-scrim" ref={scrimRef} />
          </div>
        )}
        {phase !== "loading" && (
            <div
              className={clsx(
                "phone-gesture-area",
                phase === "app" ? "is-active" : "is-inactive"
              )}
              ref={gestureAreaRef}
              onPointerDown={phase === "app" ? gestureHandlers.onPointerDown : undefined}
              onPointerMove={phase === "app" ? gestureHandlers.onPointerMove : undefined}
              onPointerUp={phase === "app" ? gestureHandlers.onPointerUp : undefined}
              onPointerCancel={phase === "app" ? gestureHandlers.onPointerCancel : undefined}
              onLostPointerCapture={
                phase === "app" ? gestureHandlers.onPointerCancel : undefined
              }
            >
              <div className="phone-home-indicator" />
            </div>
          )}
      </div>
    </div>
  );

  const phoneDevice = isMobileView ? (
    phoneDeviceInner
  ) : (
    <div className="phone-window-device">{phoneDeviceInner}</div>
  );

  if (isMobileView) return phoneDevice;

  return (
    <div className="phone-window-shell">
      <div id="window-header" className="phone-window-header">
        <WindowControls target="phone" />
        <h2>Phone Mirroring</h2>
      </div>
      <div className="phone-window-body">{phoneDevice}</div>
    </div>
  );
};

const PhoneMirrorWindow = WindowWrapper(PhoneMirrorContent, "phone");

export { PhoneMirrorContent as PhoneMirrorMobile };
export default PhoneMirrorWindow;
