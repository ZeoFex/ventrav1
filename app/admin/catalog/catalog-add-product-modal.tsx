"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
    Barcode,
    Camera,
    ImagePlus,
    Loader2,
    Plus,
    Search,
    X,
} from "lucide-react";
import { PosBarcodeCamera } from "@/app/components/dashboard/pos/sale/pos-barcode-camera";
import { CatalogProductThumb } from "./catalog-product-display";
import { decodeBarcodeFromImageFile } from "./decode-barcode-image";
import type { CatalogShop, MasterProduct } from "./catalog-admin-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Suggestion = MasterProduct & { _source: "master" | "registry" };

type LookupPayload = {
    found: boolean;
    barcode: string;
    source: "master" | "web" | "none";
    name: string | null;
    description: string | null;
    brand: string | null;
    category: string | null;
    imageUrl: string | null;
    unit: string | null;
    sources: string[];
    masterProduct?: MasterProduct;
};

function authHeaders(token: string) {
    return { Authorization: `Bearer ${token}` };
}

export function CatalogAddProductModal({
    open,
    onClose,
    shop,
    token,
    onSaved,
}: {
    open: boolean;
    onClose: () => void;
    shop: CatalogShop;
    token: string;
    onSaved: () => void;
}) {
    const titleId = useId();
    const [scanOpen, setScanOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [lookingUp, setLookingUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nameQuery, setNameQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [lookupInfo, setLookupInfo] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [barcode, setBarcode] = useState("");
    const [sku, setSku] = useState("");
    const [description, setDescription] = useState("");
    const [imageSrc, setImageSrc] = useState("");
    const [categoryName, setCategoryName] = useState("");
    const [priceGhs, setPriceGhs] = useState("");
    const [costPriceGhs, setCostPriceGhs] = useState("");
    const [stock, setStock] = useState("0");
    const [unit, setUnit] = useState("piece");

    const resetForm = useCallback(() => {
        setName("");
        setBarcode("");
        setSku("");
        setDescription("");
        setImageSrc("");
        setCategoryName("");
        setPriceGhs("");
        setCostPriceGhs("");
        setStock("0");
        setUnit("piece");
        setNameQuery("");
        setSuggestions([]);
        setError(null);
        setLookupInfo(null);
    }, []);

    useEffect(() => {
        if (!open) {
            resetForm();
            setScanOpen(false);
        }
    }, [open, resetForm]);

    const applyLookup = (data: LookupPayload) => {
        setBarcode(data.barcode);
        if (data.name) {
            setName(data.name);
            setNameQuery(data.name);
        }
        if (data.description) setDescription(data.description);
        if (data.imageUrl) setImageSrc(data.imageUrl);
        if (data.category) setCategoryName(data.category);
        if (data.unit) setUnit(data.unit.slice(0, 20));
        if (data.masterProduct?.sku) setSku(data.masterProduct.sku);

        if (data.found) {
            const via = data.sources.length ? data.sources.join(", ") : data.source;
            setLookupInfo(
                data.imageUrl && data.name
                    ? `Loaded “${data.name}” with image via ${via}. Enter shop price below.`
                    : data.name
                      ? `Loaded “${data.name}” via ${via}. Add image URL manually if needed.`
                      : `Partial data from ${via}. Enter product name and image if missing.`
            );
            setError(null);
        } else {
            setLookupInfo(null);
            setError(
                "Barcode not found online — enter product name manually. Image will not be auto-filled."
            );
        }
    };

    const applySuggestion = (item: Suggestion) => {
        applyLookup({
            found: true,
            barcode: item.barcode ?? barcode,
            source: "master",
            name: item.name,
            description: item.description,
            brand: null,
            category: item.categoryName,
            imageUrl: item.imageSrc,
            unit: item.unit,
            sources: ["Master catalog"],
            masterProduct: item,
        });
        if (item.sku) setSku(item.sku);
        setShowSuggestions(false);
    };

    const lookupBarcode = useCallback(
        async (code: string) => {
            const trimmed = code.trim();
            if (!trimmed) return;
            setLookingUp(true);
            setError(null);
            setLookupInfo(null);
            try {
                const res = await fetch(
                    `/api/platform/master-catalog/lookup/barcode?barcode=${encodeURIComponent(trimmed)}`,
                    { headers: authHeaders(token) }
                );
                const data = (await res.json()) as LookupPayload & { error?: string };
                if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
                applyLookup(data);
            } catch {
                setError("Lookup failed. You can still enter product details manually.");
            } finally {
                setLookingUp(false);
            }
        },
        [token]
    );

    const handleScan = useCallback(
        (code: string) => {
            setScanOpen(false);
            void lookupBarcode(code);
        },
        [lookupBarcode]
    );

    const onImagePick = async (file: File | null) => {
        if (!file) return;
        setLookingUp(true);
        setError(null);
        try {
            const code = await decodeBarcodeFromImageFile(file);
            if (code) {
                await lookupBarcode(code);
            } else {
                setError("No barcode detected in that image. Try another photo or enter manually.");
            }
        } catch {
            setError("Could not read barcode from image.");
        } finally {
            setLookingUp(false);
        }
    };

    useEffect(() => {
        if (!open || nameQuery.trim().length < 2) {
            setSuggestions([]);
            return;
        }
        const t = setTimeout(async () => {
            try {
                const res = await fetch(
                    `/api/platform/master-catalog/products/search?q=${encodeURIComponent(nameQuery.trim())}&limit=8`,
                    { headers: authHeaders(token) }
                );
                const data = await res.json();
                setSuggestions(
                    ((data.items as MasterProduct[]) ?? []).map((p) => ({
                        ...p,
                        _source: "master" as const,
                    }))
                );
            } catch {
                setSuggestions([]);
            }
        }, 300);
        return () => clearTimeout(t);
    }, [nameQuery, open, token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Product name is required — scan again or type manually");
            return;
        }
        const priceNum = parseFloat(priceGhs.replace(",", "."));
        if (!Number.isFinite(priceNum) || priceNum <= 0) {
            setError("Shop price (GHS) is required. Master catalog does not store price.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/platform/master-catalog/shops/${shop.id}/products`,
                {
                    method: "POST",
                    headers: {
                        ...authHeaders(token),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        barcode: barcode.trim() || null,
                        sku: sku.trim() || null,
                        description: description.trim() || null,
                        imageSrc: imageSrc.trim() || null,
                        categoryName: categoryName.trim() || null,
                        priceGhs: String(priceNum),
                        costPriceGhs: costPriceGhs.trim() || null,
                        stock: Number(stock) || 0,
                        unit: unit.trim() || "piece",
                    }),
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            onSaved();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save product");
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <>
            <div
                className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />
            <div
                role="dialog"
                aria-labelledby={titleId}
                className="fixed inset-x-4 top-[5dvh] z-[95] mx-auto flex max-h-[90dvh] max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto"
            >
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div>
                        <h2 id={titleId} className="text-lg font-semibold text-foreground">
                            Add product
                        </h2>
                        <p className="text-sm text-muted-foreground">{shop.name}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setScanOpen(true)}
                            >
                                <Camera className="mr-1.5 h-4 w-4" />
                                Scan barcode
                            </Button>
                            <label className="inline-flex cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) =>
                                        void onImagePick(e.target.files?.[0] ?? null)
                                    }
                                />
                                <span className="inline-flex h-7 items-center gap-1.5 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted">
                                    <ImagePlus className="h-4 w-4" />
                                    Scan from photo
                                </span>
                            </label>
                        </div>

                        {lookingUp ? (
                            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin shrink-0" />
                                Searching master catalog and web product APIs…
                            </div>
                        ) : null}

                        {(imageSrc || name) && !lookingUp ? (
                            <div className="flex items-start gap-4 rounded-xl border border-border bg-muted/30 p-4">
                                <CatalogProductThumb
                                    product={{ name: name || "Product", imageSrc }}
                                    size="lg"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-foreground">
                                        {name || "Unnamed product"}
                                    </p>
                                    {barcode ? (
                                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                            {barcode}
                                        </p>
                                    ) : null}
                                    {lookupInfo ? (
                                        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                                            {lookupInfo}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}

                        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                            <label className="grid gap-1 text-sm">
                                <span className="font-medium">Barcode</span>
                                <input
                                    value={barcode}
                                    onChange={(e) => setBarcode(e.target.value)}
                                    placeholder="Scan or type barcode"
                                    className="rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
                                />
                            </label>
                            <Button
                                type="button"
                                variant="secondary"
                                className="self-end"
                                disabled={lookingUp || !barcode.trim()}
                                onClick={() => void lookupBarcode(barcode)}
                            >
                                {lookingUp ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Search className="mr-1 h-4 w-4" />
                                        Lookup
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="relative">
                            <label className="grid gap-1 text-sm">
                                <span className="font-medium">Product name *</span>
                                <input
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        setNameQuery(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    required
                                    placeholder="Type to search master catalog…"
                                    className="rounded-lg border border-input bg-background px-3 py-2"
                                />
                            </label>
                            {showSuggestions && suggestions.length > 0 ? (
                                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                                    {suggestions.map((s) => (
                                        <li key={s.id}>
                                            <button
                                                type="button"
                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                                                onClick={() => applySuggestion(s)}
                                            >
                                                <CatalogProductThumb product={s} size="sm" />
                                                <span className="min-w-0 flex-1 truncate">
                                                    {s.name}
                                                </span>
                                                {s.barcode ? (
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        {s.barcode}
                                                    </span>
                                                ) : null}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1 text-sm">
                                <span className="font-medium">SKU</span>
                                <input
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                    placeholder="Auto-generated if empty"
                                    className="rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
                                />
                            </label>
                            <label className="grid gap-1 text-sm">
                                <span className="font-medium">Category</span>
                                <input
                                    value={categoryName}
                                    onChange={(e) => setCategoryName(e.target.value)}
                                    placeholder="e.g. Beverages"
                                    className="rounded-lg border border-input bg-background px-3 py-2"
                                />
                            </label>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <label className="grid gap-1 text-sm sm:col-span-1">
                                <span className="font-medium">
                                    Shop price (GHS) <span className="text-destructive">*</span>
                                </span>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={priceGhs}
                                    onChange={(e) => setPriceGhs(e.target.value)}
                                    required
                                    placeholder="Required for this shop"
                                    className="rounded-lg border border-input bg-background px-3 py-2"
                                />
                                <span className="text-[11px] text-muted-foreground">
                                    Master catalog stores no price — shop only
                                </span>
                            </label>
                            <label className="grid gap-1 text-sm">
                                <span className="font-medium">Cost (GHS)</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={costPriceGhs}
                                    onChange={(e) => setCostPriceGhs(e.target.value)}
                                    className="rounded-lg border border-input bg-background px-3 py-2"
                                />
                            </label>
                            <label className="grid gap-1 text-sm">
                                <span className="font-medium">Stock</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={stock}
                                    onChange={(e) => setStock(e.target.value)}
                                    className="rounded-lg border border-input bg-background px-3 py-2"
                                />
                            </label>
                        </div>

                        <label className="grid gap-1 text-sm">
                            <span className="font-medium">
                                Image URL{" "}
                                <span className="font-normal text-muted-foreground">
                                    (auto-filled from scan when available)
                                </span>
                            </span>
                            <input
                                value={imageSrc}
                                onChange={(e) => setImageSrc(e.target.value)}
                                placeholder="https://…"
                                className="rounded-lg border border-input bg-background px-3 py-2"
                            />
                        </label>

                        <label className="grid gap-1 text-sm">
                            <span className="font-medium">Description</span>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                className="rounded-lg border border-input bg-background px-3 py-2"
                            />
                        </label>

                        {error ? (
                            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {error}
                            </p>
                        ) : null}

                        <p className="text-xs text-muted-foreground">
                            Scan fills name and image from the master catalog or public web APIs
                            (UPCitemdb, Open Food Facts, Open Beauty Facts, Open Products Facts).
                            You must enter the shop selling price; master catalog keeps name, image,
                            and description only.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving || lookingUp}>
                            {saving ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="mr-1.5 h-4 w-4" />
                            )}
                            Add to shop &amp; master catalog
                        </Button>
                    </div>
                </form>
            </div>

            {scanOpen ? (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
                    <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                            <span className="flex items-center gap-2 text-sm font-medium text-white">
                                <Barcode className="h-4 w-4" />
                                Scan product barcode
                            </span>
                            <button
                                type="button"
                                onClick={() => setScanOpen(false)}
                                className="rounded-lg p-2 text-white/80 hover:bg-white/10"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="h-[50vh] min-h-[280px]">
                            <PosBarcodeCamera
                                active={scanOpen}
                                onScan={handleScan}
                                className="h-full w-full"
                            />
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
