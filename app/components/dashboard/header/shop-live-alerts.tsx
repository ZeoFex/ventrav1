"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, ShoppingBag, X } from "lucide-react";
import {
  isOnlineCustomerAlert,
  useNotifications,
  type Notification,
} from "./notifications-data-hooks";

const PERMISSION_KEY = "ventra-shop-alert-permission";

function showDeviceAlert(note: Notification) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const popup = new Notification(note.title, {
    body: note.body,
    tag: note.id,
  });
  popup.onclick = () => {
    window.focus();
    window.location.assign("/dashboard/ecommerce");
    popup.close();
  };
}

export function ShopLiveAlerts() {
  const { notifications, isLoading, mutate } = useNotifications();
  const seen = useRef<Set<string> | null>(null);
  const [popups, setPopups] = useState<Notification[]>([]);
  const [askPermission, setAskPermission] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (seen.current === null) {
      seen.current = new Set(notifications.map((note) => note.id));
      return;
    }
    const fresh = notifications.filter(
      (note) => !note.isRead && isOnlineCustomerAlert(note.title) && !seen.current!.has(note.id),
    );
    for (const note of notifications) seen.current.add(note.id);
    if (fresh.length === 0) return;
    setPopups((current) => [...fresh].reverse().concat(current).slice(0, 3));
    for (const note of fresh) showDeviceAlert(note);
  }, [notifications, isLoading]);

  useEffect(() => {
    if (popups.length === 0) return;
    const id = popups[0]?.id;
    const timer = window.setTimeout(() => {
      setPopups((current) => current.filter((note) => note.id !== id));
    }, 14000);
    return () => window.clearTimeout(timer);
  }, [popups]);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    try {
      if (window.localStorage.getItem(PERMISSION_KEY) === "later") return;
    } catch {
      return;
    }
    setAskPermission(true);
  }, []);

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

  function openAlert(note: Notification) {
    setPopups((current) => current.filter((item) => item.id !== note.id));
    void fetch(`/api/notifications/${note.id}`, { method: "PATCH" }).then(() => mutate());
    window.location.assign("/dashboard/ecommerce");
  }

  if (!askPermission && popups.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.25rem)] z-[90] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-[22rem]"
    >
      {askPermission ? (
        <div className="pointer-events-auto rounded-2xl border border-[#d7e0db] bg-white p-3 shadow-[0_16px_40px_-18px_rgba(0,53,39,0.45)] dark:border-white/10 dark:bg-[#141414]">
          <p className="text-sm font-semibold text-[#1c1917] dark:text-zinc-100">
            Pop up online orders and messages
          </p>
          <p className="mt-1 text-[13px] leading-snug text-[#5c574e] dark:text-zinc-300">
            Allow alerts on this phone or computer so a customer’s order or message shows even if VentraPOS is in the background.
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
      {popups.map((note) => {
        const order = note.title === "Someone wants to order";
        const Icon = order ? ShoppingBag : MessageSquare;
        return (
          <div
            key={note.id}
            className="pointer-events-auto flex gap-3 rounded-2xl border border-[#d7e0db] bg-white p-3 shadow-[0_16px_40px_-18px_rgba(0,53,39,0.5)] dark:border-white/10 dark:bg-[#141414]"
          >
            <button
              type="button"
              onClick={() => openAlert(note)}
              className="flex min-w-0 flex-1 gap-3 text-left"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1f3d32] text-white dark:bg-[#6ffbbe] dark:text-[#003527]">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b8f7c]">
                  {order ? "New online order" : "Customer message"}
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
        );
      })}
    </div>
  );
}
