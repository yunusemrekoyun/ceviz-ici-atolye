let refreshPromise = null;

const AUTH_REFRESH_PATH = "/api/auth/refresh";
const AUTH_LOGIN_PATH = "/api/auth/login";
const AUTH_LOGOUT_PATH = "/api/auth/logout";

const isAuthPath = (url, path) => {
  if (!url) return false;
  try {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "http://localhost";
    const parsed = new URL(url, base);
    return parsed.pathname === path;
  } catch {
    return url.includes(path);
  }
};

const shouldSkipRefresh = (url) =>
  isAuthPath(url, AUTH_REFRESH_PATH) ||
  isAuthPath(url, AUTH_LOGIN_PATH) ||
  isAuthPath(url, AUTH_LOGOUT_PATH);

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = fetch(AUTH_REFRESH_PATH, { method: "POST" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Refresh failed");
        }
        return response;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  try {
    return await refreshPromise;
  } catch {
    return null;
  }
};

export const authFetch = async (input, init) => {
  const request = input instanceof Request ? input : new Request(input, init);
  let retryRequest = null;
  try {
    retryRequest = request.clone();
  } catch {
    retryRequest = null;
  }

  const response = await fetch(request);
  if (response.status !== 401) return response;

  if (shouldSkipRefresh(request.url)) return response;

  const refreshed = await refreshAccessToken();
  if (!refreshed) return response;

  if (!retryRequest) return response;
  return fetch(retryRequest);
};
