// Yeni sürüm yayınlanınca eski sekmedeki sayfa parçası (chunk) bulunamayabilir.
export function isChunkLoadError(error) {
  const text = `${error?.name || ""} ${error?.message || ""}`;
  return /ChunkLoadError|dynamically imported module|Importing a module script failed|Loading chunk/i.test(text);
}

export function reloadWithoutCache() {
  const url = new URL(window.location.href);
  url.searchParams.set("_refresh", String(Date.now()));
  window.location.replace(url.toString());
}
