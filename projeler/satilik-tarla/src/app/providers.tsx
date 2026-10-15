'use client';

import { useEffect, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // PWA: register the service worker in production for offline shell + install.
  useEffect(() => {
    if (
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      const onLoad = () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      };
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
  }, []);

  return <>{children}</>;
}
