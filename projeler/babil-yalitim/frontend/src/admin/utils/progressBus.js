const EVENT = "admin:progress";

const makeId = () =>
  (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
    .replace(/-/g, "")
    .slice(0, 12);

export const createProgressTask = (label = "İşlem") => {
  const id = makeId();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EVENT, {
        detail: { id, label, progress: 5, status: "active" },
      })
    );
  }
  return id;
};

export const updateProgressTask = (id, progress, message) => {
  if (!id || typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT, {
      detail: { id, progress, message, status: "active" },
    })
  );
};

export const completeProgressTask = (id, message) => {
  if (!id || typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT, {
      detail: { id, progress: 100, status: "done", message },
    })
  );
};

export const failProgressTask = (id, message) => {
  if (!id || typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT, {
      detail: { id, status: "error", message },
    })
  );
};

export const clampProgress = (p) => {
  if (!Number.isFinite(p)) return 5;
  return Math.min(95, Math.max(5, Math.round(p)));
};

export { EVENT };
