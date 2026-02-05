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
  }, []);

  return (
    <>
      {children}
      <UpdateBanner />
    </>
  );
}
