import { photosLinks } from "#constants";

const SUPPORTED_VIEW_KEYS = new Set([
  "finder",
  "safari",
  "resume",
  "photos",
  "contact",
  "terminal",
  "phone",
]);

const SHARE_PARAMS = {
  view: "view",
  loc: "loc",
  tab: "tab",
};

const safeNumber = (value) => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const hasShareParams = (searchString) => {
  const search =
    typeof searchString === "string"
      ? searchString
      : typeof window === "undefined"
        ? ""
        : window.location.search;

  const params = new URLSearchParams(search);
  return (
    params.has(SHARE_PARAMS.view) ||
    params.has(SHARE_PARAMS.loc) ||
    params.has(SHARE_PARAMS.tab)
  );
};

export const parseShareParams = (searchString) => {
  const search =
    typeof searchString === "string"
      ? searchString
      : typeof window === "undefined"
        ? ""
        : window.location.search;

  const params = new URLSearchParams(search);
  const viewRaw = params.get(SHARE_PARAMS.view);
  const view = SUPPORTED_VIEW_KEYS.has(viewRaw) ? viewRaw : null;

  const locId = safeNumber(params.get(SHARE_PARAMS.loc));
  const tabId = safeNumber(params.get(SHARE_PARAMS.tab));

  if (!view && locId == null && tabId == null) return null;

  return {
    view: view ?? (locId != null ? "finder" : null),
    locId,
    tabId,
  };
};

export const normalizePhotosTab = (tabId) => {
  const candidate = safeNumber(tabId);
  if (candidate == null) return photosLinks[0]?.id ?? null;

  const isValid = photosLinks.some((tab) => tab?.id === candidate);
  return isValid ? candidate : photosLinks[0]?.id ?? null;
};

export const getTopOpenView = (windows) => {
  if (!windows || typeof windows !== "object") return null;

  let topKey = null;
  let topZ = -Infinity;

  Object.entries(windows).forEach(([key, win]) => {
    if (!SUPPORTED_VIEW_KEYS.has(key)) return;
    if (!win?.isOpen) return;
    const z = typeof win.zIndex === "number" ? win.zIndex : 0;
    if (z > topZ) {
      topZ = z;
      topKey = key;
    }
  });

  return topKey;
};

export const computeShareState = ({ windows, activeLocationId, photosActiveTab }) => {
  const view = getTopOpenView(windows);
  const share = { view, locId: null, tabId: null };

  if (view === "finder") {
    share.locId = safeNumber(activeLocationId);
  }

  if (view === "photos") {
    share.tabId = normalizePhotosTab(photosActiveTab);
  }

  return share;
};

export const applyShareStateToUrl = ({ view, locId, tabId }) => {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  params.delete(SHARE_PARAMS.view);
  params.delete(SHARE_PARAMS.loc);
  params.delete(SHARE_PARAMS.tab);

  if (view) params.set(SHARE_PARAMS.view, view);
  if (view === "finder" && safeNumber(locId) != null) {
    params.set(SHARE_PARAMS.loc, String(safeNumber(locId)));
  }
  if (view === "photos" && safeNumber(tabId) != null) {
    params.set(SHARE_PARAMS.tab, String(safeNumber(tabId)));
  }

  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;

  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl !== currentUrl) {
    window.history.replaceState(null, "", nextUrl);
  }
};
