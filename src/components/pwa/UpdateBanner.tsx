"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";

export function UpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );

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
            // New version available
            setWaitingWorker(newWorker);
            setShowBanner(true);
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

  const handleUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    setShowBanner(false);
  }, [waitingWorker]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
  }, []);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white px-4 py-3 z-[1001] shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-between gap-4">
        <span className="text-sm font-medium">גרסה חדשה זמינה!</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUpdate}
            className="text-white hover:bg-white/20"
          >
            רענן
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-white/70 hover:bg-white/20"
          >
            מאוחר יותר
          </Button>
        </div>
      </div>
    </div>
  );
}
