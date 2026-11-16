"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Loader2,
    Mail,
    Phone,
    Receipt,
    Package,
    Save,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatalogShop } from "./catalog-admin-types";
import { authHeaders, platformPatch } from "./catalog-admin-utils";

type Props = {
    token: string;
    shop: CatalogShop;
    onUpdated: (patch: Partial<CatalogShop>) => void;
    onProductsCleared?: () => void;
};

export function CatalogShopAccountPanel({
    token,
    shop,
    onUpdated,
    onProductsCleared,
}: Props) {
    const [email, setEmail] = useState(shop.contactEmail ?? "");
    const [phone, setPhone] = useState(shop.phone ?? "");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [salesCount, setSalesCount] = useState<number | null>(null);
    const [productsCount, setProductsCount] = useState<number | null>(null);
    const [countsLoading, setCountsLoading] = useState(true);

    const [wipeSalesOpen, setWipeSalesOpen] = useState(false);
    const [wipeProductsOpen, setWipeProductsOpen] = useState(false);
    const [confirmSlug, setConfirmSlug] = useState("");
    const [confirmPhrase, setConfirmPhrase] = useState("");
    const [wipeSalesRestock, setWipeSalesRestock] = useState(true);
    const [wiping, setWiping] = useState(false);

    useEffect(() => {
        setEmail(shop.contactEmail ?? "");
        setPhone(shop.phone ?? "");
    }, [shop.id, shop.contactEmail, shop.phone]);

    const loadCounts = useCallback(async () => {
        setCountsLoading(true);
        try {
            const [salesRes, productsRes] = await Promise.all([
                fetch(`/api/platform/businesses/${shop.id}/sales`, {
                    headers: authHeaders(token),
                }),
                fetch(`/api/platform/businesses/${shop.id}/products`, {
                    headers: authHeaders(token),
                }),
            ]);
            const salesData = await salesRes.json();
            const productsData = await productsRes.json();
            if (salesRes.ok) setSalesCount(Number(salesData.salesCount ?? 0));
            if (productsRes.ok) setProductsCount(Number(productsData.productsCount ?? 0));
        } catch {
            /* keep previous counts */
        } finally {
            setCountsLoading(false);
        }
    }, [shop.id, token]);

    useEffect(() => {
        void loadCounts();
    }, [loadCounts]);

    const saveContact = async () => {
        setBusy(true);
        setError(null);
        setSuccess(null);
        try {
            const nextEmail = email.trim();
            const nextPhone = phone.trim();
            await platformPatch(token, `/api/platform/businesses/${shop.id}`, {
                contactEmail: nextEmail,
                phone: nextPhone,
            });
            const emails = [...shop.registeredEmails];
            if (nextEmail && !emails.includes(nextEmail)) {
                emails.unshift(nextEmail);
            }
            onUpdated({
                contactEmail: nextEmail || null,
                phone: nextPhone || null,
                registeredEmails: emails,
            });
            setSuccess("Shop contact details updated");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Update failed");
        } finally {
            setBusy(false);
        }
    };

    const wipeSales = async () => {
        if (confirmSlug.trim() !== shop.slug || confirmPhrase.trim() !== "DELETE SALES") {
            return;
        }
        setWiping(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`/api/platform/businesses/${shop.id}/sales`, {
                method: "DELETE",
                headers: {
                    ...authHeaders(token),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    confirmSlug: confirmSlug.trim(),
                    confirmPhrase: "DELETE SALES",
                    restock: wipeSalesRestock,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            const deleted = Number(data.deletedSales ?? 0);
            const restored = Number(data.restockedUnits ?? 0);
            setSuccess(
                wipeSalesRestock
                    ? `Deleted ${deleted} sale(s) and restored ${restored} unit(s) to stock`
                    : `Deleted ${deleted} sale(s) without restocking`,
            );
            setSalesCount(0);
            setWipeSalesOpen(false);
            setConfirmSlug("");
            setConfirmPhrase("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete sales");
        } finally {
            setWiping(false);
        }
    };

    const wipeProducts = async () => {
        if (
            confirmSlug.trim() !== shop.slug ||
            confirmPhrase.trim() !== "DELETE PRODUCTS"
        ) {
            return;
        }
        setWiping(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`/api/platform/businesses/${shop.id}/products`, {
                method: "DELETE",
                headers: {
                    ...authHeaders(token),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    confirmSlug: confirmSlug.trim(),
                    confirmPhrase: "DELETE PRODUCTS",
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            setSuccess(`Deleted ${data.deletedProducts ?? 0} product(s)`);
            setProductsCount(0);
            onUpdated({ productCount: 0 });
            onProductsCleared?.();
            setWipeProductsOpen(false);
            setConfirmSlug("");
            setConfirmPhrase("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete products");
        } finally {
            setWiping(false);
        }
    };

    const contactDirty =
        email.trim() !== (shop.contactEmail ?? "") ||
        phone.trim() !== (shop.phone ?? "");

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Shop contact
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                    Email &amp; phone
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Fix typos in the shop&apos;s public contact details without deleting the account.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm">
                        <span className="font-medium text-foreground">Contact email</span>
                        <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="shop@example.com"
                                className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                    </label>
                    <label className="grid gap-1.5 text-sm">
                        <span className="font-medium text-foreground">Phone</span>
                        <div className="relative">
                            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+233…"
                                className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                    </label>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        disabled={busy || !contactDirty}
                        onClick={() => void saveContact()}
                    >
                        {busy ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-1.5 h-4 w-4" />
                        )}
                        Save contact
                    </Button>
                    {contactDirty ? (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={() => {
                                setEmail(shop.contactEmail ?? "");
                                setPhone(shop.phone ?? "");
                            }}
                        >
                            Reset
                        </Button>
                    ) : null}
                </div>
            </div>

            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-destructive">
                    Data cleanup
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                    Delete shop data
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Permanently remove transactions or products for this shop. This cannot be undone.
                    The shop account itself stays active.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Receipt className="h-4 w-4" />
                            Transactions
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {countsLoading
                                ? "Counting…"
                                : `${salesCount ?? 0} sale${salesCount === 1 ? "" : "s"}`}
                        </p>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="mt-3"
                            disabled={wiping || (salesCount ?? 0) === 0}
                            onClick={() => {
                                setWipeSalesOpen(true);
                                setWipeProductsOpen(false);
                                setConfirmSlug("");
                                setConfirmPhrase("");
                                setWipeSalesRestock(true);
                            }}
                        >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Delete all sales
                        </Button>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Package className="h-4 w-4" />
                            Products
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {countsLoading
                                ? "Counting…"
                                : `${productsCount ?? 0} product${productsCount === 1 ? "" : "s"}`}
                        </p>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="mt-3"
                            disabled={wiping || (productsCount ?? 0) === 0}
                            onClick={() => {
                                setWipeProductsOpen(true);
                                setWipeSalesOpen(false);
                                setConfirmSlug("");
                                setConfirmPhrase("");
                            }}
                        >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Delete all products
                        </Button>
                    </div>
                </div>

                {wipeSalesOpen ? (
                    <div className="mt-4 space-y-3 rounded-lg border border-destructive/40 bg-background p-4">
                        <p className="text-sm font-medium text-foreground">
                            Confirm delete all sales for <span className="font-mono">{shop.slug}</span>
                        </p>
                        <label className="grid gap-1 text-sm">
                            <span className="text-muted-foreground">
                                Type the shop slug: <span className="font-mono text-foreground">{shop.slug}</span>
                            </span>
                            <input
                                value={confirmSlug}
                                onChange={(e) => setConfirmSlug(e.target.value)}
                                className="rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </label>
                        <label className="grid gap-1 text-sm">
                            <span className="text-muted-foreground">
                                Type <span className="font-mono text-foreground">DELETE SALES</span>
                            </span>
                            <input
                                value={confirmPhrase}
                                onChange={(e) => setConfirmPhrase(e.target.value)}
                                className="rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </label>
                        <fieldset className="space-y-2 rounded-lg border border-border bg-card p-3">
                            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Stock handling
                            </legend>
                            <label className="flex cursor-pointer items-start gap-2 text-sm">
                                <input
                                    type="radio"
                                    name="wipe-sales-restock"
                                    checked={wipeSalesRestock}
                                    onChange={() => setWipeSalesRestock(true)}
                                    className="mt-1"
                                />
                                <span>
                                    <span className="font-medium text-foreground">
                                        Return goods to stock
                                    </span>
                                    <span className="mt-0.5 block text-xs text-muted-foreground">
                                        Restore remaining sold units to product stock, then delete.
                                    </span>
                                </span>
                            </label>
                            <label className="flex cursor-pointer items-start gap-2 text-sm">
                                <input
                                    type="radio"
                                    name="wipe-sales-restock"
                                    checked={!wipeSalesRestock}
                                    onChange={() => setWipeSalesRestock(false)}
                                    className="mt-1"
                                />
                                <span>
                                    <span className="font-medium text-foreground">Free deletion</span>
                                    <span className="mt-0.5 block text-xs text-muted-foreground">
                                        Remove sales only. Leave stock quantities unchanged.
                                    </span>
                                </span>
                            </label>
                        </fieldset>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={
                                    wiping ||
                                    confirmSlug.trim() !== shop.slug ||
                                    confirmPhrase.trim() !== "DELETE SALES"
                                }
                                onClick={() => void wipeSales()}
                            >
                                {wiping ? (
                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                ) : null}
                                {wipeSalesRestock
                                    ? "Permanently delete sales & restore stock"
                                    : "Permanently delete sales (no restock)"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={wiping}
                                onClick={() => setWipeSalesOpen(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : null}

                {wipeProductsOpen ? (
                    <div className="mt-4 space-y-3 rounded-lg border border-destructive/40 bg-background p-4">
                        <p className="text-sm font-medium text-foreground">
                            Confirm delete all products for{" "}
                            <span className="font-mono">{shop.slug}</span>
                        </p>
                        <label className="grid gap-1 text-sm">
                            <span className="text-muted-foreground">
                                Type the shop slug: <span className="font-mono text-foreground">{shop.slug}</span>
                            </span>
                            <input
                                value={confirmSlug}
                                onChange={(e) => setConfirmSlug(e.target.value)}
                                className="rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </label>
                        <label className="grid gap-1 text-sm">
                            <span className="text-muted-foreground">
                                Type <span className="font-mono text-foreground">DELETE PRODUCTS</span>
                            </span>
                            <input
                                value={confirmPhrase}
                                onChange={(e) => setConfirmPhrase(e.target.value)}
                                className="rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={
                                    wiping ||
                                    confirmSlug.trim() !== shop.slug ||
                                    confirmPhrase.trim() !== "DELETE PRODUCTS"
                                }
                                onClick={() => void wipeProducts()}
                            >
                                {wiping ? (
                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                ) : null}
                                Permanently delete products
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={wiping}
                                onClick={() => setWipeProductsOpen(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : null}
            </div>

            {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </p>
            ) : null}
            {success ? (
                <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                    {success}
                </p>
            ) : null}
        </div>
    );
}
