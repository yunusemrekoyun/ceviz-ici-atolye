import { INITIAL_Z_INDEX, WINDOW_CONFIG } from "#constants/index.js";
import { immer } from "zustand/middleware/immer";
import { create } from "zustand";

const useWindowStore = create(
  immer((set) => ({
    windows: WINDOW_CONFIG,
    nextZIndex: INITIAL_Z_INDEX + 1,

    hydrate: (payload) =>
      set((state) => {
        if (!payload) return;

        if (payload.windows) {
          Object.entries(state.windows).forEach(([key, win]) => {
            if (payload.windows[key]) {
              const incoming = payload.windows[key];
              const incomingSize =
                incoming.size && typeof incoming.size === "object"
                  ? {
                      width:
                        typeof incoming.size.width === "number"
                          ? incoming.size.width
                          : null,
                      height:
                        typeof incoming.size.height === "number"
                          ? incoming.size.height
                          : null,
                    }
                  : {};
              const baseSize =
                win.size && typeof win.size === "object"
                  ? { width: win.size.width ?? null, height: win.size.height ?? null }
                  : { width: null, height: null };

              state.windows[key] = {
                ...win,
                ...incoming,
                position: { x: 0, y: 0, ...incoming.position },
                size: { ...baseSize, ...incomingSize },
                hasOpened: Boolean(win.hasOpened || incoming.hasOpened || incoming.isOpen),
              };
            }
          });
        }

        if (typeof payload.nextZIndex === "number") {
          state.nextZIndex = payload.nextZIndex;
        }
      }),

    openWindow: (windowKey, data = null) =>
      set((state) => {
        const win = state.windows[windowKey];
        if (!win) return;

        if (windowKey === "imgfile") {
          const other = state.windows.videofile;
          if (other?.isOpen) {
            other.isOpen = false;
            other.zIndex = INITIAL_Z_INDEX;
          }
        }

        if (windowKey === "videofile") {
          const other = state.windows.imgfile;
          if (other?.isOpen) {
            other.isOpen = false;
            other.zIndex = INITIAL_Z_INDEX;
          }
        }

        win.isOpen = true;
        win.hasOpened = true;
        win.zIndex = state.nextZIndex;
        win.data = data ?? win.data;
        win.position = { x: 0, y: 0, ...win.position };

        state.nextZIndex++;
      }),

    closeWindow: (windowKey) =>
      set((state) => {
        const win = state.windows[windowKey];
        if (!win) return;
        win.isOpen = false;
        win.zIndex = INITIAL_Z_INDEX;

        state.nextZIndex++;
      }),

    focusWindow: (windowKey) =>
      set((state) => {
        const win = state.windows[windowKey];
        if (!win) return;
        win.zIndex = state.nextZIndex++;
      }),

    setWindowPosition: (windowKey, position) =>
      set((state) => {
        const win = state.windows[windowKey];
        if (!win) return;
        win.position = { x: position.x ?? 0, y: position.y ?? 0 };
      }),

    setWindowSize: (windowKey, size) =>
      set((state) => {
        const win = state.windows[windowKey];
        if (!win) return;
        win.size = {
          width: typeof size?.width === "number" ? size.width : null,
          height: typeof size?.height === "number" ? size.height : null,
        };
      }),
  }))
);

export default useWindowStore;
