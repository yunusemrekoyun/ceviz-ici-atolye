/** @type {import('next').NextConfig} */

// Parse MEDIA_BASE_URL so next/image can fetch from the VPS hostname
function mediaRemotePattern() {
  const raw = process.env.MEDIA_BASE_URL;
  if (!raw) return null;
  try {
    const { protocol, hostname, port } = new URL(raw);
    return {
      protocol: protocol.replace(":", ""),
      hostname,
      ...(port ? { port } : {}),
      pathname: "/**",
    };
  } catch {
    return null;
  }
}

const mediaPattern = mediaRemotePattern();

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
      ...(mediaPattern ? [mediaPattern] : []),
    ],
  },
  serverExternalPackages: ["iyzipay", "sharp"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
    ppr: false,
  },
};

export default nextConfig;
