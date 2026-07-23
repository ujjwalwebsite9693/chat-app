import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Relay",
        short_name: "Relay",
        description: "Real-time chat, delivered the instant it's sent.",
        start_url: "/",
        display: "standalone",
        background_color: "#0f1220",
        theme_color: "#0f1220",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Only precache the built app shell (HTML/JS/CSS/icons). API calls and
        // the Socket.IO connection are intentionally left untouched here -
        // caching chat data would risk showing stale conversations.
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true, // listen on your LAN IP too, so a phone on the same Wi-Fi can reach it
  },
});
