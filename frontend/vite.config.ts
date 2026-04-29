// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      // Fallback alias for tools that don't consume the tsconfig plugin
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ─── Dev server proxy ────────────────────────────────────────────────────
  // FIX: Without this, requests like POST /user/auth/send-otp/ hit Vite
  // (port 5173) and return 404. The proxy forwards any request whose path
  // starts with /user/ or /core/ to the Django backend on port 8000.
  //
  // VITE_API_URL in .env should be a RELATIVE path "" (empty string) or "/"
  // so axios sends requests to the same Vite origin and Vite proxies them.
  // Do NOT set VITE_API_URL=http://localhost:8000 when using this proxy —
  // that bypasses Vite entirely and breaks HttpOnly cookie auth (CORS + SameSite).
  server: {
    proxy: {
      "/user": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/core": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  base: process.env.VITE_BASE_PATH || "/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {},
  },
});