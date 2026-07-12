import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "logo.png"],
      manifest: {
        name: "온에어 플래너 (On-Air Planner)",
        short_name: "On-Air Planner",
        description: "방송 편성 및 관리 시스템",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "logo.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "logo.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "logo.png",
            sizes: "any",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://api:8787",
        changeOrigin: true,
      },
    },
  },
});

