import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const API_TARGET = process.env.VITE_API_URL || "http://localhost:4000";

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
});
