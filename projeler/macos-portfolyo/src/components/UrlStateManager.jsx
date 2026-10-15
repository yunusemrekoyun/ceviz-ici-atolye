import { useEffect } from "react";

import useLocationStore from "#store/location.js";
import useWindowStore from "#store/window.js";
import {
  applyShareStateToUrl,
  computeShareState,
  normalizePhotosTab,
  parseShareParams,
} from "../utils/shareUrl.js";

const UrlStateManager = () => {
  useEffect(() => {
    const share = parseShareParams();
    if (!share?.view) return;

    const { openWindow } = useWindowStore.getState();
    const { setActiveLocationId, setPhotosActiveTab } =
      useLocationStore.getState();

    if (share.view === "photos" && share.tabId != null) {
      setPhotosActiveTab(normalizePhotosTab(share.tabId));
    }

    if (share.view === "finder" && share.locId != null) {
      setActiveLocationId(share.locId);
    }

    openWindow(share.view);

    requestAnimationFrame(() => {
      const windowState = useWindowStore.getState();
      const locationState = useLocationStore.getState();
      applyShareStateToUrl(
        computeShareState({
          windows: windowState.windows,
          activeLocationId: locationState.activeLocationId ?? null,
          photosActiveTab: locationState.photosActiveTab,
        })
      );
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let timer = null;

    const sync = () => {
      timer = null;
      const windowState = useWindowStore.getState();
      const locationState = useLocationStore.getState();

      applyShareStateToUrl(
        computeShareState({
          windows: windowState.windows,
          activeLocationId: locationState.activeLocationId ?? null,
          photosActiveTab: locationState.photosActiveTab,
        })
      );
    };

    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(sync, 120);
    };

    const unsubscribeWindows = useWindowStore.subscribe(schedule);
    const unsubscribeLocation = useLocationStore.subscribe(schedule);

    return () => {
      if (timer) window.clearTimeout(timer);
      unsubscribeWindows();
      unsubscribeLocation();
    };
  }, []);

  return null;
};

export default UrlStateManager;
