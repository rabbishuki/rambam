"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useLocationStore } from "@/stores/locationStore";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Check if running in standalone mode (installed PWA)
function checkIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(window.navigator as Navigator & { standalone?: boolean }).standalone
  );
}

export function InstallPrompt() {
  const t = useTranslations();
  const hasCompletedSetup = useLocationStore(
    (state) => state.hasCompletedSetup,
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  // Initialize isInstalled state lazily to avoid setState in effect
  const [isInstalled, setIsInstalled] = useState(checkIsStandalone);

  useEffect(() => {
    // Skip if already installed
    if (isInstalled) return;

    // Check if already dismissed
    const dismissed = localStorage.getItem("install_prompt_dismissed");

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after a delay if not dismissed before AND onboarding is complete
      if (!dismissed && hasCompletedSetup) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [hasCompletedSetup]);

  // Show prompt when onboarding completes (if we have a deferred prompt)
  useEffect(() => {
    if (hasCompletedSetup && deferredPrompt && !showPrompt) {
      const dismissed = localStorage.getItem("install_prompt_dismissed");
      if (!dismissed) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }
    }
  }, [hasCompletedSetup, deferredPrompt, showPrompt]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setShowPrompt(false);
    setDeferredPrompt(null);
    localStorage.setItem("install_prompt_dismissed", "true");
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem("install_prompt_dismissed", "true");
  }, []);

  // Don't show if: already installed, not ready to show, or onboarding not complete
  if (isInstalled || !showPrompt || !hasCompletedSetup) return null;

  return (
    <div
      className={`
        fixed bottom-4 left-4 right-4 max-w-[500px] mx-auto
        bg-white border-2 border-blue-600 rounded-xl p-4
        shadow-xl z-[1000]
        animate-slide-up
      `}
    >
      <div className="flex flex-col gap-3">
        <p className="text-gray-800 font-medium">
          💡 {t("messages.installPrompt")}
        </p>
        <div className="flex gap-2">
          <Button variant="primary" fullWidth onClick={handleInstall}>
            {t("actions.install")}
          </Button>
          <Button variant="secondary" fullWidth onClick={handleDismiss}>
            {t("actions.later")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Export hook for header install button
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone;

    if (isStandalone) return;

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setCanInstall(false);
    }

    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return { canInstall, install };
}
