/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve.alias ??= {};
    config.resolve.alias["pdfjs-dist$"] = "pdfjs-dist/build/pdf.min.mjs";
    config.resolve.alias["pdfjs-dist/build/pdf.mjs"] = "pdfjs-dist/build/pdf.min.mjs";

    return config;
  },
};

export default nextConfig;
