"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Minus, Plus, Search, ShoppingBag, Store, Trash2 } from "lucide-react";
import { CatalogProductImage } from "@/app/components/dashboard/products/catalog-product-image";
import { OrderChat, type ChatMessage } from "@/app/components/shop/order-chat";
import { GHANA_REGIONS } from "@/app/components/onboarding/constants";
import {
  preferenceGroups,
  preferenceSummary,
  type PreferenceOption,
  type ShopVariation,
} from "@/app/shop/shop-preferences";

type Listing = {
  id: string;
  name: string;
  priceGhs: string;
  imageSrc: string | null;
  categoryName: string;
  shopName: string;
  region: string;
  sellable: number;
  variations?: ShopVariation[];
};

type CartChoice = PreferenceOption & { group: string };

type Shopper = {
  id: string;
  email: string;
  phone: string;
  region: string;
};

type CartLine = Listing & {
  qty: number;
  lineKey: string;
  choices: CartChoice[];
  unitPriceGhs: string;
};

type PlacedOrder = {
  shopName: string;
  invoiceId: string;
  totalGhs: number;
  conversationId: string;
};

type Step = "browse" | "cart" | "account" | "pay" | "done" | "messages";

function formatGhs(n: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(n);
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-[#3d5248] dark:text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center rounded-xl border border-[#d7e0db] bg-white pr-1 dark:border-white/10 dark:bg-[#111]">
        <input
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base outline-none sm:text-sm"
          required
        />
        <button
          type="button"
          onClick={() => setVisible((open) => !open)}
          className="flex size-9 items-center justify-center rounded-lg text-[#5d7368]"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    </label>
  );
}

function CategoryButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm ${
        active
          ? "bg-[#efe8dc] font-semibold text-[#1f3d32] dark:bg-white/10 dark:text-[#6ffbbe]"
          : "text-[#5c574e] hover:bg-[#f7f4ee] dark:text-zinc-300 dark:hover:bg-white/5"
      }`}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0 text-xs tabular-nums text-[#8a8478]">{count}</span>
    </button>
  );
}

export function ShopMarket() {
  const [products, setProducts] = useState<Listing[]>([]);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [picking, setPicking] = useState<Listing | null>(null);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>("browse");
  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [mode, setMode] = useState<"create" | "signin">("create");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [payment, setPayment] = useState<"momo" | "delivery">("delivery");
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<ChatMessage[]>([]);
  const [inbox, setInbox] = useState<
    { id: string; shopName: string; invoiceId: string; lastMessage: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/shop/catalog").then((res) => res.json()),
      fetch("/api/shop/session").then((res) => res.json()),
    ])
      .then(([catalog, session]) => {
        if (cancelled) return;
        setProducts(Array.isArray(catalog.products) ? catalog.products : []);
        setShopper(session.shopper ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("The shop could not load. Refresh and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const matched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((item) =>
      [item.name, item.shopName, item.categoryName, item.region].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    );
  }, [products, query]);

  const visibleCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of matched) {
      counts.set(product.categoryName, (counts.get(product.categoryName) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [matched]);

  const groups = useMemo(() => {
    const source =
      category === "All" ? matched : matched.filter((item) => item.categoryName === category);
    const buckets = new Map<string, Listing[]>();
    for (const product of source) {
      const list = buckets.get(product.categoryName) ?? [];
      list.push(product);
      buckets.set(product.categoryName, list);
    }
    return [...buckets.entries()].map(([name, items]) => ({ name, items }));
  }, [matched, category]);
  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const total = cart.reduce((sum, line) => sum + Number(line.unitPriceGhs) * line.qty, 0);
  const pickingGroups = picking ? preferenceGroups(picking) : [];
  const pickingReady = pickingGroups.every((group) => picked[group.label]);

  function startAdd(product: Listing) {
    const groups = preferenceGroups(product);
    if (groups.length === 0) {
      commitAdd(product, []);
      return;
    }
    setPicking(product);
    setPicked({});
    setError("");
  }

  function commitAdd(product: Listing, choices: CartChoice[]) {
    const lineKey = `${product.id}|${choices.map((choice) => `${choice.group}:${choice.label}`).join("|")}`;
    const priced = [...choices].reverse().find((choice) => choice.priceGhs);
    const unitPriceGhs = priced?.priceGhs ?? product.priceGhs;
    const caps = [product.sellable, ...choices.flatMap((choice) => (choice.sellable ? [choice.sellable] : []))];
    const sellable = Math.min(...caps);
    setCart((current) => {
      const found = current.find((line) => line.lineKey === lineKey);
      if (found) {
        return current.map((line) =>
          line.lineKey === lineKey ? { ...line, qty: Math.min(line.qty + 1, sellable) } : line,
        );
      }
      return [...current, { ...product, qty: 1, lineKey, choices, unitPriceGhs, sellable }];
    });
    setError("");
  }

  function confirmPick() {
    if (!picking || !pickingReady) return;
    const choices = pickingGroups.flatMap((group) => {
      const option = group.options.find((item) => item.label === picked[group.label]);
      return option ? [{ ...option, group: group.label }] : [];
    });
    commitAdd(picking, choices);
    setPicking(null);
  }

  function setQty(lineKey: string, qty: number) {
    setCart((current) =>
      current
        .map((line) => (line.lineKey === lineKey ? { ...line, qty } : line))
        .filter((line) => line.qty > 0),
    );
  }

  function removeLine(lineKey: string) {
    setCart((current) => current.filter((line) => line.lineKey !== lineKey));
  }

  async function submitAccount(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const endpoint = mode === "create" ? "/api/shop/account" : "/api/shop/login";
    const body =
      mode === "create"
        ? { email, password, confirmPassword, phone, region }
        : { email, password };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not save the account");
      setShopper(data.shopper);
      setStep("pay");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the account");
    } finally {
      setBusy(false);
    }
  }

  async function placeOrder() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: payment,
          lines: cart.map((line) => {
            const variationIds = line.choices.flatMap((choice) =>
              choice.variationId ? [choice.variationId] : [],
            );
            return {
              productId: line.id,
              quantity: line.qty,
              variationId: variationIds.length === 1 ? variationIds[0] : undefined,
              preferences: preferenceSummary(line.choices) || undefined,
            };
          }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not place the order");
      const placed = Array.isArray(data.orders) ? data.orders : [];
      setOrders(placed);
      setThreadId(placed[0]?.conversationId ?? null);
      setCart([]);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place the order");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!threadId || (step !== "done" && step !== "messages")) return;
    let cancelled = false;
    const pull = () => {
      fetch(`/api/shop/conversations/${threadId}`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data.messages)) setThreadMessages(data.messages);
        })
        .catch(() => {});
    };
    pull();
    const timer = window.setInterval(pull, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [threadId, step]);

  async function sendToShop(body: string) {
    if (!threadId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/shop/conversations/${threadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not send");
      setThreadMessages((current) => [...current, data.message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  async function openMessages() {
    setStep("messages");
    setError("");
    const res = await fetch("/api/shop/conversations");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not load messages");
      return;
    }
    const rows = Array.isArray(data.conversations) ? data.conversations : [];
    setInbox(rows);
    if (!threadId && rows[0]) setThreadId(rows[0].id);
  }

  return (
    <div className="mx-auto w-full max-w-[90rem] px-3 pb-32 text-[#1c1917] sm:px-6 lg:px-8 dark:text-zinc-100">
      <div className="mb-4 flex items-start justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b8f7c]">
            Shop here
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything you need is here
          </h1>
          <p className="mt-2 hidden max-w-xl text-sm text-[#8a8478] sm:block">
            Products are grouped by category. Each one shows the shop and the region it is in.
          </p>
        </div>
        {shopper ? (
          <button
            type="button"
            onClick={() => void openMessages()}
            className="inline-flex h-10 shrink-0 items-center rounded-full border border-[#e7e0d4] bg-white px-3 text-sm font-medium dark:border-white/10 dark:bg-[#141414]"
          >
            Messages
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {step === "browse" ? (
        <div className="flex items-start gap-8">
          <aside className="sticky top-28 hidden max-h-[calc(100dvh-8rem)] w-56 shrink-0 self-start overflow-y-auto lg:block">
            <div className="overflow-hidden rounded-[1.75rem] border border-[#e7e0d4] bg-white dark:border-white/10 dark:bg-[#141414]">
              <div className="bg-[#1f3d32] px-4 py-3 text-[#f4f1ea]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#cde7d8]">
                  Categories
                </p>
                <p className="mt-1 text-sm">{matched.length} products</p>
              </div>
              <div className="flex flex-col p-2">
                <CategoryButton
                  active={category === "All"}
                  label="All categories"
                  count={matched.length}
                  onClick={() => setCategory("All")}
                />
                {visibleCategories.map((item) => (
                  <CategoryButton
                    key={item.name}
                    active={category === item.name}
                    label={item.name}
                    count={item.count}
                    onClick={() => setCategory(item.name)}
                  />
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <label className="relative mb-5 block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8a8478]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search items, shops, or regions"
                aria-label="Search items"
                className="w-full rounded-2xl border border-[#e7e0d4] bg-white py-3 pl-11 pr-4 text-base outline-none placeholder:text-[#a39d90] focus:border-[#1f3d32] dark:border-white/10 dark:bg-[#141414] dark:focus:border-[#6ffbbe] sm:text-sm"
              />
            </label>
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {["All", ...visibleCategories.map((item) => item.name)].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategory(name)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium ${
                    category === name
                      ? "bg-[#1f3d32] text-white"
                      : "border border-[#e7e0d4] bg-white text-[#1c1917] dark:border-white/10 dark:bg-[#141414] dark:text-white"
                  }`}
                >
                  {name === "All" ? "All categories" : name}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="py-16 text-center text-sm text-[#8a8478]">Loading the market…</p>
            ) : groups.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-[#e7e0d4] px-6 py-20 text-center dark:border-white/10">
                <Store className="mx-auto mb-3 size-8 opacity-40" />
                <p className="font-medium">
                  {query.trim() ? `No items match “${query.trim()}”.` : "No products in this category yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-8 sm:space-y-10">
                {groups.map((group) => (
                  <section key={group.name} aria-labelledby={`category-${group.name}`}>
                    <div className="mb-4 flex items-end justify-between gap-3 px-1">
                      <h2
                        id={`category-${group.name}`}
                        className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl"
                      >
                        {group.name}
                      </h2>
                      <p className="text-sm text-[#8a8478]">
                        {group.items.length} {group.items.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
                      {group.items.map((product) => (
                        <li key={product.id}>
                          <article className="group flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-[#e7e0d4] bg-white p-3 shadow-[0_12px_40px_-24px_rgba(31,61,50,0.45)] dark:border-white/10 dark:bg-[#141414] sm:p-4">
                            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.15rem] bg-[#efe8dc] dark:bg-white/5">
                              {product.imageSrc ? (
                                <CatalogProductImage
                                  src={product.imageSrc}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[#b7b09f]">
                                  <Store className="size-10" />
                                </div>
                              )}
                              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#1f3d32]">
                                {product.categoryName}
                              </span>
                            </div>
                            <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
                              <p className="truncate text-xs text-[#8a8478]">
                                {product.shopName} · {product.region}
                              </p>
                              <h3 className="mt-1 line-clamp-2 font-[family-name:var(--font-display)] text-base font-semibold">
                                {product.name}
                              </h3>
                              <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                                <div>
                                  <p className="text-lg font-semibold tabular-nums">
                                    {formatGhs(Number(product.priceGhs))}
                                  </p>
                                  <p className="text-xs text-[#8a8478]">{product.sellable} in stock</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => startAdd(product)}
                                  className="rounded-full bg-[#1f3d32] px-4 py-2 text-sm font-medium text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          </article>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {step === "cart" ? (
        <section className="rounded-2xl border border-[#d7e0db] bg-white p-4 dark:border-white/10 dark:bg-[#111]">
          <h2 className="text-[16px] font-semibold">Your cart</h2>
          {cart.length === 0 ? (
            <p className="mt-3 text-[14px] text-[#5d7368]">Your cart is empty.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[#edf1ef] dark:divide-white/10">
              {cart.map((line) => (
                <li key={line.lineKey} className="flex items-center gap-2 py-3 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{line.name}</p>
                    {line.choices.length > 0 ? (
                      <p className="truncate text-[12px] text-[#006c49] dark:text-[#6ffbbe]">
                        {preferenceSummary(line.choices)}
                      </p>
                    ) : null}
                    <p className="text-[12px] text-[#5d7368]">
                      {line.shopName} · {line.region}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={`Decrease ${line.name}`} onClick={() => setQty(line.lineKey, line.qty - 1)} className="rounded-lg border p-1">
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-6 text-center text-[13px] tabular-nums">{line.qty}</span>
                    <button
                      type="button"
                      aria-label={`Increase ${line.name}`}
                      onClick={() => setQty(line.lineKey, Math.min(line.qty + 1, line.sellable))}
                      className="rounded-lg border p-1"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <p className="w-[5.5rem] shrink-0 text-right text-[13px] font-semibold tabular-nums">
                    {formatGhs(Number(line.unitPriceGhs) * line.qty)}
                  </p>
                  <button
                    type="button"
                    aria-label={`Remove ${line.name}`}
                    onClick={() => removeLine(line.lineKey)}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#8a8478] hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10 dark:hover:text-red-200"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[16px] font-semibold">Total {formatGhs(total)}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("browse")} className="rounded-xl px-3 py-2 text-[13px] font-semibold">
                Keep shopping
              </button>
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setStep(shopper ? "pay" : "account")}
                className="rounded-xl bg-[#006c49] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
              >
                Checkout
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {step === "account" ? (
        <div className="mx-auto grid max-w-4xl overflow-hidden rounded-[1.8rem] border border-[#e7e0d4] bg-white dark:border-white/10 dark:bg-[#141414] lg:grid-cols-2">
          <div className="flex h-40 items-center justify-center bg-[#efe8dc] px-4 py-3 dark:bg-[#1a2e26] sm:h-52 lg:h-auto lg:min-h-full lg:px-8 lg:py-8">
            <Image
              src="/landing/order-light.png"
              alt="Order preview"
              width={900}
              height={700}
              className="h-auto max-h-32 w-full select-none object-contain sm:max-h-44 lg:max-h-[28rem]"
            />
          </div>
        <form
          onSubmit={submitAccount}
          className="space-y-3 p-5 sm:p-7"
        >
          <h2 className="text-[16px] font-semibold">
            {mode === "create" ? "Create your customer account" : "Sign in to order"}
          </h2>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-[#d7e0db] bg-transparent px-3 py-2.5 text-base outline-none dark:border-white/10 sm:text-sm"
            />
          </label>
          <PasswordField label="Password" value={password} onChange={setPassword} autoComplete={mode === "create" ? "new-password" : "current-password"} />
          {mode === "create" ? (
            <>
              <PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium">Region</span>
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
                <span className="mb-1 block text-[12px] font-medium">Phone number</span>
                <input
                  type="tel"
                  required
                  inputMode="tel"
                  placeholder="024 000 0000"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-xl border border-[#d7e0db] bg-transparent px-3 py-2.5 text-base outline-none dark:border-white/10 sm:text-sm"
                />
              </label>
            </>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#006c49] py-3 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : mode === "create" ? "Create account and continue" : "Sign in and continue"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "create" ? "signin" : "create")}
            className="w-full text-[13px] font-medium text-[#006c49]"
          >
            {mode === "create" ? "I already have a customer account" : "Create a customer account"}
          </button>
        </form>
        </div>
      ) : null}

      {step === "pay" ? (
        <section className="mx-auto max-w-md space-y-3 rounded-2xl border border-[#d7e0db] bg-white p-4 dark:border-white/10 dark:bg-[#111]">
          <h2 className="text-[16px] font-semibold">How will you pay?</h2>
          <p className="text-[13px] text-[#5d7368]">
            Ordering as {shopper?.email}. The shop will reach you on {shopper?.phone} in {shopper?.region}.
          </p>
          {([
            ["delivery", "Pay on delivery", "Pay the shop when your order arrives or you pick it up."],
            ["momo", "Mobile Money", "MTN MoMo, Telecel Cash, or AirtelTigo Money. The shop confirms payment with you."],
          ] as const).map(([id, label, hint]) => (
            <label key={id} className="flex cursor-pointer gap-3 rounded-xl border border-[#d7e0db] p-3 dark:border-white/10">
              <input
                type="radio"
                name="payment"
                checked={payment === id}
                onChange={() => setPayment(id)}
              />
              <span>
                <span className="block text-[14px] font-semibold">{label}</span>
                <span className="block text-[12px] text-[#5d7368]">{hint}</span>
              </span>
            </label>
          ))}
          <p className="text-[15px] font-semibold">Total {formatGhs(total)}</p>
          <button
            type="button"
            disabled={busy || cart.length === 0}
            onClick={placeOrder}
            className="w-full rounded-xl bg-[#006c49] py-3 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Placing order…" : "Place order"}
          </button>
        </section>
      ) : null}

      {step === "done" || step === "messages" ? (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-[#e7e0d4] bg-white p-4 dark:border-white/10 dark:bg-[#141414]">
            <h2 className="text-lg font-semibold">
              {step === "done" ? "Order sent" : "Messages"}
            </h2>
            <p className="mt-1 text-sm text-[#8a8478]">
              Chat with the shop here. They can reply from Ecommerce orders.
            </p>
            <ul className="mt-3 space-y-2">
              {(step === "done" ? orders : inbox).map((order) => {
                const id = "conversationId" in order ? order.conversationId : order.id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setThreadId(id)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                        threadId === id ? "bg-[#efe8dc] dark:bg-white/10" : "bg-[#f7f4ee] dark:bg-white/5"
                      }`}
                    >
                      <span className="block font-semibold">{order.shopName}</span>
                      <span className="text-xs text-[#8a8478]">{order.invoiceId}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => setStep("browse")}
              className="mt-4 rounded-full bg-[#1f3d32] px-4 py-2 text-sm font-semibold text-white"
            >
              Back to the shop
            </button>
          </div>
          <div className="flex h-[min(70dvh,36rem)] flex-col overflow-hidden rounded-2xl border border-[#e7e0d4] bg-white dark:border-white/10 dark:bg-[#141414]">
            {threadId ? (
              <OrderChat messages={threadMessages} mine="customer" onSend={sendToShop} busy={busy} />
            ) : (
              <p className="m-auto px-6 text-center text-sm text-[#8a8478]">
                Choose an order to open the chat.
              </p>
            )}
          </div>
        </section>
      ) : null}

      {step === "browse" && itemCount > 0 && !picking ? (
        <div className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex w-full max-w-lg items-center gap-3 rounded-full bg-[#1f3d32] py-2 pl-2 pr-2 text-white shadow-[0_16px_40px_-16px_rgba(0,0,0,0.55)] dark:bg-[#6ffbbe] dark:text-[#003527]">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-base font-bold tabular-nums dark:bg-black/10">
              {itemCount}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <ShoppingBag className="size-4 shrink-0" />
                {itemCount === 1 ? "1 item" : `${itemCount} items`}
              </span>
              <span className="block text-xs opacity-80">{formatGhs(total)}</span>
            </span>
            <button
              type="button"
              onClick={() => setStep("cart")}
              className="shrink-0 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#1f3d32]"
            >
              Checkout
            </button>
          </div>
        </div>
      ) : null}

      {picking ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-3 sm:items-center">
          <button
            type="button"
            aria-label="Close options"
            className="absolute inset-0"
            onClick={() => setPicking(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="preference-title"
            className="relative flex max-h-[min(85dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white text-[#1c1917] shadow-2xl dark:bg-[#141414] dark:text-zinc-100"
          >
            <div className="border-b border-[#e7e0d4] px-5 py-4 dark:border-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b8f7c]">Choose options</p>
              <h2 id="preference-title" className="mt-1 text-lg font-semibold">
                {picking.name}
              </h2>
              <p className="text-sm text-[#8a8478]">
                {picking.shopName} · {picking.region}
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {pickingGroups.map((group) => (
                <fieldset key={group.label}>
                  <legend className="mb-2 text-sm font-semibold">{group.label}</legend>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((option) => {
                      const selected = picked[group.label] === option.label;
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() =>
                            setPicked((current) => ({ ...current, [group.label]: option.label }))
                          }
                          className={`rounded-full px-3 py-1.5 text-sm ${
                            selected
                              ? "bg-[#1f3d32] text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
                              : "border border-[#e7e0d4] bg-[#f7f4ee] dark:border-white/10 dark:bg-white/5"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="flex gap-2 border-t border-[#e7e0d4] px-5 py-4 dark:border-white/10">
              <button
                type="button"
                onClick={() => setPicking(null)}
                className="rounded-full px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pickingReady}
                onClick={confirmPick}
                className="ml-auto rounded-full bg-[#1f3d32] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-[#6ffbbe] dark:text-[#003527]"
              >
                Add to bag
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
