import publicApi from "../../publicApi";

// Yönetim panelinden yayınlanan yasal metinler. Yayın yoksa sayfalar sitedeki ilk metni gösterir.
const TTL = 60 * 1000;
let cache = null;
let fetchedAt = 0;
let pending = null;

export function getLegalDocuments() {
  if (cache && Date.now() - fetchedAt < TTL) return Promise.resolve(cache);
  if (!pending) {
    pending = publicApi
      .get("/legal")
      .then(({ data }) => {
        cache = data?.documents && typeof data.documents === "object" ? data.documents : {};
        fetchedAt = Date.now();
        return cache;
      })
      .catch((error) => {
        if (cache) return cache;
        throw error;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}
