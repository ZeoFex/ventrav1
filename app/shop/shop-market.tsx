"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Minus, Plus, Search, ShoppingBag, SlidersHorizontal, Store, Trash2, X } from "lucide-react";
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
  shopId: string;
  shopType: string;
  region: string;
  place: string;
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
const PAGE_SIZE = 24;

type ShopOption = { id: string; name: string; place: string; count: number };

function MenuOption({
  active,
  label,
  hint,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  hint?: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left ${
        active
          ? "bg-[#1f3d32] text-white"
          : "text-[#1c1917] hover:bg-[#f4f1ea] dark:text-zinc-100 dark:hover:bg-white/5"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{label}</span>
        {hint ? (
          <span className={`block truncate text-[11px] ${active ? "text-white/70" : "text-[#8a8478]"}`}>{hint}</span>
        ) : null}
      </span>
      <span className={`shrink-0 text-[12px] tabular-nums ${active ? "text-white/80" : "text-[#8a8478]"}`}>
        {count.toLocaleString()}
      </span>
    </button>
  );
}

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

export function ShopMarket() {
  const [products, setProducts] = useState<Listing[]>([]);
  const [category, setCategory] = useState("All");
  const [shopType, setShopType] = useState("All");
  const [shopId, setShopId] = useState("All");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menu, setMenu] = useState<"type" | "shop" | "category" | null>(null);
  const [menuQuery, setMenuQuery] = useState("");
  const [query, setQuery] = useState("");
  const filterRef = useRef<HTMLElement>(null);
  const [cartReady, setCartReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [picking, setPicking] = useState<Listing | null>(null);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [pickQty, setPickQty] = useState(1);
  const [pickNote, setPickNote] = useState("");
  const [addedFlash, setAddedFlash] = useState<string | null>(null);
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
    if (!menu) return;
    function onPointer(event: PointerEvent) {
      if (!filterRef.current?.contains(event.target as Node)) setMenu(null);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [menu]);

  useEffect(() => {
    if (!addedFlash) return;
    const timer = window.setTimeout(() => setAddedFlash(null), 900);
    return () => window.clearTimeout(timer);
  }, [addedFlash]);

  useEffect(() => {
    const page = document.querySelector("main")?.parentElement;
    if (!(page instanceof HTMLElement)) return;
    const paint = () => {
      page.style.backgroundColor = document.documentElement.classList.contains("dark") ? "#0c0c0c" : "#ffffff";
    };
    paint();
    const observer = new MutationObserver(paint);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      page.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const lock = () => {
      if (!desktop.matches) {
        document.documentElement.style.overflow = "";
        return;
      }
      window.scrollTo(0, 0);
      document.documentElement.style.overflow = "hidden";
    };
    lock();
    desktop.addEventListener("change", lock);
    return () => {
      desktop.removeEventListener("change", lock);
      document.documentElement.style.overflow = "";
    };
  }, []);

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
      [item.name, item.shopName, item.shopType, item.categoryName, item.region, item.place].some((value) =>
        (value ?? "").toLowerCase().includes(needle),
      ),
    );
  }, [products, query]);

  const shopTypes = useMemo(
    () => countBy(searched, (item) => item.shopType || "Other"),
    [searched],
  );

  const shops = useMemo(() => {
    const source = shopType === "All" ? searched : searched.filter((item) => item.shopType === shopType);
    const buckets = new Map<string, ShopOption>();
    for (const item of source) {
      const current = buckets.get(item.shopId);
      if (current) current.count += 1;
      else buckets.set(item.shopId, { id: item.shopId, name: item.shopName, place: item.place || item.region, count: 1 });
    }
    return [...buckets.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [searched, shopType]);

  const narrowed = useMemo(
    () =>
      searched.filter(
        (item) =>
          (shopType === "All" || item.shopType === shopType) &&
          (shopId === "All" || item.shopId === shopId),
      ),
    [searched, shopType, shopId],
  );

  const visibleCategories = useMemo(
    () => countBy(narrowed, (item) => item.categoryName),
    [narrowed],
  );

  const listed = useMemo(
    () => (category === "All" ? narrowed : narrowed.filter((item) => item.categoryName === category)),
    [narrowed, category],
  );
  const pageCount = Math.max(1, Math.ceil(listed.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = listed.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeFilters = [shopType, shopId, category].filter((value) => value !== "All").length;
  const selectedShop = shops.find((shop) => shop.id === shopId);
  const menuNeedle = menuQuery.trim().toLowerCase();
  const shopChoices = shops.filter(
    (shop) =>
      !menuNeedle ||
      shop.name.toLowerCase().includes(menuNeedle) ||
      shop.place.toLowerCase().includes(menuNeedle),
  );
  const categoryChoices = visibleCategories.filter(
    (item) => !menuNeedle || item.name.toLowerCase().includes(menuNeedle),
  );
  const typeChoices = shopTypes.filter((item) => !menuNeedle || item.name.toLowerCase().includes(menuNeedle));

  function toggleMenu(next: "type" | "shop" | "category") {
    setMenu((current) => (current === next ? null : next));
    setMenuQuery("");
  }
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

  function simpleCartLine(productId: string) {
    return cart.find((line) => line.id === productId && line.choices.length === 0) ?? null;
  }

  function productCartQty(productId: string) {
    return cart.filter((line) => line.id === productId).reduce((sum, line) => sum + line.qty, 0);
  }

  function startAdd(product: Listing) {
    if (preferenceGroups(product).length === 0) {
      const existing = simpleCartLine(product.id);
      if (existing) return;
      commitAdd(product, [], 1);
      setAddedFlash(product.id);
      setError("");
      return;
    }
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
    const addedId = picking.id;
    commitAdd(picking, choices, pickQty);
    setAddedFlash(addedId);
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
    <div className={`shop-paper mx-auto flex w-full max-w-[90rem] flex-col px-3 text-[#1c1917] sm:px-6 lg:min-h-0 lg:flex-1 lg:px-8 dark:bg-transparent dark:text-zinc-100 ${picking ? "pb-[min(56dvh,32rem)]" : "pb-32"} ${step === "browse" ? "lg:overflow-hidden lg:pb-0" : "lg:overflow-y-auto lg:pb-8"}`}>
      <MarketNav current="shop" signedIn={Boolean(shopper)} />
      {shopper ? <CustomerLiveAlerts /> : null}

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {step === "browse" ? (
        <div className="flex items-start gap-5 lg:min-h-0 lg:flex-1 lg:items-stretch lg:gap-6 lg:overflow-hidden">
          {filtersOpen ? (
            <button
              type="button"
              aria-label="Close filters"
              className="fixed inset-0 z-[75] bg-black/40 lg:hidden"
              onClick={() => setFiltersOpen(false)}
            />
          ) : null}
          <aside
            ref={filterRef}
            className={`${
              filtersOpen ? "fixed inset-y-0 left-0 z-[80] flex w-[min(20rem,88vw)] shadow-2xl" : "hidden"
            } shop-paper flex-col overflow-hidden rounded-r-[1.5rem] border border-[#e7e0d4] dark:border-white/10 dark:bg-[#141414] lg:sticky lg:top-4 lg:z-auto lg:flex lg:max-h-[calc(100dvh-6.75rem)] lg:w-[18.5rem] lg:shrink-0 lg:self-start lg:overflow-hidden lg:rounded-[1.5rem] lg:shadow-none`}
          >
            <div className="flex items-center justify-between gap-3 bg-[#1f3d32] px-4 py-4 text-[#f4f1ea]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#cde7d8]">Refine</p>
                <p className="mt-1 text-lg font-semibold">{listed.length.toLocaleString()} products</p>
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
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 py-3">
              <label className="relative block shrink-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8478]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products, SKU..."
                  aria-label="Search items"
                  className="w-full rounded-xl border border-[#e7e0d4] bg-white py-2.5 pl-9 pr-3 text-base outline-none placeholder:text-[#a39d90] focus:border-[#1f3d32] dark:border-white/10 dark:bg-[#1c1c1c] sm:text-sm"
                />
              </label>
              <div className="overflow-hidden rounded-2xl border border-[#e7e0d4] bg-white dark:border-white/10 dark:bg-[#1c1c1c]">
                {(
                  [
                    { id: "type" as const, label: "Shop type", value: shopType === "All" ? "All types" : shopType },
                    {
                      id: "shop" as const,
                      label: "Shop",
                      value: selectedShop ? `${selectedShop.name} · ${selectedShop.place}` : "All shops",
                    },
                    { id: "category" as const, label: "Category", value: category === "All" ? "All categories" : category },
                  ]
                ).map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-expanded={menu === item.id}
                    onClick={() => toggleMenu(item.id)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left ${
                      index > 0 ? "border-t border-[#efe8dc] dark:border-white/10" : ""
                    } ${menu === item.id ? "bg-[#eef6f1] dark:bg-white/5" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a8478]">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-medium">{item.value}</span>
                    </span>
                    <ChevronDown className={`size-4 shrink-0 text-[#8a8478] transition ${menu === item.id ? "rotate-180" : ""}`} />
                  </button>
                ))}
              </div>
              {menu ? (
                <div className="flex min-h-0 flex-col rounded-2xl border border-[#e7e0d4] bg-white p-2 dark:border-white/10 dark:bg-[#1c1c1c]">
                  {menu !== "type" || shopTypes.length > 6 ? (
                    <label className="relative mb-2 block shrink-0">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8478]" />
                      <input
                        value={menuQuery}
                        onChange={(event) => setMenuQuery(event.target.value)}
                        placeholder={menu === "shop" ? "Find a shop" : menu === "category" ? "Find a category" : "Find a type"}
                        aria-label={menu === "shop" ? "Find a shop" : menu === "category" ? "Find a category" : "Find a type"}
                        className="w-full rounded-xl border border-[#e7e0d4] bg-white py-2 pl-8 pr-3 text-base outline-none focus:border-[#1f3d32] dark:border-white/10 dark:bg-[#141414] sm:text-sm"
                      />
                    </label>
                  ) : null}
                  <div className="max-h-64 space-y-0.5 overflow-y-auto overscroll-contain">
                    {menu === "type" ? (
                      <>
                        <MenuOption
                          active={shopType === "All"}
                          label="All types"
                          count={shopTypes.reduce((sum, item) => sum + item.count, 0)}
                          onClick={() => {
                            setShopType("All");
                            setShopId("All");
                            setCategory("All");
                            setPage(1);
                            setMenu(null);
                          }}
                        />
                        {typeChoices.map((item) => (
                          <MenuOption
                            key={item.name}
                            active={shopType === item.name}
                            label={item.name}
                            count={item.count}
                            onClick={() => {
                              setShopType(item.name);
                              setShopId("All");
                              setCategory("All");
                              setPage(1);
                              setMenu(null);
                            }}
                          />
                        ))}
                      </>
                    ) : null}
                    {menu === "shop" ? (
                      <>
                        <MenuOption
                          active={shopId === "All"}
                          label="All shops"
                          count={shops.reduce((sum, shop) => sum + shop.count, 0)}
                          onClick={() => {
                            setShopId("All");
                            setCategory("All");
                            setPage(1);
                            setMenu(null);
                          }}
                        />
                        {shopChoices.map((shop) => (
                          <MenuOption
                            key={shop.id}
                            active={shopId === shop.id}
                            label={shop.name}
                            hint={shop.place}
                            count={shop.count}
                            onClick={() => {
                              setShopId(shop.id);
                              setCategory("All");
                              setPage(1);
                              setMenu(null);
                            }}
                          />
                        ))}
                      </>
                    ) : null}
                    {menu === "category" ? (
                      <>
                        <MenuOption
                          active={category === "All"}
                          label="All categories"
                          count={visibleCategories.length}
                          onClick={() => {
                            setCategory("All");
                            setPage(1);
                            setMenu(null);
                          }}
                        />
                        {categoryChoices.map((item) => (
                          <MenuOption
                            key={item.name}
                            active={category === item.name}
                            label={item.name}
                            count={item.count}
                            onClick={() => {
                              setCategory(item.name);
                              setPage(1);
                              setMenu(null);
                            }}
                          />
                        ))}
                      </>
                    ) : null}
                    {menuQuery.trim() &&
                    ((menu === "type" && typeChoices.length === 0) ||
                      (menu === "shop" && shopChoices.length === 0) ||
                      (menu === "category" && categoryChoices.length === 0)) ? (
                      <p className="px-2 py-3 text-sm text-[#8a8478]">Nothing matches that.</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex gap-2 border-t border-[#efe8dc] p-3 lg:hidden dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setCategory("All");
                  setShopType("All");
                  setShopId("All");
                  setQuery("");
                  setPage(1);
                }}
                className="h-11 flex-1 rounded-full border border-[#e7e0d4] text-sm font-medium dark:border-white/10"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="h-11 flex-1 rounded-full bg-[#1f3d32] text-sm font-semibold text-white"
              >
                Show products
              </button>
            </div>
          </aside>

          <div className="min-w-0 flex-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pb-28">
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="relative inline-flex h-10 items-center gap-2 rounded-full border border-[#e7e0d4] bg-white px-3 text-sm font-medium text-[#1f3d32] dark:border-white/10 dark:bg-[#141414] dark:text-[#6ffbbe] lg:hidden"
                aria-label="Open filters"
              >
                <SlidersHorizontal className="size-4" />
                Refine
                {activeFilters > 0 ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#1f3d32] text-[10px] font-semibold text-white dark:bg-[#6ffbbe] dark:text-[#003527]">
                    {activeFilters}
                  </span>
                ) : null}
              </button>
              <p className="text-sm text-[#8a8478]">
                Page {currentPage} of {pageCount}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="rounded-full border border-[#e7e0d4] bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-white/10 dark:bg-[#141414]"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage((value) => value + 1)}
                  className="rounded-full border border-[#e7e0d4] bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-white/10 dark:bg-[#141414]"
                >
                  Next
                </button>
              </div>
            </div>

            {loading ? (
              <p className="py-16 text-center text-sm text-[#8a8478]">Loading the market…</p>
            ) : pageItems.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-[#e7e0d4] px-6 py-20 text-center dark:border-white/10">
                <Store className="mx-auto mb-3 size-8 opacity-40" />
                <p className="font-medium">
                  {query.trim() || activeFilters > 0 ? "No items match these filters." : "No products in the shop yet."}
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
                {pageItems.map((product) => {
                  const needsOptions = preferenceGroups(product).length > 0;
                  const simpleLine = simpleCartLine(product.id);
                  const inBagQty = productCartQty(product.id);
                  const isPicking = picking?.id === product.id;
                  const justAdded = addedFlash === product.id;
                  return (
                  <li key={product.id}>
                    <article
                      role="button"
                      tabIndex={0}
                      aria-label={
                        needsOptions
                          ? `Choose options for ${product.name}`
                          : simpleLine
                            ? `${product.name}, ${simpleLine.qty} in cart`
                            : `Add ${product.name} to cart`
                      }
                      onClick={() => startAdd(product)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          startAdd(product);
                        }
                      }}
                      className={`shop-paper flex h-full cursor-pointer flex-col rounded-3xl border p-2.5 text-left active:scale-[0.98] dark:bg-[#141414] sm:p-3 ${
                        isPicking
                          ? "border-[#1f3d32] ring-2 ring-[#1f3d32]/25 dark:border-[#6ffbbe] dark:ring-[#6ffbbe]/30"
                          : justAdded
                            ? "border-[#006c49] dark:border-[#6ffbbe]"
                            : "border-[#e7e0d4] dark:border-white/10"
                      }`}
                    >
                      <div className="shop-paper relative aspect-[4/3] overflow-hidden rounded-[0.875rem] dark:bg-[#1a1a1a]">
                        {product.imageSrc ? (
                          <CatalogProductImage
                            src={product.imageSrc}
                            alt=""
                            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[#b7b09f]">
                            <Store className="size-6 sm:size-8" />
                          </div>
                        )}
                        {inBagQty > 0 ? (
                          <span className="absolute right-2 top-2 rounded-full bg-[#1f3d32] px-2 py-0.5 text-[11px] font-bold text-white tabular-nums dark:bg-[#6ffbbe] dark:text-[#003527]">
                            {inBagQty}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 truncate text-[11px] text-[#8a8478]">
                        {product.shopName} · {product.place || product.region}
                      </p>
                      <h3 className="mt-0.5 line-clamp-2 min-h-[2.4em] text-[13px] font-medium leading-snug sm:text-sm">
                        {product.name}
                      </h3>
                      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                        <div className="min-w-0">
                          <p className="text-[15px] font-bold leading-none tracking-tight text-[#006c49] tabular-nums dark:text-[#6ffbbe] sm:text-base">
                            {formatGhs(Number(product.priceGhs))}
                          </p>
                          <p className="mt-1 text-[11px] text-[#8a8478]">{product.sellable} in stock</p>
                        </div>
                        {!needsOptions && simpleLine ? (
                          <div
                            className="flex shrink-0 items-center rounded-full border border-[#e7e0d4] bg-white dark:border-white/10 dark:bg-[#1a1a1a]"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              aria-label={`Decrease ${product.name}`}
                              onClick={() => setQty(simpleLine.lineKey, simpleLine.qty - 1)}
                              className="flex size-8 items-center justify-center"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="w-5 text-center text-[12px] font-semibold tabular-nums">{simpleLine.qty}</span>
                            <button
                              type="button"
                              aria-label={`Increase ${product.name}`}
                              disabled={simpleLine.qty >= simpleLine.sellable}
                              onClick={() => setQty(simpleLine.lineKey, Math.min(simpleLine.qty + 1, simpleLine.sellable))}
                              className="flex size-8 items-center justify-center disabled:opacity-30"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                              justAdded
                                ? "bg-[#006c49] text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
                                : isPicking
                                  ? "bg-[#1f3d32] text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
                                  : "bg-[#1f3d32] text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
                            }`}
                          >
                            {justAdded ? <Check className="size-3.5" /> : null}
                            {justAdded ? "Added" : isPicking ? "Choosing" : "Add"}
                          </span>
                        )}
                      </div>
                    </article>
                  </li>
                  );
                })}
              </ul>
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

      {step === "browse" && itemCount > 0 ? (
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
              onClick={() => {
                setPicking(null);
                setStep("cart");
              }}
              className="shrink-0 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#1f3d32]"
            >
              Checkout
            </button>
          </div>
        </div>
      ) : null}

      {picking ? (
        <div
          className={`fixed inset-x-0 z-[80] flex justify-center lg:inset-0 lg:items-center lg:bg-black/45 lg:p-3 ${
            itemCount > 0
              ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-0"
              : "bottom-[max(0.5rem,env(safe-area-inset-bottom))] lg:bottom-0"
          }`}
        >
          <button
            type="button"
            aria-label="Close options"
            className="absolute inset-0 hidden lg:block"
            onClick={() => setPicking(null)}
          />
          <div
            role="dialog"
            aria-modal="false"
            aria-labelledby="preference-title"
            className="relative flex max-h-[min(48dvh,26rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-[#e7e0d4] bg-white text-[#1c1917] shadow-[0_-18px_40px_-18px_rgba(0,0,0,0.45)] dark:border-white/10 dark:bg-[#141414] dark:text-zinc-100 sm:rounded-[1.75rem] lg:max-h-[min(85dvh,40rem)] lg:rounded-3xl lg:shadow-2xl"
          >
            <div className="flex justify-center pt-2 lg:hidden">
              <span className="h-1 w-10 rounded-full bg-[#d9d2c5] dark:bg-white/20" />
            </div>
            <div className="flex items-start gap-3 border-b border-[#e7e0d4] px-4 py-3 dark:border-white/10 sm:px-5 sm:py-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b8f7c]">
                  Choose options · keep shopping above
                </p>
                <h2 id="preference-title" className="mt-1 truncate text-base font-semibold sm:text-lg">
                  {picking.name}
                </h2>
                <p className="truncate text-sm text-[#8a8478]">
                  {picking.shopName} · {picking.region}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close options"
                onClick={() => setPicking(null)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f4f1ea] dark:bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
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
            <div className="flex items-center gap-2 border-t border-[#e7e0d4] px-4 py-3 sm:px-5 sm:py-4 dark:border-white/10">
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
                disabled={!pickingReady}
                onClick={confirmPick}
                className="ml-auto rounded-full bg-[#1f3d32] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-[#6ffbbe] dark:text-[#003527]"
              >
                Add · keep shopping
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
