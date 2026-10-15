'use client';

import { useEffect } from 'react';

/** Görüntülenme sayacı — mount'ta bir kez, oturum başına tekil.
 * sendBeacon sayfa kapanışında da güvenle gider; ISR cache'ine dokunmaz. */
export function TrackView({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `kst_viewed_${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // sessionStorage kapalıysa yine de say
    }
    const url = `/api/ilan/${encodeURIComponent(slug)}/goruntulenme`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url);
    } else {
      fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
    }
  }, [slug]);

  return null;
}
