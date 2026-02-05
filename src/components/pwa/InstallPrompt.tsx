"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Tutorial storage key (must match useTutorial.ts)
const TUTORIAL_STORAGE_KEY = "rambam-tutorial-progress-v1";

// Minimum delay after tutorial completion before showing install prompt (10 minutes)
const INSTALL_PROMPT_DELAY_MS = 10 * 60 * 1000;

// Check if running in standalone mode (installed PWA)
function checkIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(window.navigator as Navigator & { standalone?: boolean }).standalone
  );
}

// Check if tutorial is complete and enough time has passed
function canShowInstallPrompt(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const tutorialData = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!tutorialData) return false;

    const progress = JSON.parse(tutorialData);
    const isFinished = progress.completed || progress.skipped;
    if (!isFinished) return false;

    // Check if enough time has passed since completion
    const completedAt = progress.completedAt;
    if (!completedAt) {
      // Legacy data without timestamp - allow showing
      return true;
    }

    const elapsedMs = Date.now() - new Date(completedAt).getTime();
    return elapsedMs >= INSTALL_PROMPT_DELAY_MS;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const t = useTranslations();
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

      // Only show if not dismissed and tutorial is complete with enough time passed
      if (!dismissed && canShowInstallPrompt()) {
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
  }, [isInstalled]);

  // Periodically check if we should show the prompt (after tutorial completion + delay)
  useEffect(() => {
    if (isInstalled || showPrompt || !deferredPrompt) return;

    const dismissed = localStorage.getItem("install_prompt_dismissed");
    if (dismissed) return;

    // Check every 30 seconds if conditions are met (also serves as initial check)
    const checkInterval = setInterval(() => {
      if (canShowInstallPrompt()) {
        setShowPrompt(true);
        clearInterval(checkInterval);
      }
    }, 30000);

    // Initial check after a short delay to avoid synchronous setState
    const initialCheck = setTimeout(() => {
      if (canShowInstallPrompt()) {
        setShowPrompt(true);
        clearInterval(checkInterval);
      }
    }, 100);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(initialCheck);
    };
  }, [isInstalled, showPrompt, deferredPrompt]);

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

  // Don't show if: already installed or not ready to show
  if (isInstalled || !showPrompt) return null;

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
