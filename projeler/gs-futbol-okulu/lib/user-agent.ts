/** Tarayıcı bilgisinden okunabilir cihaz etiketi: "iPhone · Safari", "Mac · Chrome" gibi. */
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Bilinmeyen cihaz";
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? /Mobile/.test(ua)
          ? "Android telefon"
          : "Android tablet"
        : /Macintosh|Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "Bilinmeyen cihaz";
  const browser = /SamsungBrowser/.test(ua)
    ? "Samsung Internet"
    : /Edg\//.test(ua)
      ? "Edge"
      : /OPR\//.test(ua)
        ? "Opera"
        : /Firefox|FxiOS/.test(ua)
          ? "Firefox"
          : /CriOS|Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "";
  return browser ? `${device} · ${browser}` : device;
}
