"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useOnlineStatus } from "@/app/lib/offline/use-online-status";
import { getSyncQueueCount } from "@/app/lib/offline/offline-db";

type SyncState = "idle" | "offline" | "syncing" | "synced";

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [queueCount, setQueueCount] = useState(0);

  // Track offline/online transitions
  useEffect(() => {
    if (!isOnline) {
      setSyncState("offline");
      getSyncQueueCount().then(setQueueCount).catch(() => {});
    } else if (syncState === "offline") {
      // Just came back online
      setSyncState("syncing");
    }
  }, [isOnline]);

  // Listen for sync events
  useEffect(() => {
    const handleSyncStart = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSyncState("syncing");
      setQueueCount(detail?.count || 0);
    };

    const handleSyncComplete = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSyncState("synced");
      setQueueCount(detail?.failed || 0);

      // Auto-hide after 3 seconds
      setTimeout(() => {
        setSyncState("idle");
        setQueueCount(0);
      }, 3000);
    };

    window.addEventListener("ventra:sync-start", handleSyncStart);
    window.addEventListener("ventra:sync-complete", handleSyncComplete);

    return () => {
      window.removeEventListener("ventra:sync-start", handleSyncStart);
      window.removeEventListener("ventra:sync-complete", handleSyncComplete);
    };
  }, []);

  // Poll queue count when offline
  useEffect(() => {
    if (syncState !== "offline") return;
    const interval = setInterval(() => {
      getSyncQueueCount().then(setQueueCount).catch(() => {});
    }, 2000);
    return () => clearInterval(interval);
  }, [syncState]);

  if (syncState === "idle") return null;

  return (
    <div
      className={`flex items-center justify-center gap-2.5 px-4 py-2 text-[13px] font-semibold transition-all duration-300 ${
        syncState === "offline"
          ? "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
          : syncState === "syncing"
            ? "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
            : "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
      }`}
    >
      {syncState === "offline" && (
        <>
          <WifiOff className="size-4" />
          <span>
            You&apos;re offline. Changes will sync when you reconnect.
            {queueCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold dark:bg-amber-500/30">
                {queueCount} pending
              </span>
            )}
          </span>
        </>
      )}
      {syncState === "syncing" && (
        <>
          <RefreshCw className="size-4 animate-spin" />
          <span>Syncing {queueCount} pending changes...</span>
        </>
      )}
      {syncState === "synced" && (
        <>
          <CheckCircle2 className="size-4" />
          <span>All changes synced successfully!</span>
        </>
      )}
    </div>
  );
}
