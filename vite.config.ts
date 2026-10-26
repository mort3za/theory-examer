import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// BASE_PATH is set by the GitHub Pages workflow ("/<repo>/"); local builds use "/".
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Theory Examer",
        short_name: "Theory",
        description: "Learn the German driving theory exam with spaced repetition.",
        theme_color: "#09090b",
        background_color: "#ffffff",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}", "data/*.json"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // Question images: keep the ones already seen for offline study.
            urlPattern: ({ url }) =>
              /\.(png|jpe?g|gif|webp)$/i.test(url.pathname) &&
              (url.hostname === "storage.googleapis.com" || url.hostname === "raw.githubusercontent.com"),
            handler: "CacheFirst",
            options: {
              cacheName: "question-images",
              // GCS sends no CORS headers, so responses are opaque and count large against the quota.
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
