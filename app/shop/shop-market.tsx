"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Minus, Plus, Search, ShoppingBag, SlidersHorizontal, Store, Trash2, X } from "lucide-react";
import { CatalogProductImage } from "@/app/components/dashboard/products/catalog-product-image";
import { SiteFooter } from "@/app/components/landing/site-footer";
import { MarketNav } from "@/app/components/shop/market-nav";
import { CustomerLiveAlerts } from "@/app/components/shop/customer-live-alerts";
import { OrderChat, type ChatMessage } from "@/app/components/shop/order-chat";
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
  shopType: string;
  region: string;
  sellable: number;
  variations?: ShopVariation[];
};

type CartChoice = PreferenceOption & { group: string };

type Shopper = {
  id: string;
  phone: string;
  region: string;
};

const CART_KEY = "ventra-shop-cart";

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

function countBy(items: Listing[], pick: (item: Listing) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const name = pick(item);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function formatGhs(n: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(n);
}

function FilterSection({
  label,
  value,
  allLabel,
  options,
  open,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  allLabel: string;
  options: { name: string; count: number }[];
  open: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  const selected = value !== "All";
  const choices = [
    { name: "All", count: options.reduce((sum, item) => sum + item.count, 0), label: allLabel },
    ...options.map((item) => ({ ...item, label: item.name })),
  ];
  return (
    <div className={`border-b border-[#efe8dc] last:border-b-0 dark:border-white/10 ${open ? "flex min-h-0 flex-1 flex-col" : "shrink-0"}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full shrink-0 items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a8478]">{label}</span>
          <span className={`mt-0.5 block truncate text-sm ${selected ? "font-semibold text-[#1f3d32] dark:text-[#6ffbbe]" : "text-[#1c1917] dark:text-zinc-100"}`}>
            {selected ? value : allLabel}
          </span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-[#8a8478] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div role="menu" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {choices.map((item) => {
            const active = item.name === "All" ? !selected : value === item.name;
            return (
              <button
                key={item.name}
                type="button"
                role="menuitem"
                onClick={() => onChange(item.name)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm ${
                  active
                    ? "bg-[#efe8dc] font-semibold text-[#1f3d32] dark:bg-white/10 dark:text-[#6ffbbe]"
                    : "text-[#1c1917] hover:bg-[#f7f4ee] dark:text-zinc-100 dark:hover:bg-white/5"
                }`}
              >
                <span className="min-w-0 truncate">{item.label}</span>
                <span className="shrink-0 text-xs tabular-nums text-[#8a8478]">{item.count}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ShopMarket() {
  const [products, setProducts] = useState<Listing[]>([]);
  const [category, setCategory] = useState("All");
  const [shopType, setShopType] = useState("All");
  const [location, setLocation] = useState("All");
  const [openFilter, setOpenFilter] = useState<"category" | "shop" | "location" | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cartReady, setCartReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [picking, setPicking] = useState<Listing | null>(null);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [pickQty, setPickQty] = useState(1);
  const [pickNote, setPickNote] = useState("");
  const [step, setStep] = useState<Step>("browse");
  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [payment, setPayment] = useState<"momo" | "delivery">("delivery");
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [mobileThread, setMobileThread] = useState(false);
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

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed)) setCart(parsed);
      }
    } catch {
      // A bad saved cart should not block shopping.
    }
    setCartReady(true);
  }, []);

  useEffect(() => {
    if (!cartReady) return;
    sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, cartReady]);

  const searched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((item) =>
      [item.name, item.shopName, item.shopType, item.categoryName, item.region].some((value) =>
        (value ?? "").toLowerCase().includes(needle),
      ),
    );
  }, [products, query]);

  const shopTypes = useMemo(() => {
    const source = location === "All" ? searched : searched.filter((item) => item.region === location);
    return countBy(source, (item) => item.shopType || "Other");
  }, [searched, location]);

  const locations = useMemo(() => {
    const source = shopType === "All" ? searched : searched.filter((item) => item.shopType === shopType);
    return countBy(source, (item) => item.region || "Ghana");
  }, [searched, shopType]);

  const narrowed = useMemo(
    () =>
      searched.filter(
        (item) =>
          (shopType === "All" || item.shopType === shopType) &&
          (location === "All" || item.region === location),
      ),
    [searched, shopType, location],
  );

  const visibleCategories = useMemo(
    () => countBy(narrowed, (item) => item.categoryName),
    [narrowed],
  );

  const groups = useMemo(() => {
    const source =
      category === "All" ? narrowed : narrowed.filter((item) => item.categoryName === category);
    const buckets = new Map<string, Listing[]>();
    for (const product of source) {
      const list = buckets.get(product.categoryName) ?? [];
      list.push(product);
      buckets.set(product.categoryName, list);
    }
    return [...buckets.entries()].map(([name, items]) => ({ name, items }));
  }, [narrowed, category]);
  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const total = cart.reduce((sum, line) => sum + Number(line.unitPriceGhs) * line.qty, 0);
  const pickingGroups = picking ? preferenceGroups(picking) : [];
  const pickingReady = pickingGroups.every((group) => picked[group.label]);

  function pickLimit(product: Listing, selection: Record<string, string>) {
    const caps = [product.sellable];
    for (const group of preferenceGroups(product)) {
      const option = group.options.find((item) => item.label === selection[group.label]);
      if (typeof option?.sellable === "number") caps.push(option.sellable);
    }
    return Math.max(1, Math.min(...caps));
  }

  function startAdd(product: Listing) {
    setPicking(product);
    setPicked({});
    setPickQty(1);
    setPickNote("");
    setError("");
  }

  function commitAdd(product: Listing, choices: CartChoice[], quantity: number) {
    const lineKey = `${product.id}|${choices.map((choice) => `${choice.group}:${choice.label}`).join("|")}`;
    const priced = [...choices].reverse().find((choice) => choice.priceGhs);
    const unitPriceGhs = priced?.priceGhs ?? product.priceGhs;
    const caps = [product.sellable, ...choices.flatMap((choice) => (typeof choice.sellable === "number" ? [choice.sellable] : []))];
    const sellable = Math.max(1, Math.min(...caps));
    const nextQty = Math.min(Math.max(1, quantity), sellable);
    setCart((current) => {
      const found = current.find((line) => line.lineKey === lineKey);
      if (found) {
        return current.map((line) =>
          line.lineKey === lineKey ? { ...line, qty: Math.min(line.qty + nextQty, sellable) } : line,
        );
      }
      return [...current, { ...product, qty: nextQty, lineKey, choices, unitPriceGhs, sellable }];
    });
    setError("");
  }

  function confirmPick() {
    if (!picking || !pickingReady) return;
    const choices = pickingGroups.flatMap((group) => {
      const option = group.options.find((item) => item.label === picked[group.label]);
      return option ? [{ ...option, group: group.label }] : [];
    });
    const note = pickNote.trim().slice(0, 180);
    if (note) choices.push({ group: "Note", label: note });
    commitAdd(picking, choices, pickQty);
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
      setMobileThread(true);
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

  return (
    <div className={`mx-auto flex w-full max-w-[90rem] flex-col px-3 pb-32 text-[#1c1917] sm:px-6 lg:min-h-0 lg:flex-1 lg:px-8 dark:text-zinc-100 ${step === "browse" ? "lg:overflow-hidden lg:pb-0" : "lg:overflow-y-auto lg:pb-8"}`}>
      <MarketNav current="shop" signedIn={Boolean(shopper)} />
      {shopper ? <CustomerLiveAlerts /> : null}

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {step === "browse" ? (
        <div className="flex items-start gap-8 lg:min-h-0 lg:flex-1 lg:items-stretch lg:overflow-hidden">
          {filtersOpen ? (
            <button
              type="button"
              aria-label="Close filters"
              className="fixed inset-0 z-[75] bg-black/40 lg:hidden"
              onClick={() => setFiltersOpen(false)}
            />
          ) : null}
          <aside
            className={`${
              filtersOpen ? "fixed inset-y-0 left-0 z-[80] flex w-[min(20rem,88vw)] shadow-2xl" : "hidden"
            } flex-col overflow-hidden rounded-r-[1.75rem] border border-[#e7e0d4] bg-white dark:border-white/10 dark:bg-[#141414] lg:static lg:z-auto lg:flex lg:h-[calc(100dvh-9rem)] lg:max-h-[calc(100dvh-9rem)] lg:w-72 lg:shrink-0 lg:rounded-[1.75rem] lg:shadow-none`}
          >
            <div className="flex items-center justify-between gap-3 bg-[#1f3d32] px-4 py-4 text-[#f4f1ea]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#cde7d8]">Filters</p>
                <p className="mt-1 text-sm">{narrowed.length} products</p>
              </div>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setFiltersOpen(false)}
                className="flex size-9 items-center justify-center rounded-full bg-white/10 lg:hidden"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <FilterSection
                label="Category"
                value={category}
                allLabel="All categories"
                options={visibleCategories}
                open={openFilter === "category"}
                onToggle={() => setOpenFilter((current) => (current === "category" ? null : "category"))}
                onChange={setCategory}
              />
              <FilterSection
                label="Shop type"
                value={shopType}
                allLabel="All shop types"
                options={shopTypes}
                open={openFilter === "shop"}
                onToggle={() => setOpenFilter((current) => (current === "shop" ? null : "shop"))}
                onChange={setShopType}
              />
              <FilterSection
                label="Location"
                value={location}
                allLabel="All locations"
                options={locations}
                open={openFilter === "location"}
                onToggle={() => setOpenFilter((current) => (current === "location" ? null : "location"))}
                onChange={setLocation}
              />
            </div>
            <div className="flex gap-2 border-t border-[#efe8dc] p-3 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setCategory("All");
                  setShopType("All");
                  setLocation("All");
                  setOpenFilter(null);
                }}
                className="h-11 flex-1 rounded-full border border-[#e7e0d4] text-sm font-medium dark:border-white/10"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="h-11 flex-1 rounded-full bg-[#1f3d32] text-sm font-semibold text-white lg:hidden"
              >
                Show products
              </button>
            </div>
          </aside>

          <div className="min-w-0 flex-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pb-28">
            <div className="mb-5 flex gap-2 lg:sticky lg:top-0 lg:z-10 lg:bg-[#f4f1ea] lg:pb-3 lg:pt-1 dark:lg:bg-[#0c0c0c]">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8a8478]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search items, shops, types, or locations"
                  aria-label="Search items"
                  className="w-full rounded-2xl border border-[#e7e0d4] bg-white py-3 pl-11 pr-4 text-base outline-none placeholder:text-[#a39d90] focus:border-[#1f3d32] dark:border-white/10 dark:bg-[#141414] dark:focus:border-[#6ffbbe] sm:text-sm"
                />
              </label>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#e7e0d4] bg-white text-[#1f3d32] dark:border-white/10 dark:bg-[#141414] dark:text-[#6ffbbe] lg:hidden"
                aria-label="Open filters"
              >
                <SlidersHorizontal className="size-5" />
                {[category, shopType, location].filter((value) => value !== "All").length > 0 ? (
                  <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#1f3d32] text-[10px] font-semibold text-white dark:bg-[#6ffbbe] dark:text-[#003527]">
                    {[category, shopType, location].filter((value) => value !== "All").length}
                  </span>
                ) : null}
              </button>
            </div>

            {loading ? (
              <p className="py-16 text-center text-sm text-[#8a8478]">Loading the market…</p>
            ) : groups.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-[#e7e0d4] px-6 py-20 text-center dark:border-white/10">
                <Store className="mx-auto mb-3 size-8 opacity-40" />
                <p className="font-medium">
                  {query.trim() || shopType !== "All" || location !== "All"
                    ? "No items match these filters."
                    : "No products in this category yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-8 sm:space-y-10">
                {groups.map((group) => (
                  <section key={group.name} aria-labelledby={`category-${group.name}`}>
                    <div className="mb-3 flex items-end justify-between gap-3 px-0.5 sm:mb-4">
                      <h2
                        id={`category-${group.name}`}
                        className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight sm:text-2xl"
                      >
                        {group.name}
                      </h2>
                      <p className="shrink-0 text-xs text-[#8a8478] sm:text-sm">
                        {group.items.length} {group.items.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
                      {group.items.map((product) => (
                        <li key={product.id}>
                          <article
                            role="button"
                            tabIndex={0}
                            aria-label={`Add ${product.name} to cart`}
                            onClick={() => startAdd(product)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                startAdd(product);
                              }
                            }}
                            className="flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border border-[#e7e0d4] bg-white text-left active:scale-[0.98] dark:border-white/10 dark:bg-[#141414] sm:rounded-2xl sm:shadow-[0_10px_28px_-18px_rgba(31,61,50,0.55)]"
                          >
                            <div className="relative aspect-square overflow-hidden bg-[#f7f4ee] dark:bg-[#1a1a1a]">
                              {product.imageSrc ? (
                                <CatalogProductImage
                                  src={product.imageSrc}
                                  alt=""
                                  className="pointer-events-none absolute inset-0 h-full w-full object-contain p-2"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[#b7b09f]">
                                  <Store className="size-6 sm:size-8" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-1 flex-col px-2 pb-2 pt-1.5 sm:p-3">
                              <h3 className="line-clamp-2 text-[12px] font-normal leading-snug text-[#1c1917] dark:text-zinc-100 sm:min-h-[2.4em] sm:text-sm sm:font-medium">
                                {product.name}
                              </h3>
                              <p className="mt-0.5 hidden truncate text-[11px] text-[#8a8478] sm:block">
                                {product.shopName} · {product.region}
                              </p>
                              <p className="mt-1 text-[13px] font-bold leading-none tracking-tight text-[#006c49] tabular-nums dark:text-[#6ffbbe] sm:mt-2 sm:text-base">
                                {formatGhs(Number(product.priceGhs))}
                              </p>
                              <p className="mt-0.5 hidden text-[11px] text-[#8a8478] sm:block">{product.sellable} in stock</p>
                              <span className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-lg bg-[#1f3d32] text-[12px] font-semibold text-white dark:bg-[#6ffbbe] dark:text-[#003527]">
                                Add to cart
                              </span>
                            </div>
                          </article>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
            <div className="hidden lg:block">
              <SiteFooter />
            </div>
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
        <section className="mx-auto max-w-md space-y-4 rounded-2xl border border-[#e7e0d4] bg-white p-5 dark:border-white/10 dark:bg-[#141414]">
          <h2 className="text-lg font-semibold">Sign in as a customer</h2>
          <p className="text-sm text-[#5c574e] dark:text-zinc-300">
            Customer accounts use a phone number, region, and password. Sign in from the main login page, then come back to check out. Your bag stays here.
          </p>
          <Link
            href="/login?as=customer&next=/shop"
            className="block rounded-xl bg-[#006c49] py-3 text-center text-sm font-semibold text-white"
          >
            Sign in
          </Link>
          <Link
            href="/login?as=customer&create=1&next=/shop"
            className="block text-center text-sm font-semibold text-[#006c49]"
          >
            Create a customer account
          </Link>
          <button type="button" onClick={() => setStep("cart")} className="w-full text-sm font-medium">
            Back to cart
          </button>
        </section>
      ) : null}

      {step === "pay" ? (
        <section className="mx-auto max-w-md space-y-3 rounded-2xl border border-[#d7e0db] bg-white p-4 dark:border-white/10 dark:bg-[#111]">
          <h2 className="text-[16px] font-semibold">How will you pay?</h2>
          <p className="text-[13px] text-[#5d7368]">
            Ordering as {shopper?.phone} in {shopper?.region}.
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
          <div className={`${mobileThread ? "hidden lg:block" : ""} rounded-2xl border border-[#e7e0d4] bg-white p-4 dark:border-white/10 dark:bg-[#141414]`}>
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
                      onClick={() => {
                        setThreadId(id);
                        setMobileThread(true);
                      }}
                      className={`w-full rounded-xl px-3 py-3 text-left text-sm ${
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
          <div className={`${mobileThread ? "flex" : "hidden lg:flex"} h-[min(70dvh,36rem)] flex-col overflow-hidden rounded-2xl border border-[#e7e0d4] bg-white dark:border-white/10 dark:bg-[#141414]`}>
            <button
              type="button"
              onClick={() => setMobileThread(false)}
              className="border-b border-[#efe8dc] px-4 py-3 text-left text-sm font-semibold text-[#006c49] lg:hidden dark:border-white/10"
            >
              Back
            </button>
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
              {pickingGroups.length === 0 ? (
                <p className="text-sm text-[#8a8478]">
                  Choose how many you want, and add a size or any other detail below.
                </p>
              ) : null}
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
                          onClick={() => {
                            const next = { ...picked, [group.label]: option.label };
                            setPicked(next);
                            setPickQty((current) => Math.min(current, pickLimit(picking, next)));
                          }}
                          className={`rounded-full px-3 py-1.5 text-sm ${
                            selected
                              ? "bg-[#1f3d32] text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
                              : "border border-[#e7e0d4] bg-[#f7f4ee] dark:border-white/10 dark:bg-white/5"
                          }`}
                        >
                          {option.label}
                          {option.priceGhs ? ` · ${formatGhs(Number(option.priceGhs))}` : ""}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  {pickingGroups.some((group) => group.label === "Size") ? "Other details" : "Size or other details"}
                </span>
                <textarea
                  value={pickNote}
                  onChange={(event) => setPickNote(event.target.value.slice(0, 180))}
                  rows={2}
                  placeholder="Size, color, flavour, or anything else you want"
                  className="w-full resize-none rounded-2xl border border-[#e7e0d4] bg-[#f7f4ee] px-3 py-2.5 text-base outline-none placeholder:text-[#a39d90] focus:border-[#1f3d32] dark:border-white/10 dark:bg-white/5 dark:focus:border-[#6ffbbe]"
                />
              </label>
            </div>
            <div className="flex items-center gap-2 border-t border-[#e7e0d4] px-5 py-4 dark:border-white/10">
              <div className="flex items-center rounded-full border border-[#e7e0d4] dark:border-white/10">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={pickQty <= 1}
                  onClick={() => setPickQty((current) => Math.max(1, current - 1))}
                  className="flex size-10 items-center justify-center disabled:opacity-30"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{pickQty}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={pickQty >= pickLimit(picking, picked)}
                  onClick={() => setPickQty((current) => Math.min(pickLimit(picking, picked), current + 1))}
                  className="flex size-10 items-center justify-center disabled:opacity-30"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPicking(null)}
                className="rounded-full px-3 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pickingReady}
                onClick={confirmPick}
                className="ml-auto rounded-full bg-[#1f3d32] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-[#6ffbbe] dark:text-[#003527]"
              >
                Add to cart
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {step !== "browse" ? (
        <div className="hidden lg:block">
          <SiteFooter />
        </div>
      ) : null}
    </div>
  );
}
