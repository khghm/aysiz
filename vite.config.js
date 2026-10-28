import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const API_TARGET = process.env.VITE_API_URL || "http://127.0.0.1:4000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    proxy: {
      // API بک‌اند تای سیز (Express روی پورت 4000)
      "/api": { target: API_TARGET, changeOrigin: true },
      // صفحه شبیه‌ساز درگاه زرین‌پال در حالت تستی (سرو شده توسط بک‌اند)
      "/mock-gateway": { target: API_TARGET, changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) return "react-vendor";
            if (id.includes("@tanstack") || id.includes("zustand")) return "state-vendor";
            if (id.includes("recharts") || id.includes("framer-motion")) return "ui-vendor";
            if (id.includes("@dnd-kit")) return "dnd-vendor";
            if (id.includes("date-fns") || id.includes("uuid") || id.includes("canvas-confetti") || id.includes("lucide")) return "util-vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
