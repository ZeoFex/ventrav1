"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, X } from "lucide-react";

type ShopperNotice = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  isRead: boolean;
};

const PERMISSION_KEY = "ventra-customer-alert-permission";

function isShopReply(title: string) {
  return title.startsWith("Message from ");
}

function showDeviceAlert(note: ShopperNotice) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const popup = new Notification(note.title, {
    body: note.body,
    tag: note.id,
  });
  popup.onclick = () => {
    window.focus();
    window.location.assign(note.href || "/customer?tab=messages");
    popup.close();
  };
}

export function CustomerLiveAlerts({
  enabled = true,
  onNew,
}: {
  enabled?: boolean;
  onNew?: (count: number) => void;
}) {
  const seen = useRef<Set<string> | null>(null);
  const onNewRef = useRef(onNew);
  const [popups, setPopups] = useState<ShopperNotice[]>([]);
  const [askPermission, setAskPermission] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onNewRef.current = onNew;
  }, [onNew]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const pull = async () => {
      if (document.visibilityState === "hidden" && typeof Notification !== "undefined" && Notification.permission !== "granted") {
        return;
      }
      const res = await fetch("/api/shop/notifications");
      if (res.status === 401) return;
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      const rows: ShopperNotice[] = Array.isArray(data.notifications) ? data.notifications : [];
      if (seen.current === null) {
        seen.current = new Set(rows.map((note) => note.id));
        setReady(true);
        return;
      }
      const fresh = rows.filter(
        (note) => !note.isRead && isShopReply(note.title) && !seen.current!.has(note.id),
      );
      for (const note of rows) seen.current.add(note.id);
      if (fresh.length === 0) return;
      setPopups((current) => [...fresh].reverse().concat(current).slice(0, 3));
      onNewRef.current?.(fresh.length);
      for (const note of fresh) showDeviceAlert(note);
    };

    void pull().catch(() => {});
    const timer = window.setInterval(() => {
      void pull().catch(() => {});
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  useEffect(() => {
    if (!ready) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    try {
      if (window.localStorage.getItem(PERMISSION_KEY) === "later") return;
    } catch {
      return;
    }
    setAskPermission(true);
  }, [ready]);

  useEffect(() => {
    if (popups.length === 0) return;
    const id = popups[0]?.id;
    const timer = window.setTimeout(() => {
      setPopups((current) => current.filter((note) => note.id !== id));
    }, 14000);
    return () => window.clearTimeout(timer);
  }, [popups]);

  function allowAlerts() {
    if (typeof Notification === "undefined") return;
    void Notification.requestPermission().finally(() => {
      try {
        window.localStorage.setItem(PERMISSION_KEY, "asked");
      } catch {
        /* private mode */
      }
      setAskPermission(false);
    });
  }

  function later() {
    try {
      window.localStorage.setItem(PERMISSION_KEY, "later");
    } catch {
      /* private mode */
    }
    setAskPermission(false);
  }

  function openAlert(note: ShopperNotice) {
    setPopups((current) => current.filter((item) => item.id !== note.id));
    void fetch("/api/shop/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [note.id] }),
    });
    window.location.assign(note.href || "/customer?tab=messages");
  }

  if (!enabled || (!askPermission && popups.length === 0)) return null;

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.5rem)] z-[90] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-[22rem]"
    >
      {askPermission ? (
        <div className="pointer-events-auto rounded-2xl border border-[#d7e0d4] bg-white p-3 shadow-[0_16px_40px_-18px_rgba(0,53,39,0.45)] dark:border-white/10 dark:bg-[#141414]">
          <p className="text-sm font-semibold text-[#1c1917] dark:text-zinc-100">
            Pop up shop messages
          </p>
          <p className="mt-1 text-[13px] leading-snug text-[#5c574e] dark:text-zinc-300">
            Allow alerts on this phone or computer so a reply from the shop shows even if the page is in the background.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={allowAlerts}
              className="rounded-full bg-[#1f3d32] px-3 py-2 text-[13px] font-semibold text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
            >
              Allow alerts
            </button>
            <button
              type="button"
              onClick={later}
              className="rounded-full px-3 py-2 text-[13px] font-semibold text-[#5c574e] dark:text-zinc-300"
            >
              Later
            </button>
          </div>
        </div>
      ) : null}
      {popups.map((note) => (
        <div
          key={note.id}
          className="pointer-events-auto flex gap-3 rounded-2xl border border-[#d7e0d4] bg-white p-3 shadow-[0_16px_40px_-18px_rgba(0,53,39,0.5)] dark:border-white/10 dark:bg-[#141414]"
        >
          <button type="button" onClick={() => openAlert(note)} className="flex min-w-0 flex-1 gap-3 text-left">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1f3d32] text-white dark:bg-[#6ffbbe] dark:text-[#003527]">
              <MessageSquare className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b8f7c]">
                Shop message
              </span>
              <span className="mt-0.5 block text-sm font-semibold text-[#1c1917] dark:text-zinc-100">
                {note.title}
              </span>
              <span className="mt-0.5 line-clamp-3 block text-[13px] leading-snug text-[#5c574e] dark:text-zinc-300">
                {note.body}
              </span>
            </span>
          </button>
          <button
            type="button"
            aria-label="Dismiss alert"
            onClick={() => setPopups((current) => current.filter((item) => item.id !== note.id))}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#8a8478]"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
