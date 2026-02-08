/**
 * Hook to track and manage offline status
 * Listens to browser online/offline events and verifies with a real ping
 */

"use client";

import { useEffect } from "react";
import {
  useOfflineStore,
  isOffline as checkIsOffline,
  getOfflineReason,
} from "@/stores/offlineStore";
import { isReachable, invalidateCache } from "@/services/connectivity";

export interface OfflineStatus {
  /** Whether the app is currently offline */
  isOffline: boolean;
  /** Whether the app is online */
  isOnline: boolean;
  /** The reason for being offline (in Hebrew), or null if online */
  offlineReason: string | null;
  /** ISO timestamp of last confirmed online status */
  lastOnline: string | null;
  /** Whether there are content updates available */
  hasContentUpdate: boolean;
}

/**
 * Hook to monitor and respond to network connectivity changes.
 * When the browser fires "online", we verify with a real ping to Sefaria
 * before telling the rest of the app we're online.
 */
export function useOfflineStatus(): OfflineStatus {
  const state = useOfflineStore((s) => s.state);
  const lastOnline = useOfflineStore((s) => s.lastOnline);
  const hasContentUpdate = useOfflineStore((s) => s.hasContentUpdate);
  const setOnline = useOfflineStore((s) => s.setOnline);
  const setSystemOffline = useOfflineStore((s) => s.setSystemOffline);

  useEffect(() => {
    // Verify initial connectivity with a real ping
    isReachable().then((reachable) => {
      if (reachable) {
        setOnline();
      } else {
        setSystemOffline();
      }
    });

    const handleOnline = () => {
      // Browser says online — verify with a real ping before trusting it
      invalidateCache();
      isReachable().then((reachable) => {
        if (reachable) {
          setOnline();
        }
        // If ping fails, stay in current state (don't flip to online)
      });
    };

    const handleOffline = () => {
      // Browser says offline — this is a reliable signal, trust it
      invalidateCache();
      setSystemOffline();
    };

    // Listen for connectivity changes
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline, setSystemOffline]);

  return {
    isOffline: checkIsOffline(state),
    isOnline: state === "online",
    offlineReason: getOfflineReason(state),
    lastOnline,
    hasContentUpdate,
  };
}
