"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { useBranchContext } from "@/app/components/dashboard/branch-context";
import { useSession } from "@/app/components/auth/use-session";
import { isRestaurantBusinessType } from "@/lib/restaurant-business";

type MenuRow = {
  id: string;
  name: string;
  isActive: boolean;
  branchId: string;
};

export function MenusOverviewView() {
  const { branchId } = useBranchContext();
  const { user } = useSession();
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const allowed = isRestaurantBusinessType(user?.businessType);

  const load = useCallback(async () => {
    if (!allowed || branchId === "all") return;
    const res = await fetch("/api/restaurant/menus");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 403) {
        setMenus([]);
        return;
      }
      throw new Error(typeof data.error === "string" ? data.error : "Failed to load menus");
    }
    setMenus(Array.isArray(data.menus) ? data.menus : []);
  }, [allowed, branchId]);

  useEffect(() => {
    if (!allowed || branchId === "all") {
      setLoading(false);
      setMenus([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Failed to load menus");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed, branchId, load]);

  async function createMenu() {
    const name = newName.trim();
    if (!name) {
      toast.error("Enter a menu name");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/restaurant/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not create menu");
      }
      setNewName("");
      toast.success("Menu created");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function activate(id: string) {
    try {
      const res = await fetch(`/api/restaurant/menus/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not activate");
      }
      toast.success("Active menu updated for this branch");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function deactivate(id: string) {
    try {
      const res = await fetch(`/api/restaurant/menus/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Could not deactivate");
      }
      toast.success("Menu deactivated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this menu and all its sections?")) return;
    try {
      const res = await fetch(`/api/restaurant/menus/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Could not delete");
      }
      toast.success("Menu deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center">
        <p className="max-w-md text-[15px] text-muted-foreground">
          Menus are available when your business type is restaurant.
        </p>
      </div>
    );
  }

  if (branchId === "all") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center">
        <p className="max-w-md text-[15px] text-muted-foreground">
          Select a branch to manage menus for that location.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground opacity-40" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-start gap-3">
        <UtensilsCrossed className="mt-1 size-8 shrink-0 text-[#006c49] dark:text-[#6ffbbe]" />
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            Menus
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Build sections (dishes, drinks, sides) from your catalog. Set one menu as active for POS.
          </p>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-[#e5e7eb] bg-white p-4 dark:border-white/[0.1] dark:bg-[#141414]">
        <p className="mb-3 text-[13px] font-medium text-muted-foreground">New menu</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Lunch menu"
            className="min-h-11 flex-1 rounded-xl border border-[#e5e7eb] bg-white px-4 text-[14px] outline-none ring-[#006c49]/25 focus:border-[#006c49]/40 focus:ring-2 dark:border-white/[0.12] dark:bg-[#0c0c0e]"
          />
          <button
            type="button"
            disabled={creating}
            onClick={() => void createMenu()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#006c49] px-5 text-[14px] font-semibold text-white hover:brightness-105 disabled:opacity-50 dark:bg-[#0a8558]"
          >
            <Plus className="size-4" />
            Create
          </button>
        </div>
      </div>

      <ul className="space-y-3">
        {menus.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-[#bfc9c3]/40 py-14 text-center text-[14px] text-muted-foreground dark:border-white/[0.12]">
            No menus yet — create one above.
          </li>
        ) : (
          menus.map((m) => (
            <li
              key={m.id}
              className="flex flex-col gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-4 dark:border-white/[0.1] dark:bg-[#141414] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{m.name}</p>
                <p className="text-[12px] text-muted-foreground">
                  {m.isActive ? (
                    <span className="font-medium text-[#006c49] dark:text-[#6ffbbe]">
                      Active for POS
                    </span>
                  ) : (
                    "Inactive"
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!m.isActive ? (
                  <button
                    type="button"
                    onClick={() => void activate(m.id)}
                    className="rounded-xl border border-[#006c49]/35 bg-[#006c49]/08 px-3 py-2 text-[13px] font-semibold text-[#006c49] hover:bg-[#006c49]/12 dark:border-[#6ffbbe]/35 dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
                  >
                    Set active
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void deactivate(m.id)}
                    className="rounded-xl border border-[#e5e7eb] px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-muted dark:border-white/[0.12]"
                  >
                    Deactivate
                  </button>
                )}
                <Link
                  href={`/dashboard/menus/${m.id}`}
                  className="rounded-xl bg-[#006c49] px-3 py-2 text-center text-[13px] font-semibold text-white hover:brightness-105 dark:bg-[#0a8558]"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => void remove(m.id)}
                  className="rounded-xl border border-red-200 px-3 py-2 text-[13px] font-medium text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
