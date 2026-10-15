import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { photosLinks } from "#constants";

const DEFAULT_LOCATION_ID = 1;
const DEFAULT_PHOTOS_TAB = photosLinks[0]?.id ?? null;

const useLocationStore = create(
  immer((set) => ({
    activeLocationId: DEFAULT_LOCATION_ID,
    desktopPositions: {},
    photosActiveTab: DEFAULT_PHOTOS_TAB,

    hydrate: (payload) =>
      set((state) => {
        if (!payload) return;

        if (payload.activeLocationId !== undefined) {
          state.activeLocationId =
            payload.activeLocationId ?? state.activeLocationId ?? DEFAULT_LOCATION_ID;
        } else if (payload.activeLocation?.id !== undefined) {
          state.activeLocationId =
            payload.activeLocation.id ?? state.activeLocationId ?? DEFAULT_LOCATION_ID;
        }

        if (payload.desktopPositions) {
          state.desktopPositions = payload.desktopPositions;
        }

        if (payload.photosActiveTab !== undefined) {
          state.photosActiveTab = payload.photosActiveTab;
        }
      }),

    setActiveLocation: (location) =>
      set((state) => {
        if (location === undefined) return;
        state.activeLocationId = location?.id ?? DEFAULT_LOCATION_ID;
      }),

    setActiveLocationId: (locationId) =>
      set((state) => {
        if (locationId === undefined || locationId === null) return;
        state.activeLocationId = locationId;
      }),

    setDesktopPosition: (id, position) =>
      set((state) => {
        if (id === undefined || id === null) return;
        state.desktopPositions[id] = {
          x: position.x ?? 0,
          y: position.y ?? 0,
        };
      }),

    setPhotosActiveTab: (tabId) =>
      set((state) => {
        if (tabId === undefined || tabId === null) return;
        state.photosActiveTab = tabId;
      }),

    resetActiveLocation: () =>
      set((state) => {
        state.activeLocationId = DEFAULT_LOCATION_ID;
      }),
  }))
);

export default useLocationStore;
