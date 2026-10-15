import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const rootDir = fileURLToPath(new URL(".", import.meta.url));
  const env = loadEnv(mode, rootDir, "");
  const apiBase = String(env.VITE_API_BASE_URL || "http://localhost:5000/api");
  const mediaTarget = apiBase.replace(/\/api\/?$/i, "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/media": {
          target: mediaTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            motion: ["framer-motion"],
            charts: ["recharts"],
          },
        },
      },
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.{js,jsx}"],
    },
  };
});
