import { useEffect } from "react";

import { persistenceConfig, photosLinks } from "#constants";
import useLocationStore from "#store/location.js";
import useWindowStore from "#store/window.js";
import { hasShareParams } from "../utils/shareUrl.js";

const WINDOW_STORAGE_KEY = persistenceConfig.windowStorageKey;
const LOCATION_STORAGE_KEY = persistenceConfig.locationStorageKey;
const PERSIST_DEBOUNCE_MS = persistenceConfig.debounceMs ?? 120;

const snapshotWindowsForStorage = (windows) => {
  const snapshot = {};
  if (!windows || typeof windows !== "object") return snapshot;

  Object.entries(windows).forEach(([key, win]) => {
    if (!win || typeof win !== "object") return;

    const position =
      win.position && typeof win.position === "object"
        ? { x: win.position.x ?? 0, y: win.position.y ?? 0 }
        : { x: 0, y: 0 };
    const size =
      win.size && typeof win.size === "object"
        ? {
            width: typeof win.size.width === "number" ? win.size.width : null,
            height: typeof win.size.height === "number" ? win.size.height : null,
          }
        : { width: null, height: null };

    snapshot[key] = {
      isOpen: Boolean(win.isOpen),
      zIndex: typeof win.zIndex === "number" ? win.zIndex : undefined,
      position,
      size,
    };

    if (win.isOpen && win.data != null) {
      snapshot[key].data = win.data;
    }
  });

  return snapshot;
};

const PersistenceManager = () => {
  const hydrateWindows = useWindowStore((state) => state.hydrate);
  const hydrateLocation = useLocationStore((state) => state.hydrate);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasShareParams()) return;

    try {
      const storedWindows = localStorage.getItem(WINDOW_STORAGE_KEY);
      if (storedWindows) {
        const parsed = JSON.parse(storedWindows);
        hydrateWindows({
          windows: snapshotWindowsForStorage(parsed?.windows),
          nextZIndex:
            typeof parsed?.nextZIndex === "number" ? parsed.nextZIndex : undefined,
        });
      }

      const storedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (storedLocation) {
        const parsed = JSON.parse(storedLocation);
        const desktopPositions =
          parsed?.desktopPositions && typeof parsed.desktopPositions === "object"
            ? parsed.desktopPositions
            : {};
        const photosActiveTab =
          parsed?.photosActiveTab ?? photosLinks[0]?.id ?? null;

        hydrateLocation({
          activeLocationId: parsed?.activeLocationId ?? null,
          desktopPositions,
          photosActiveTab,
        });
      }
    } catch (error) {
      console.warn("Failed to hydrate persisted state", error);
    }
  }, [hydrateLocation, hydrateWindows]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let windowTimer = null;
    let locationTimer = null;

    const unsubscribeWindows = useWindowStore.subscribe((state) => {
      if (windowTimer) clearTimeout(windowTimer);
      windowTimer = setTimeout(() => {
        try {
          const snapshot = {
            windows: snapshotWindowsForStorage(state.windows),
            nextZIndex: state.nextZIndex,
          };
          localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify(snapshot));
        } catch (error) {
          console.warn("Failed to persist window state", error);
        }
      }, PERSIST_DEBOUNCE_MS);
    });

    const unsubscribeLocation = useLocationStore.subscribe((state) => {
      if (locationTimer) clearTimeout(locationTimer);
      locationTimer = setTimeout(() => {
        try {
          const payload = {
            activeLocationId: state.activeLocationId ?? null,
            desktopPositions: state.desktopPositions,
            photosActiveTab: state.photosActiveTab ?? photosLinks[0]?.id ?? null,
          };
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {
          console.warn("Failed to persist location state", error);
        }
      }, PERSIST_DEBOUNCE_MS);
    });

    return () => {
      if (windowTimer) clearTimeout(windowTimer);
      if (locationTimer) clearTimeout(locationTimer);
      unsubscribeWindows();
      unsubscribeLocation();
    };
  }, []);

  return null;
};

export default PersistenceManager;
