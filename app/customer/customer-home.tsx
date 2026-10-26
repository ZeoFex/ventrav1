"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, MessageSquare, Package, Settings } from "lucide-react";
import { OrderChat, type ChatMessage } from "@/app/components/shop/order-chat";
import { MarketNav } from "@/app/components/shop/market-nav";
import { CustomerLiveAlerts } from "@/app/components/shop/customer-live-alerts";
import { GHANA_REGIONS } from "@/app/components/onboarding/constants";

type Tab = "orders" | "messages" | "notifications" | "settings";

type Shopper = { id: string; phone: string; region: string };

type OrderRow = {
  id: string;
  invoiceId: string;
  shopName: string;
  totalGhs: string;
  status: string;
  itemCount: number;
  createdAt: string;
};

type Notice = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

type InboxRow = {
  id: string;
  shopName: string;
  invoiceId: string;
  lastMessage: string;
};

const TABS: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: "orders", label: "Orders", icon: Package },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

function formatGhs(value: string): string {
  const amount = Number(value);
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function statusLabel(status: string): string {
  if (status === "ready_for_pickup") return "Ready";
  if (status === "open") return "In progress";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return status;
}

export function CustomerHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const tab: Tab =
    requested === "messages" || requested === "notifications" || requested === "settings"
      ? requested
      : "orders";

  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [itemsBeingOrdered, setItemsBeingOrdered] = useState(0);
  const [openOrders, setOpenOrders] = useState(0);
  const [unread, setUnread] = useState(0);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [inbox, setInbox] = useState<InboxRow[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileThread, setMobileThread] = useState(false);

  function selectTab(next: Tab) {
    router.replace(next === "orders" ? "/customer" : `/customer?tab=${next}`);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/shop/overview")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login?as=customer");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        if (data.error) {
          setError(typeof data.error === "string" ? data.error : "Could not load your account");
          return;
        }
        setShopper(data.shopper);
        setPhone(data.shopper?.phone ?? "");
        setRegion(data.shopper?.region ?? "");
        setItemsBeingOrdered(Number(data.itemsBeingOrdered) || 0);
        setOpenOrders(Number(data.openOrders) || 0);
        setUnread(Number(data.unreadNotifications) || 0);
        setOrders(Array.isArray(data.orders) ? data.orders : []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your account");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (tab !== "messages") return;
    let cancelled = false;
    fetch("/api/shop/conversations")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data.conversations) ? data.conversations : [];
        setInbox(rows);
        setThreadId((current) => current ?? rows[0]?.id ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== "messages" || !threadId) return;
    let cancelled = false;
    const pull = () => {
      fetch(`/api/shop/conversations/${threadId}`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data.messages)) setMessages(data.messages);
        })
        .catch(() => {});
    };
    pull();
    const timer = window.setInterval(pull, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [tab, threadId]);

  useEffect(() => {
    if (tab !== "notifications") return;
    let cancelled = false;
    fetch("/api/shop/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const rows = Array.isArray(data.notifications) ? data.notifications : [];
        setNotices(rows);
        const unreadIds = rows.filter((row: Notice) => !row.isRead).map((row: Notice) => row.id);
        if (unreadIds.length === 0) return;
        setUnread(0);
        setNotices(rows.map((row: Notice) => ({ ...row, isRead: true })));
        void fetch("/api/shop/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: unreadIds }),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tab]);

  async function sendMessage(body: string) {
    if (!threadId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/shop/conversations/${threadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not send");
      setMessages((current) => [...current, data.message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  async function saveAccount(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const res = await fetch("/api/shop/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          region,
          currentPassword,
          newPassword: newPassword || undefined,
          confirmPassword: confirmPassword || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not update the account");
      setShopper(data.shopper);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved("Account updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the account");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/shop/logout", { method: "POST" });
    router.replace("/login?as=customer");
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-3 pb-28 text-[#1c1917] sm:px-6 lg:pb-16 dark:text-zinc-100">
      <MarketNav current="account" signedIn onSignOut={() => void signOut()} />
      <CustomerLiveAlerts onNew={(count) => setUnread((current) => current + count)} />
      <p className="mb-4 text-sm text-[#8a8478]">
        {shopper ? `${shopper.phone} · ${shopper.region}` : "Orders, messages, and settings"}
      </p>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e7e0d4] bg-white p-4 dark:border-white/10 dark:bg-[#141414]">
          <p className="text-xs font-medium uppercase tracking-wide text-[#8a8478]">Items being ordered</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums">
            {loading ? "—" : itemsBeingOrdered}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e7e0d4] bg-white p-4 dark:border-white/10 dark:bg-[#141414]">
          <p className="text-xs font-medium uppercase tracking-wide text-[#8a8478]">Open orders</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums">
            {loading ? "—" : openOrders}
          </p>
        </div>
        <button
          type="button"
          onClick={() => selectTab("notifications")}
          className="col-span-2 rounded-2xl border border-[#e7e0d4] bg-white p-4 text-left dark:border-white/10 dark:bg-[#141414] sm:col-span-1"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[#8a8478]">Notifications</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums">
            {loading ? "—" : unread}
          </p>
        </button>
      </div>

      <div className="mb-4 hidden gap-2 overflow-x-auto pb-1 lg:flex">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectTab(item.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-[#1f3d32] text-white"
                  : "border border-[#e7e0d4] bg-white text-[#1c1917] dark:border-white/10 dark:bg-[#141414] dark:text-white"
              }`}
            >
              <Icon className="size-4" />
              {item.label}
              {item.id === "notifications" && unread > 0 ? (
                <span className="rounded-full bg-white/20 px-1.5 text-xs tabular-nums">{unread}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "orders" ? (
        <section className="rounded-2xl border border-[#e7e0d4] bg-white dark:border-white/10 dark:bg-[#141414]">
          {loading ? (
            <p className="px-4 py-10 text-center text-sm text-[#8a8478]">Loading orders…</p>
          ) : orders.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[#8a8478]">
              No orders yet.{" "}
              <Link href="/shop" className="font-semibold text-[#006c49]">
                Start shopping
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-[#efe8dc] dark:divide-white/10">
              {orders.map((order) => (
                <li key={order.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{order.shopName}</p>
                    <p className="text-xs text-[#8a8478]">
                      {order.invoiceId} · {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="rounded-full bg-[#efe8dc] px-2.5 py-1 text-xs font-medium text-[#1f3d32] dark:bg-white/10 dark:text-[#6ffbbe]">
                      {statusLabel(order.status)}
                    </span>
                    <p className="text-sm font-semibold tabular-nums">{formatGhs(order.totalGhs)}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setThreadId(order.id);
                        setMobileThread(true);
                        selectTab("messages");
                      }}
                      className="text-sm font-semibold text-[#006c49]"
                    >
                      Message
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "messages" ? (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <div className={`${mobileThread ? "hidden lg:block" : ""} rounded-2xl border border-[#e7e0d4] bg-white p-3 dark:border-white/10 dark:bg-[#141414]`}>
            {inbox.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-[#8a8478]">No messages yet.</p>
            ) : (
              <ul className="space-y-2">
                {inbox.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setThreadId(row.id);
                        setMobileThread(true);
                      }}
                      className={`w-full rounded-xl px-3 py-3 text-left text-sm ${
                        threadId === row.id ? "bg-[#efe8dc] dark:bg-white/10" : "bg-[#f7f4ee] dark:bg-white/5"
                      }`}
                    >
                      <span className="block font-semibold">{row.shopName}</span>
                      <span className="block truncate text-xs text-[#8a8478]">{row.lastMessage || row.invoiceId}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`${mobileThread ? "flex" : "hidden lg:flex"} h-[min(70dvh,36rem)] flex-col overflow-hidden rounded-2xl border border-[#e7e0d4] bg-white dark:border-white/10 dark:bg-[#141414]`}>
            <button
              type="button"
              onClick={() => setMobileThread(false)}
              className="border-b border-[#efe8dc] px-4 py-3 text-left text-sm font-semibold text-[#006c49] lg:hidden dark:border-white/10"
            >
              Back to messages
            </button>
            {threadId ? (
              <OrderChat messages={messages} mine="customer" onSend={sendMessage} busy={busy} />
            ) : (
              <p className="m-auto px-6 text-center text-sm text-[#8a8478]">Choose an order to open the chat.</p>
            )}
          </div>
        </section>
      ) : null}

      {tab === "notifications" ? (
        <section className="rounded-2xl border border-[#e7e0d4] bg-white dark:border-white/10 dark:bg-[#141414]">
          {notices.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[#8a8478]">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-[#efe8dc] dark:divide-white/10">
              {notices.map((notice) => (
                <li key={notice.id}>
                  <Link href={notice.href || "/customer"} className="block px-4 py-3">
                    <p className="font-semibold">{notice.title}</p>
                    <p className="mt-1 text-sm text-[#5c574e] dark:text-zinc-300">{notice.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "settings" ? (
        <form
          onSubmit={saveAccount}
          className="max-w-md space-y-3 rounded-2xl border border-[#e7e0d4] bg-white p-4 dark:border-white/10 dark:bg-[#141414] sm:p-6"
        >
          <h2 className="text-lg font-semibold">Update your account</h2>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Phone number</span>
            <input
              required
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-xl border border-[#d7e0db] bg-transparent px-3 py-2.5 text-base outline-none dark:border-white/10 sm:text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Region</span>
            <select
              required
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="w-full rounded-xl border border-[#d7e0db] bg-transparent px-3 py-2.5 text-base outline-none dark:border-white/10 sm:text-sm"
            >
              <option value="">Select your region</option>
              {GHANA_REGIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Current password</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-xl border border-[#d7e0db] bg-transparent px-3 py-2.5 text-base outline-none dark:border-white/10 sm:text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Leave blank to keep the current password"
              className="w-full rounded-xl border border-[#d7e0db] bg-transparent px-3 py-2.5 text-base outline-none dark:border-white/10 sm:text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-[#d7e0db] bg-transparent px-3 py-2.5 text-base outline-none dark:border-white/10 sm:text-sm"
            />
          </label>
          {saved ? <p className="text-sm font-medium text-[#006c49]">{saved}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#006c49] py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </form>
      ) : null}

      <nav
        aria-label="Account sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e7e0d4] bg-white/95 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl lg:hidden dark:border-white/10 dark:bg-[#141414]/95"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id !== "messages") setMobileThread(false);
                  selectTab(item.id);
                }}
                className={`relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium ${
                  active ? "text-[#1f3d32] dark:text-[#6ffbbe]" : "text-[#8a8478]"
                }`}
              >
                <Icon className="size-5" />
                {item.label}
                {item.id === "notifications" && unread > 0 ? (
                  <span className="absolute right-3 top-1 size-2 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
