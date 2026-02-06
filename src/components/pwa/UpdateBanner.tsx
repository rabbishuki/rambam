"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useOfflineStore } from "@/stores/offlineStore";

export function UpdateBanner() {
  const t = useTranslations("update");
  const tOffline = useTranslations("offline");
  const [hasAppUpdate, setHasAppUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );
  const [dismissed, setDismissed] = useState<"app" | "content" | null>(null);

  // Content update from background sync
  const hasContentUpdate = useOfflineStore((s) => s.hasContentUpdate);
  const setHasContentUpdate = useOfflineStore((s) => s.setHasContentUpdate);

  // Sync progress state
  const syncProgress = useOfflineStore((s) => s.syncProgress);

  // Derive banner type from state (app update > sync status > content update)
  const showAppBanner = hasAppUpdate && dismissed !== "app";
  const showSyncBanner = !showAppBanner && syncProgress.status !== "idle";
  const showContentBanner =
    hasContentUpdate &&
    !showAppBanner &&
    !showSyncBanner &&
    dismissed !== "content";

  // Service worker update detection
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    navigator.serviceWorker.ready.then((registration) => {
      // Check for updates periodically
      registration.update();

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New app version available
            setWaitingWorker(newWorker);
            setHasAppUpdate(true);
            setDismissed(null); // Reset dismissed state for new update
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  const handleAppUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    setHasAppUpdate(false);
  }, [waitingWorker]);

  const handleContentRefresh = useCallback(() => {
    setHasContentUpdate(false);
    // Soft refresh - just reload the page to pick up new data
    window.location.reload();
  }, [setHasContentUpdate]);

  const handleDismissApp = useCallback(() => {
    setDismissed("app");
  }, []);

  const handleDismissContent = useCallback(() => {
    setHasContentUpdate(false);
    setDismissed("content");
  }, [setHasContentUpdate]);

  if (!showAppBanner && !showSyncBanner && !showContentBanner) return null;

  // App update banner (blue)
  if (showAppBanner) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-primary)] text-white px-3 py-2.5 z-[1001] shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <span className="text-sm font-medium">{t("appAvailable")}</span>
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAppUpdate}
              className="bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 font-semibold px-3 py-1 rounded-md"
            >
              {t("refresh")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissApp}
              className="bg-[var(--color-primary-dark)] text-white hover:opacity-80 px-3 py-1 rounded-md"
            >
              {t("later")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Sync status banner (yellow = syncing, green = success, red = error)
  if (showSyncBanner) {
    const bgColor =
      syncProgress.status === "syncing"
        ? "bg-amber-500"
        : syncProgress.status === "success"
          ? "bg-green-600"
          : "bg-red-600";

    const progressText =
      syncProgress.status === "syncing" && syncProgress.total
        ? tOffline("downloading", {
            percent: Math.round(
              ((syncProgress.completed || 0) / syncProgress.total) * 100,
            ),
          })
        : syncProgress.status === "success"
          ? tOffline("downloadComplete")
          : syncProgress.message ||
            tOffline("downloadFailed", { failed: 0, total: 0 });

    return (
      <div
        className={`fixed bottom-0 left-0 right-0 ${bgColor} text-white px-4 py-3 z-[1001] shadow-lg transition-colors duration-300`}
      >
        <div className="max-w-md mx-auto flex items-center justify-center gap-3">
          {syncProgress.status === "syncing" && (
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {syncProgress.status === "success" && (
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          {syncProgress.status === "error" && (
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
          <span className="text-sm font-medium">{progressText}</span>
        </div>
      </div>
    );
  }

  // Content update banner (green)
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-green-600 text-white px-3 py-2.5 z-[1001] shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{t("contentAvailable")}</span>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleContentRefresh}
            className="bg-white text-green-600 hover:bg-green-50 font-semibold px-3 py-1 rounded-md"
          >
            {t("refreshContent")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismissContent}
            className="bg-green-500 text-white hover:bg-green-400 px-3 py-1 rounded-md"
          >
            {t("later")}
          </Button>
        </div>
      </div>
    </div>
  );
}
