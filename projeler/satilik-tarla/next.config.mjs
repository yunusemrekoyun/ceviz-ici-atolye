import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker imajı için tekil çalıştırılabilir çıktı; lokal geliştirmede
  // `next start` çalışmaya devam etsin diye yalnızca STANDALONE=1 ile açılır.
  output: process.env.STANDALONE ? 'standalone' : undefined,
  // Pin Turbopack's workspace root to this project so it never infers a parent
  // directory (which made it fail to resolve the next package).
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
