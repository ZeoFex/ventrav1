"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    (navigator as any).standalone === true
  );
}

export function PwaInstallBanner() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  const isIos = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    setInstalled(isStandaloneMode());

    const onBip = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (dismissed || installed) return null;

  const showAndroid = !!installEvent;
  const showIos = isIos;
  if (!showAndroid && !showIos) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[300] w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Install VentraPOS</div>
          {showAndroid ? (
            <div className="mt-1 text-sm text-muted-foreground">
              Install this app for faster access and offline support.
            </div>
          ) : (
            <div className="mt-1 text-sm text-muted-foreground">
              On iPhone/iPad: tap Share, then Add to Home Screen.
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {showAndroid ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={async () => {
              const ev = installEvent;
              if (!ev) return;
              await ev.prompt();
              try {
                await ev.userChoice;
              } finally {
                setInstallEvent(null);
              }
            }}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-[#006c49] px-4 text-sm font-semibold text-white hover:bg-[#005a3d]"
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted"
          >
            Not now
          </button>
        </div>
      ) : null}
    </div>
  );
}
