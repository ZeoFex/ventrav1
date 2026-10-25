"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { OrderChat, type ChatMessage } from "@/app/components/shop/order-chat";

type Conversation = {
  id: string;
  invoiceId: string;
  customerName: string;
  customerPhone: string;
  customerRegion: string;
  shopName: string;
  totalGhs: string;
  lastMessage: string;
};

function formatGhs(value: string) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(Number(value));
}

export function EcommerceOrdersView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadList = useCallback(async () => {
    const res = await fetch("/api/dashboard/ecommerce");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not load orders");
    const rows = Array.isArray(data.conversations) ? data.conversations : [];
    setConversations(rows);
    setSelectedId((current) => {
      if (current) return current;
      if (window.matchMedia("(min-width: 1024px)").matches) return rows[0]?.id ?? null;
      return null;
    });
  }, []);

  const loadThread = useCallback(async (id: string) => {
    const res = await fetch(`/api/dashboard/ecommerce/${id}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not load the chat");
    setMessages(Array.isArray(data.messages) ? data.messages : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadList()
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load orders");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const pull = () => {
      loadThread(selectedId).catch(() => {});
    };
    pull();
    const timer = window.setInterval(() => {
      if (!cancelled) pull();
    }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedId, loadThread]);

  const selected = conversations.find((item) => item.id === selectedId) ?? null;

  async function send(body: string) {
    if (!selectedId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/ecommerce/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send");
      await loadThread(selectedId);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f6f3ec] dark:bg-[#0c0c0c]">
      <div className="border-b border-[#e7e0d4] px-4 py-3 dark:border-white/10 sm:px-6">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
          Ecommerce orders
        </h1>
        <p className="text-sm text-[#8a8478]">Messages between customers and the shop.</p>
      </div>
      {error ? (
        <p className="mx-4 mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <aside className={`${selected ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-[#e7e0d4] dark:border-white/10 lg:border-r`}>
          {loading ? (
            <p className="p-4 text-sm text-[#8a8478]">Loading orders…</p>
          ) : conversations.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <MessageSquare className="mb-3 size-8 text-[#8a8478]" />
              <p className="font-medium">No ecommerce orders yet</p>
              <p className="mt-1 text-sm text-[#8a8478]">
                When a customer orders from the shop, the chat shows up here.
              </p>
            </div>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {conversations.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`flex w-full flex-col gap-0.5 border-b border-[#e7e0d4] px-4 py-3 text-left dark:border-white/10 ${
                      item.id === selectedId ? "bg-white dark:bg-white/5" : ""
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{item.customerName}</span>
                      <span className="shrink-0 text-xs tabular-nums text-[#006c49] dark:text-[#6ffbbe]">
                        {formatGhs(item.totalGhs)}
                      </span>
                    </span>
                    <span className="truncate text-xs text-[#8a8478]">
                      {item.invoiceId} · {item.customerPhone} · {item.customerRegion}
                    </span>
                    <span className="truncate text-xs text-[#5c574e] dark:text-zinc-300">
                      {item.lastMessage}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <section className={`${selected ? "flex" : "hidden lg:flex"} min-h-0 flex-col bg-white dark:bg-[#111]`}>
          {selected ? (
            <>
              <div className="flex items-center gap-2 border-b border-[#e7e0d4] px-3 py-3 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="rounded-full p-2 lg:hidden"
                  aria-label="Back to orders"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{selected.customerName}</p>
                  <p className="truncate text-xs text-[#8a8478]">
                    {selected.customerPhone} · {selected.customerRegion} · {selected.invoiceId}
                  </p>
                </div>
              </div>
              <OrderChat messages={messages} mine="shop" onSend={send} busy={busy} />
            </>
          ) : (
            <p className="m-auto text-sm text-[#8a8478]">Select an order to open the chat.</p>
          )}
        </section>
      </div>
    </div>
  );
}
