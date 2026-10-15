'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QRCodeImage({
  value,
  size = 220,
  alt = 'QR',
  className,
}: {
  value: string;
  size?: number;
  alt?: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: '#1c1714',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) {
    return <div style={{ width: size, height: size }} className={`bg-[#f5f1eb] rounded-xl animate-pulse ${className ?? ''}`} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={size} height={size} className={className} />;
}
