"use client";

import { useEffect } from "react";
import { initializeOffline } from "@/services/offlineInit";
import { UpdateBanner } from "./UpdateBanner";

interface OfflineProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that initializes offline-first infrastructure
 * and renders offline-related UI components
 */
export function OfflineProvider({ children }: OfflineProviderProps) {
  useEffect(() => {
    // Initialize offline infrastructure on mount
    initializeOffline();

    // Register service worker (skip in development to avoid caching issues)
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })
        .then((registration) => {
          console.log("[PWA] Service worker registered:", registration.scope);

          // Check for updates periodically
          registration.update();

          // Listen for new service worker
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              console.log("[PWA] New service worker installing...");
            }
          });
        })
        .catch((error) => {
          console.error("[PWA] Service worker registration failed:", error);
        });
    }
  }, []);

  return (
    <>
      {children}
      <UpdateBanner />
    </>
  );
}
