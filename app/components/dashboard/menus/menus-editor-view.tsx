"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useBranchContext } from "@/app/components/dashboard/branch-context";
import { useSession } from "@/app/components/auth/use-session";
import { useProducts } from "@/app/components/dashboard/products/products-data-hooks";
import { isRestaurantBusinessType } from "@/lib/restaurant-business";
import type { ProductRow } from "@/app/components/dashboard/products/types";

type MenuDetail = {
  menu: { id: string; name: string; isActive: boolean };
  sections: Array<{
    section: { id: string; name: string; sortOrder: number };
    items: Array<{
      item: {
        id: string;
        productId: string;
        sortOrder: number;
        displayLabelOverride: string | null;
      };
      productName: string;
      priceGhs: string;
    }>;
  }>;
};

type ModifierBundle = {
  group: {
    id: string;
    name: string;
    minSelect: number;
    maxSelect: number;
    anchorProductId: string;
  };
  options: Array<{
    opt: { id: string; productId: string; priceAdjustmentGhs: string | null };
    productName: string;
    priceGhs: string;
    stock: number;
  }>;
};

export function MenusEditorView({ menuId }: { menuId: string }) {
  const { branchId } = useBranchContext();
  const { user } = useSession();
  const { products = [] } = useProducts();
  const allowed = isRestaurantBusinessType(user?.businessType);

  const [detail, setDetail] = useState<MenuDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newSectionName, setNewSectionName] = useState("");
  const [pickSectionId, setPickSectionId] = useState<string | null>(null);
  const [pickQuery, setPickQuery] = useState("");
  const [modifierAnchorId, setModifierAnchorId] = useState("");
  const [modifierGroups, setModifierGroups] = useState<ModifierBundle[]>([]);
  const [modLoading, setModLoading] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newOptProductId, setNewOptProductId] = useState("");
  const [newOptGroupId, setNewOptGroupId] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/restaurant/menus/${menuId}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Failed to load menu");
    }
    setDetail(data as MenuDetail);
  }, [menuId]);

  useEffect(() => {
    if (!allowed || branchId === "all") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed, branchId, load]);

  const productById = useMemo(() => {
    const m = new Map<string, ProductRow>();
    (products as ProductRow[]).forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const filteredPickProducts = useMemo(() => {
    const q = pickQuery.trim().toLowerCase();
    let list = products as ProductRow[];
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)),
      );
    }
    return list.slice(0, 40);
  }, [products, pickQuery]);

  async function addSection() {
    const name = newSectionName.trim();
    if (!name) return;
    try {
      const res = await fetch(`/api/restaurant/menus/${menuId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed");
      setNewSectionName("");
      toast.success("Section added");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function removeSection(sectionId: string) {
    if (!confirm("Delete this section and its items?")) return;
    try {
      const res = await fetch(`/api/restaurant/menus/${menuId}/sections/${sectionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Failed");
      }
      toast.success("Section removed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function addItem(sectionId: string, productId: string) {
    try {
      const res = await fetch(
        `/api/restaurant/menus/${menuId}/sections/${sectionId}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed");
      setPickSectionId(null);
      setPickQuery("");
      toast.success("Added to menu");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function removeItem(sectionId: string, itemId: string) {
    try {
      const res = await fetch(
        `/api/restaurant/menus/${menuId}/sections/${sectionId}/items/${itemId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Failed");
      }
      toast.success("Removed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function reorderSections(orderedSectionIds: string[]) {
    const res = await fetch(`/api/restaurant/menus/${menuId}/sections/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedSectionIds }),
    });
    if (!res.ok) toast.error("Reorder failed");
    else await load();
  }

  async function reorderItems(sectionId: string, orderedItemIds: string[]) {
    const res = await fetch(
      `/api/restaurant/menus/${menuId}/sections/${sectionId}/items/reorder`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedItemIds }),
      },
    );
    if (!res.ok) toast.error("Reorder failed");
    else await load();
  }

  function moveSection(idx: number, dir: -1 | 1) {
    if (!detail) return;
    const ids = detail.sections.map((s) => s.section.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    const t = next[idx]!;
    next[idx] = next[j]!;
    next[j] = t;
    void reorderSections(next);
  }

  function moveItem(sectionId: string, itemIds: string[], idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= itemIds.length) return;
    const next = [...itemIds];
    const t = next[idx]!;
    next[idx] = next[j]!;
    next[j] = t;
    void reorderItems(sectionId, next);
  }

  async function loadModifiers() {
    const anchor = modifierAnchorId.trim();
    if (!anchor) {
      setModifierGroups([]);
      return;
    }
    setModLoading(true);
    try {
      const res = await fetch(
        `/api/restaurant/modifier-groups?anchorProductId=${encodeURIComponent(anchor)}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      setModifierGroups(Array.isArray(data.groups) ? data.groups : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      setModifierGroups([]);
    } finally {
      setModLoading(false);
    }
  }

  async function createModifierGroup() {
    const anchor = modifierAnchorId.trim();
    const name = newGroupName.trim();
    if (!anchor || !name) {
      toast.error("Anchor product ID and group name required");
      return;
    }
    try {
      const res = await fetch("/api/restaurant/modifier-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchorProductId: anchor,
          name,
          minSelect: 0,
          maxSelect: 3,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      setNewGroupName("");
      toast.success("Modifier group created");
      await loadModifiers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function deleteModifierGroup(groupId: string) {
    if (!confirm("Delete this modifier group and its options?")) return;
    try {
      const res = await fetch(`/api/restaurant/modifier-groups/${groupId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Deleted");
      await loadModifiers();
    } catch {
      toast.error("Delete failed");
    }
  }

  async function addModifierOption() {
    const gid = newOptGroupId.trim();
    const pid = newOptProductId.trim();
    if (!gid || !pid) {
      toast.error("Select group and enter option product ID");
      return;
    }
    try {
      const res = await fetch("/api/restaurant/modifier-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: gid, productId: pid }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      setNewOptProductId("");
      toast.success("Option added");
      await loadModifiers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function deleteModifierOption(optionId: string) {
    try {
      const res = await fetch(`/api/restaurant/modifier-options/${optionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      await loadModifiers();
    } catch {
      toast.error("Delete failed");
    }
  }

  if (!allowed || branchId === "all") {
    return (
      <div className="px-4 py-16 text-center text-muted-foreground">
        {!allowed ? "Restaurant businesses only." : "Select a branch."}
      </div>
    );
  }

  if (loading || !detail) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground opacity-40" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/dashboard/menus"
        className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to menus
      </Link>

      <h1 className="mb-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
        {detail.menu.name}
      </h1>
      <p className="mb-8 text-[13px] text-muted-foreground">
        {detail.menu.isActive ? (
          <span className="font-medium text-[#006c49] dark:text-[#6ffbbe]">
            Active on POS for this branch
          </span>
        ) : (
          "Inactive — set active from Overview."
        )}
      </p>

      <div className="mb-10 rounded-2xl border border-[#e5e7eb] bg-white p-4 dark:border-white/[0.1] dark:bg-[#141414]">
        <p className="mb-3 text-[13px] font-medium">Add section</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            placeholder="Dishes, Drinks, Sides…"
            className="min-h-11 flex-1 rounded-xl border border-[#e5e7eb] px-4 text-[14px] outline-none dark:border-white/[0.12] dark:bg-[#0c0c0e]"
          />
          <button
            type="button"
            onClick={() => void addSection()}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#006c49] px-5 text-[14px] font-semibold text-white dark:bg-[#0a8558]"
          >
            <Plus className="mr-2 size-4" />
            Add section
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {detail.sections.map((block, si) => (
          <div
            key={block.section.id}
            className="rounded-2xl border border-[#e5e7eb] bg-white p-4 dark:border-white/[0.1] dark:bg-[#141414]"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{block.section.name}</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border px-2 py-1 text-muted-foreground hover:bg-muted"
                  onClick={() => moveSection(si, -1)}
                  aria-label="Move section up"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg border px-2 py-1 text-muted-foreground hover:bg-muted"
                  onClick={() => moveSection(si, 1)}
                  aria-label="Move section down"
                >
                  <ChevronDown className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPickSectionId(block.section.id)}
                  className="rounded-xl bg-[#006c49]/12 px-3 py-2 text-[13px] font-semibold text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]"
                >
                  Add item
                </button>
                <button
                  type="button"
                  onClick={() => void removeSection(block.section.id)}
                  className="rounded-xl border border-red-200 px-3 py-2 text-[13px] text-red-700 dark:border-red-900/50 dark:text-red-400"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>

            <ul className="space-y-2">
              {block.items.length === 0 ? (
                <li className="py-6 text-center text-[13px] text-muted-foreground">
                  No items — link catalog products.
                </li>
              ) : (
                block.items.map((row, ii) => (
                  <li
                    key={row.item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#f0f0f0] px-3 py-2 dark:border-white/[0.08]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.productName}</p>
                      <p className="text-[12px] text-muted-foreground">
                        ₵{row.priceGhs} · Product ID {row.item.productId.slice(0, 8)}…
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="rounded-lg border px-2 py-1 text-muted-foreground"
                        onClick={() =>
                          moveItem(
                            block.section.id,
                            block.items.map((x) => x.item.id),
                            ii,
                            -1,
                          )
                        }
                      >
                        <ChevronUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border px-2 py-1 text-muted-foreground"
                        onClick={() =>
                          moveItem(
                            block.section.id,
                            block.items.map((x) => x.item.id),
                            ii,
                            1,
                          )
                        }
                      >
                        <ChevronDown className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void removeItem(block.section.id, row.item.id)
                        }
                        className="rounded-lg border px-2 py-1 text-red-700 dark:text-red-400"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>

      {pickSectionId ? (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => setPickSectionId(null)}
          />
          <div className="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#111]">
            <div className="border-b border-[#eee] px-5 py-4 dark:border-white/[0.08]">
              <h3 className="font-semibold">Pick catalog product</h3>
              <input
                value={pickQuery}
                onChange={(e) => setPickQuery(e.target.value)}
                placeholder="Search name or SKU…"
                className="mt-3 w-full rounded-xl border border-[#e5e7eb] px-4 py-2 text-[14px] outline-none dark:border-white/[0.12] dark:bg-[#0c0c0e]"
              />
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {filteredPickProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickSectionId && void addItem(pickSectionId, p.id)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-muted"
                >
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="shrink-0 text-[13px] text-muted-foreground">
                    ₵{p.priceGhs}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-14 rounded-2xl border border-dashed border-[#006c49]/35 bg-[#006c49]/05 p-5 dark:border-[#6ffbbe]/25 dark:bg-[#6ffbbe]/05">
        <h3 className="mb-2 font-semibold">Modifiers (POS)</h3>
        <p className="mb-4 text-[13px] text-muted-foreground">
          Tie optional add-ons to a dish by catalog product ID. Staff will be prompted on POS before adding to cart.
        </p>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={modifierAnchorId}
            onChange={(e) => setModifierAnchorId(e.target.value)}
            className="min-h-11 flex-1 rounded-xl border border-[#e5e7eb] px-3 text-[14px] dark:border-white/[0.12] dark:bg-[#0c0c0e]"
          >
            <option value="">Select anchor dish…</option>
            {(products as ProductRow[]).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadModifiers()}
            disabled={modLoading || !modifierAnchorId}
            className="rounded-xl bg-[#006c49] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50 dark:bg-[#0a8558]"
          >
            {modLoading ? "Loading…" : "Load"}
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group name (e.g. Choose a side)"
            className="min-h-11 flex-1 rounded-xl border border-[#e5e7eb] px-4 text-[14px] dark:border-white/[0.12] dark:bg-[#0c0c0e]"
          />
          <button
            type="button"
            onClick={() => void createModifierGroup()}
            disabled={!modifierAnchorId}
            className="rounded-xl border border-[#006c49]/40 px-4 py-2 text-[13px] font-semibold text-[#006c49] disabled:opacity-50 dark:border-[#6ffbbe]/40 dark:text-[#6ffbbe]"
          >
            Add group
          </button>
        </div>

        {modifierGroups.map((b) => (
          <div
            key={b.group.id}
            className="mb-4 rounded-xl border border-[#e5e7eb] bg-white p-3 dark:border-white/[0.1] dark:bg-[#141414]"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{b.group.name}</p>
              <button
                type="button"
                onClick={() => void deleteModifierGroup(b.group.id)}
                className="text-[12px] text-red-700 dark:text-red-400"
              >
                Delete group
              </button>
            </div>
            <p className="mb-2 text-[11px] text-muted-foreground">Group id: {b.group.id}</p>
            <ul className="space-y-1 text-[13px]">
              {b.options.map((o) => (
                <li
                  key={o.opt.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-2 py-1.5"
                >
                  <span>
                    {o.productName}{" "}
                    <span className="text-muted-foreground">
                      (₵{o.priceGhs})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void deleteModifierOption(o.opt.id)}
                    className="text-[12px] text-red-600"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {modifierGroups.length > 0 ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={newOptGroupId}
              onChange={(e) => setNewOptGroupId(e.target.value)}
              className="min-h-11 flex-1 rounded-xl border border-[#e5e7eb] px-3 text-[13px] dark:border-white/[0.12] dark:bg-[#0c0c0e]"
            >
              <option value="">Modifier group…</option>
              {modifierGroups.map((b) => (
                <option key={b.group.id} value={b.group.id}>
                  {b.group.name}
                </option>
              ))}
            </select>
            <select
              value={newOptProductId}
              onChange={(e) => setNewOptProductId(e.target.value)}
              className="min-h-11 flex-1 rounded-xl border border-[#e5e7eb] px-3 text-[13px] dark:border-white/[0.12] dark:bg-[#0c0c0e]"
            >
              <option value="">Add-on product…</option>
              {(products as ProductRow[]).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void addModifierOption()}
              className="rounded-xl bg-[#006c49] px-4 py-2 text-[13px] font-semibold text-white dark:bg-[#0a8558]"
            >
              Add option
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
