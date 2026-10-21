"use client";

import { Bell, Package, Receipt, Settings, X, Info, AlertTriangle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNotifications } from "./notifications-data-hooks";
import type { NotificationIcon } from "./notifications-data-hooks";

function formatTimeAgo(dateInput: string) {
  const date = new Date(dateInput);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function IconFor({ icon }: { icon: NotificationIcon }) {
  const cls = "size-4 shrink-0";
  if (icon === "package") return <Package className={cls} strokeWidth={1.75} aria-hidden />;
  if (icon === "receipt") return <Receipt className={cls} strokeWidth={1.75} aria-hidden />;
  if (icon === "settings") return <Settings className={cls} strokeWidth={1.75} aria-hidden />;
  if (icon === "alert") return <AlertTriangle className={cls} strokeWidth={1.75} aria-hidden />;
  return <Info className={cls} strokeWidth={1.75} aria-hidden />;
}

export function HeaderNotifications() {
  const [open, setOpen] = useState(false);
  const [panelTop, setPanelTop] = useState(72);
  const bellRef = useRef<HTMLButtonElement>(null);
  const { notifications, mutate, isLoading, isError } = useNotifications();
  const panelId = useId();
  const unread = notifications.filter((i) => !i.isRead).length;

  const placePanel = useCallback(() => {
    const header = bellRef.current?.closest("header");
    const rect = header?.getBoundingClientRect() ?? bellRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPanelTop(Math.round(rect.bottom));
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    placePanel();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", placePanel);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", placePanel);
      document.body.style.overflow = prev;
    };
  }, [open, close, placePanel]);

  const markAllRead = useCallback(async () => {
    mutate(notifications.map((n) => ({ ...n, isRead: true })), false);
    await fetch("/api/notifications", { method: "PATCH" });
    mutate();
  }, [notifications, mutate]);

  const markRead = useCallback(async (id: string) => {
    const target = notifications.find(n => n.id === id);
    if (!target || target.isRead) return;
    
    mutate(
      notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      false
    );
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    mutate();
  }, [notifications, mutate]);

  return (
    <>
      <button
        ref={bellRef}
        type="button"
        onClick={() => {
          placePanel();
          setOpen(true);
        }}
        className="tap-target relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground sm:size-10 sm:rounded-xl dark:hover:bg-[#1a1a1a]"
        aria-label="Open notifications"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <Bell className="size-[1.25rem]" strokeWidth={1.75} aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-[#006c49] text-[9px] font-bold text-white ring-2 ring-surface-card dark:bg-[#22c55e] dark:ring-[#0a0a0a]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-x-0 bottom-0 z-[80]"
              style={{ top: panelTop + 10 }}
            >
        <button
          type="button"
          className="absolute inset-0 bg-[#0b1a14]/30 dark:bg-black/45"
          aria-label="Close notifications"
          onClick={close}
        />

        <div
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-labelledby="notifications-drawer-title"
          style={{
            maxHeight: `min(26rem, calc(100dvh - ${panelTop + 10}px - 0.75rem - env(safe-area-inset-bottom)))`,
          }}
          className="relative mx-3 flex flex-col overflow-hidden rounded-2xl border border-[#d7e0db] bg-surface-card shadow-[0_16px_40px_-18px_rgba(0,30,20,0.4)] dark:border-white/[0.1] dark:bg-[#111] sm:ml-auto sm:mr-4 sm:w-[22.5rem]"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#bfc9c3]/15 px-4 py-3.5 dark:border-white/[0.08]">
            <div>
              <h2
                id="notifications-drawer-title"
                className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foreground"
              >
                Notifications
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {unread > 0 ? `${unread} unread` : "You’re all caught up"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="rounded-lg px-2 py-1.5 text-[12px] font-medium text-[#006c49] transition-colors hover:bg-[#006c49]/10 dark:text-[#6ffbbe] dark:hover:bg-[#6ffbbe]/10"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={close}
                className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground dark:hover:bg-[#1a1a1a]"
                aria-label="Close"
              >
                <X className="size-5" strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <p className="mt-3 text-[14px] text-muted-foreground">Loading notifications...</p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <AlertTriangle className="size-6 text-destructive" />
                <p className="mt-3 text-[14px] font-medium text-foreground">Failed to load</p>
                <p className="mt-1 text-[13px] text-muted-foreground">Please try again later.</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-elevated dark:bg-[#141414]">
                  <Bell className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden />
                </div>
                <p className="mt-3 text-[14px] font-medium text-foreground">
                  No notifications
                </p>
                <p className="mt-1 max-w-[14rem] text-[13px] text-muted-foreground">
                  Alerts for stock, sales, and team activity will show here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[#bfc9c3]/10 dark:divide-white/[0.06]">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className={`flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-elevated/80 dark:hover:bg-[#141414]/90 ${
                        !n.isRead ? "bg-[#006c49]/[0.04] dark:bg-[#6ffbbe]/[0.04]" : ""
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#bfc9c3]/15 bg-white dark:border-white/[0.08] dark:bg-[#141414] ${
                          !n.isRead
                            ? "text-[#006c49] dark:text-[#6ffbbe]"
                            : "text-muted-foreground"
                        }`}
                      >
                        <IconFor icon={n.icon} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-[14px] font-medium leading-snug text-foreground">
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span className="mt-1 size-2 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
                          )}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">
                          {n.body}
                        </span>
                        <span className="mt-1.5 block text-[11px] font-medium tabular-nums text-muted-foreground/90">
                          {formatTimeAgo(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
