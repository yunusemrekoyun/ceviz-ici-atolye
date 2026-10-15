import type { NextConfig } from 'next';

// Security headers. The clickjacking control uses CSP `frame-ancestors` instead
// of a blanket X-Frame-Options so the iyzico payment callback (which runs inside
// the provider's 3DS iframe flow) is not broken. A full script-src CSP is left
// for the post-launch hardening pass to avoid breaking inline runtime/payment
// scripts before it can be tested live.
const baseSecurityHeaders = [
  // Force HTTPS for a year incl. subdomains (ignored by browsers over plain HTTP).
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Block MIME sniffing.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't leak full URLs (which can carry confirmation codes) to other origins.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Drop powerful APIs the site never uses.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['sharp'],
  // Hide the dev-only on-screen indicator (the floating "N" button).
  devIndicators: false,
  async headers() {
    return [
      // Safe headers everywhere.
      { source: '/:path*', headers: baseSecurityHeaders },
      // Clickjacking protection for everything EXCEPT the iyzico callback, which
      // legitimately participates in the provider's framed 3DS flow.
      {
        source: '/((?!api/payments/iyzico/callback).*)',
        headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'self'" }],
      },
      // Uploaded media has content-random filenames → safe to cache long-term.
      {
        source: '/uploads/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
