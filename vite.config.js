/* eslint-disable no-undef */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_BASE_URL; // đọc từ .env

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target, // https://xxxx.ngrok-free.app
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p, // giữ nguyên /api/*
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("ngrok-skip-browser-warning", "true");
            });
          },
        },
      },
    },
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  };
});
