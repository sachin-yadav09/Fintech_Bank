// src\main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

import { AuthProvider } from "@/context/AuthContext";

/* FIX: Initialize dark mode class on <html> BEFORE React mounts.
   DaisyUI v5 auto-detects prefers-color-scheme: dark and applies its
   dark theme colors. Without the .dark class on <html>, Tailwind's
   dark: utilities won't activate, causing a mismatch: white text
   (from DaisyUI dark) on light gray background (from body).
   This script reads localStorage or system preference and applies
   the class immediately to prevent invisible text on first paint. */
(function initTheme() {
  const root = document.documentElement;
  const stored = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = stored ? stored === "dark" : prefersDark;
  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
})();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
