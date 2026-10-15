import { LOGIN_PATH } from "@/lib/auth/cookie";

/** Panelden admin API'sine istek. Oturum düşmüşse (401) kullanıcıyı giriş ekranına götürür. */
export async function adminFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, { cache: "no-store", ...init, headers: { Accept: "application/json", ...init?.headers } });
  if (res.status === 401) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- tam sayfa yenileme: panel state'i temizlensin
    window.location.assign(`${LOGIN_PATH}?next=${encodeURIComponent(window.location.pathname)}`);
  }
  return res;
}
