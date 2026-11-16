import type { CatalogShop } from "./catalog-admin-types";

export function authHeaders(token: string) {
    return { Authorization: `Bearer ${token}` };
}

/** Parse JSON from a fetch response; empty/invalid bodies become a clear error. */
export async function readResponseJson<T = Record<string, unknown>>(
    res: Response,
): Promise<T> {
    const text = await res.text();
    if (!text.trim()) {
        throw new Error(
            res.ok
                ? "Empty response from server"
                : `HTTP ${res.status}`,
        );
    }
    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error(
            res.ok
                ? "Invalid response from server"
                : `HTTP ${res.status}`,
        );
    }
}

export function formatWhen(iso: string | null | undefined) {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        });
    } catch {
        return iso;
    }
}

export function formatDate(iso: string | null | undefined) {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
    } catch {
        return iso;
    }
}

export function subscriptionDaysLeft(periodEnd: string | null | undefined): number | null {
    if (!periodEnd) return null;
    const end = new Date(periodEnd).getTime();
    const now = Date.now();
    return Math.ceil((end - now) / (24 * 60 * 60 * 1000));
}

export function subscriptionUrgency(
    shop: Pick<CatalogShop, "subscriptionStatus" | "currentPeriodEnd">
): "ok" | "warning" | "danger" | "inactive" {
    if (shop.subscriptionStatus === "canceled") return "inactive";
    if (shop.subscriptionStatus === "past_due") return "danger";
    const days = subscriptionDaysLeft(shop.currentPeriodEnd);
    if (days === null) return "warning";
    if (days <= 0) return "danger";
    if (days <= 7) return "warning";
    return "ok";
}

export const PLAN_LABELS: Record<CatalogShop["plan"], string> = {
    starter: "Starter",
    growth: "Growth",
    pro: "Pro",
};

export async function platformPatch<T = { success: boolean }>(
    token: string,
    path: string,
    body: Record<string, unknown>
): Promise<T> {
    const res = await fetch(path, {
        method: "PATCH",
        headers: {
            ...authHeaders(token),
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data as T;
}

/** Hard-delete a tenant (CASCADE). Requires exact shop slug confirmation. */
export async function platformDeleteShop(
    token: string,
    businessId: string,
    confirmSlug: string
): Promise<void> {
    const res = await fetch(`/api/platform/businesses/${businessId}`, {
        method: "DELETE",
        headers: {
            ...authHeaders(token),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmSlug: confirmSlug.trim() }),
    });
    if (res.status === 204) return;
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
}

/** Delete multiple shops sequentially; returns ids that succeeded. */
export async function platformDeleteShops(
    token: string,
    shops: { id: string; slug: string }[]
): Promise<{ deleted: string[]; failed: { id: string; name?: string; error: string }[] }> {
    const deleted: string[] = [];
    const failed: { id: string; name?: string; error: string }[] = [];
    for (const shop of shops) {
        try {
            await platformDeleteShop(token, shop.id, shop.slug);
            deleted.push(shop.id);
        } catch (err) {
            failed.push({
                id: shop.id,
                error: err instanceof Error ? err.message : "Delete failed",
            });
        }
    }
    return { deleted, failed };
}

const ADMIN_TOKEN_KEY = "ventra.platformAdmin.token";

export function readAdminToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
        return sessionStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
        return null;
    }
}

export function writeAdminToken(token: string | null) {
    if (typeof window === "undefined") return;
    try {
        if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
        else sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {
        /* ignore quota / private mode */
    }
}

export function formatGhs(n: string | number | null | undefined): string {
    const value = Number(n ?? NaN);
    if (!Number.isFinite(value)) return "GHS —";
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
    }).format(value);
}
