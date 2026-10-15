import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  accessCookieOptions,
  refreshCookieOptions,
} from "@/lib/auth.js";

const setAuthCookies = (response, { accessToken, refreshToken }) => {
  if (accessToken) {
    response.cookies.set(ACCESS_COOKIE_NAME, accessToken, accessCookieOptions);
  }
  if (refreshToken) {
    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  }
};

const clearAuthCookies = (response) => {
  response.cookies.set(ACCESS_COOKIE_NAME, "", {
    ...accessCookieOptions,
    maxAge: 0,
  });
  response.cookies.set(REFRESH_COOKIE_NAME, "", {
    ...refreshCookieOptions,
    maxAge: 0,
  });
};

const getClientMeta = (request) => {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const ip =
    forwardedFor.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent") ?? null;

  return { ip, userAgent };
};

export { setAuthCookies, clearAuthCookies, getClientMeta };
