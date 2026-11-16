"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    DownloadCloud,
    ImageIcon,
    Loader2,
    Plus,
    Trash2,
    X,
} from "lucide-react";
import { parseAmountInput, formatAmountGrouping } from "@/app/lib/parse-amount";
import { PRODUCT_UNITS } from "@/app/lib/product-units";
import { useCategories, useTags } from "./products-data-hooks";
import { useSession } from "@/app/components/auth/use-session";
import { useUploadThing } from "@/app/lib/uploadthing";

type ImportProductsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onImport: () => void;
};

type Step = "sheet" | "importing" | "success";

type VariationGroup = {
    type: string;
    values: string;
};

type SheetRow = {
    id: string;
    name: string;
    priceGhs: string;
    costPriceGhs: string;
    stock: string;
    unit: string;
    barcode: string;
    categoryId: string;
    description: string;
    reorderAt: string;
    status: "active" | "archived";
    imageFile: File | null;
    imagePreview: string | null;
    imageSrc: string;
    variationGroups: VariationGroup[];
    tagIds: string[];
};

const COLUMNS = [
    { key: "name", label: "Product name", required: true, width: "min-w-[180px]" },
    { key: "priceGhs", label: "Price (GHS)", required: true, width: "min-w-[120px]" },
    { key: "costPriceGhs", label: "Cost (GHS)", required: false, width: "min-w-[120px]" },
    { key: "stock", label: "Stock", required: false, width: "min-w-[88px]" },
    { key: "unit", label: "Unit", required: false, width: "min-w-[120px]" },
    { key: "image", label: "Image", required: false, width: "min-w-[88px]" },
    { key: "barcode", label: "Barcode", required: false, width: "min-w-[140px]" },
    { key: "variations", label: "Variations", required: false, width: "min-w-[200px]" },
    { key: "description", label: "Description", required: false, width: "min-w-[180px]" },
    { key: "categoryId", label: "Category", required: false, width: "min-w-[140px]" },
    { key: "status", label: "Status", required: false, width: "min-w-[110px]" },
    { key: "reorderAt", label: "Reorder at", required: false, width: "min-w-[100px]" },
    { key: "tagIds", label: "Tags", required: false, width: "min-w-[160px]" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];
type TextColumnKey = Exclude<ColumnKey, "image" | "variations" | "tagIds">;

const EMPTY_STARTER_ROWS = 8;

function variationTypeOptions(businessType?: string | null): string[] {
    const bType = businessType || "general_retail_store";
    if (bType === "boutique_fashion" || bType === "boutique") return ["Size", "Color"];
    if (bType === "agrochemical_shop" || bType === "agro_chemicals")
        return ["Pack size", "Volume / weight", "Concentration"];
    if (bType === "pharmacy") return ["Dosage", "Pack Size"];
    if (bType === "electronics_store" || bType === "electronics")
        return ["Storage", "Color", "Model"];
    if (bType === "cold_store") return ["Cut", "Weight", "Pack Size"];
    return ["Size", "Color", "Material", "Style"];
}

function parseVariationValues(raw: string): string[] {
    return raw
        .split(/[,|/]+/)
        .map((v) => v.trim())
        .filter(Boolean);
}

function expandVariationGroups(
    groups: VariationGroup[],
    fallbackPrice: string,
): { type: string; name: string; priceGhs: string; stock: number }[] {
    return groups.flatMap((group) =>
        parseVariationValues(group.values).map((name) => ({
            type: group.type,
            name,
            priceGhs: fallbackPrice,
            stock: 0,
        })),
    );
}

function newRow(): SheetRow {
    return {
        id: `row_${Math.random().toString(36).slice(2, 10)}`,
        name: "",
        priceGhs: "",
        costPriceGhs: "",
        stock: "",
        unit: "piece",
        barcode: "",
        categoryId: "",
        description: "",
        reorderAt: "",
        status: "active",
        imageFile: null,
        imagePreview: null,
        imageSrc: "",
        variationGroups: [],
        tagIds: [],
    };
}

function isRowBlank(row: SheetRow): boolean {
    return (
        !row.name.trim() &&
        !row.priceGhs.trim() &&
        !row.costPriceGhs.trim() &&
        !row.stock.trim() &&
        !row.barcode.trim() &&
        !row.description.trim() &&
        !row.categoryId &&
        !row.reorderAt.trim() &&
        !row.imageFile &&
        !row.imageSrc.trim() &&
        row.variationGroups.length === 0 &&
        row.tagIds.length === 0 &&
        row.status === "active"
    );
}

function ImageCell({
    row,
    onFile,
    onClear,
}: {
    row: SheetRow;
    onFile: (file: File) => void;
    onClear: () => void;
}) {
    return (
        <div className="flex h-10 items-center gap-1 px-1.5">
            <label className="flex size-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-[#e5e7eb] bg-muted/40 dark:border-white/[0.12]">
                {row.imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.imagePreview} alt="" className="size-full object-cover" />
                ) : (
                    <ImageIcon className="size-3.5 opacity-40" />
                )}
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onFile(file);
                        e.target.value = "";
                    }}
                />
            </label>
            {row.imagePreview ? (
                <button
                    type="button"
                    onClick={onClear}
                    className="rounded p-0.5 text-muted-foreground hover:text-red-600"
                    aria-label="Remove image"
                >
                    <X className="size-3" />
                </button>
            ) : (
                <span className="truncate text-[11px] text-muted-foreground">Add</span>
            )}
        </div>
    );
}

function TagsCell({
    selectedIds,
    tags,
    onChange,
}: {
    selectedIds: string[];
    tags: { id: string; name: string }[];
    onChange: (ids: string[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    const names = tags.filter((t) => selectedIds.includes(t.id)).map((t) => t.name);
    const summary = names.length > 0 ? names.join(", ") : "Choose…";

    return (
        <div ref={rootRef} className="relative px-1 py-1">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="h-8 w-full truncate rounded-md px-2 text-left text-[12px] hover:bg-[#006c49]/8"
            >
                {summary}
            </button>
            {open ? (
                <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-52 overflow-auto rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-xl dark:border-white/[0.12] dark:bg-[#141414]">
                    {tags.length === 0 ? (
                        <p className="px-2 py-1.5 text-[12px] text-muted-foreground">No tags yet</p>
                    ) : (
                        tags.map((t) => {
                            const on = selectedIds.includes(t.id);
                            return (
                                <label
                                    key={t.id}
                                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] hover:bg-muted"
                                >
                                    <input
                                        type="checkbox"
                                        checked={on}
                                        onChange={() =>
                                            onChange(
                                                on
                                                    ? selectedIds.filter((id) => id !== t.id)
                                                    : [...selectedIds, t.id],
                                            )
                                        }
                                    />
                                    {t.name}
                                </label>
                            );
                        })
                    )}
                </div>
            ) : null}
        </div>
    );
}

function VariationCell({
    groups,
    typeOptions,
    onChange,
}: {
    groups: VariationGroup[];
    typeOptions: string[];
    onChange: (groups: VariationGroup[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const [customType, setCustomType] = useState("");
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    const toggleType = (type: string) => {
        if (groups.some((g) => g.type === type)) {
            onChange(groups.filter((g) => g.type !== type));
        } else {
            onChange([...groups, { type, values: "" }]);
        }
    };

    const filled = groups.filter((g) => parseVariationValues(g.values).length > 0);
    const summary =
        filled.length > 0
            ? filled.map((g) => `${g.type} (${parseVariationValues(g.values).length})`).join(", ")
            : groups.length > 0
              ? groups.map((g) => g.type).join(", ")
              : "Choose types…";

    return (
        <div ref={rootRef} className="relative px-1 py-1">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="h-8 w-full truncate rounded-md px-2 text-left text-[12px] text-foreground hover:bg-[#006c49]/8"
            >
                {summary}
            </button>
            {open ? (
                <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-xl dark:border-white/[0.12] dark:bg-[#141414]">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Variation types
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {typeOptions.map((t) => {
                            const on = groups.some((g) => g.type === t);
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => toggleType(t)}
                                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                                        on
                                            ? "bg-[#006c49] text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
                                            : "border border-[#e5e7eb] hover:bg-muted dark:border-white/[0.12]"
                                    }`}
                                >
                                    {t}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-2 flex gap-1.5">
                        <input
                            value={customType}
                            onChange={(e) => setCustomType(e.target.value)}
                            placeholder="Custom type"
                            className="h-8 min-w-0 flex-1 rounded-lg border border-[#e5e7eb] px-2 text-[12px] dark:border-white/[0.12] dark:bg-transparent"
                            onKeyDown={(e) => {
                                if (e.key !== "Enter") return;
                                e.preventDefault();
                                const t = customType.trim();
                                if (!t) return;
                                toggleType(t);
                                setCustomType("");
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const t = customType.trim();
                                if (!t) return;
                                toggleType(t);
                                setCustomType("");
                            }}
                            className="rounded-lg border border-[#e5e7eb] px-2 text-[11px] font-semibold dark:border-white/[0.12]"
                        >
                            Add
                        </button>
                    </div>
                    {groups.map((g) => (
                        <label key={g.type} className="mt-2 block">
                            <span className="text-[11px] font-semibold text-foreground">{g.type} options</span>
                            <input
                                value={g.values}
                                placeholder="e.g. S, M, L"
                                onChange={(e) =>
                                    onChange(
                                        groups.map((x) =>
                                            x.type === g.type ? { ...x, values: e.target.value } : x,
                                        ),
                                    )
                                }
                                className="mt-0.5 h-8 w-full rounded-lg border border-[#e5e7eb] px-2 text-[12px] dark:border-white/[0.12] dark:bg-transparent"
                            />
                        </label>
                    ))}
                    <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                        SKU and barcode for each option are generated automatically.
                    </p>
                </div>
            ) : null}
        </div>
    );
}

export function ImportProductsModal({ isOpen, onClose, onImport }: ImportProductsModalProps) {
    const { categories = [] } = useCategories();
    const { tags = [] } = useTags();
    const { user } = useSession();
    const { startUpload } = useUploadThing("productImage");
    const typeOptions = useMemo(() => variationTypeOptions(user?.businessType), [user?.businessType]);
    const [step, setStep] = useState<Step>("sheet");
    const [rows, setRows] = useState<SheetRow[]>(() =>
        Array.from({ length: EMPTY_STARTER_ROWS }, () => newRow()),
    );
    const [error, setError] = useState<string | null>(null);
    const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
    const [importProgress, setImportProgress] = useState(0);
    const [visualProgress, setVisualProgress] = useState(0);
    const [totalRows, setTotalRows] = useState(0);
    const [processedRows, setProcessedRows] = useState(0);
    const cellRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>({});
    const pendingFocusRef = useRef<{ rowIndex: number; col: ColumnKey } | null>(null);

    useEffect(() => {
        const pending = pendingFocusRef.current;
        if (!pending) return;
        pendingFocusRef.current = null;
        const row = rows[pending.rowIndex];
        if (!row) return;
        cellRefs.current[`${row.id}:${pending.col}`]?.focus();
    }, [rows]);

    useEffect(() => {
        if (step !== "importing") return;
        const timer = setInterval(() => {
            setVisualProgress((prev) => {
                const target = Math.max(importProgress, 2);
                if (prev < target) return prev + 0.5;
                if (prev < 99 && importProgress > 0) return prev + 0.1;
                return prev;
            });
        }, 50);
        return () => clearInterval(timer);
    }, [step, importProgress]);

    useEffect(() => {
        if (step === "success") {
            setVisualProgress(100);
            setImportProgress(100);
        }
    }, [step]);

    const reset = useCallback(() => {
        setStep("sheet");
        setRows(Array.from({ length: EMPTY_STARTER_ROWS }, () => newRow()));
        setError(null);
        setRowErrors({});
        setImportProgress(0);
        setVisualProgress(0);
        setProcessedRows(0);
        setTotalRows(0);
    }, []);

    const filledCount = useMemo(() => rows.filter((r) => !isRowBlank(r)).length, [rows]);

    const updateRow = useCallback((id: string, key: TextColumnKey, value: string) => {
        setRows((prev) => {
            const next = prev.map((row) => (row.id === id ? { ...row, [key]: value } : row));
            const last = next[next.length - 1];
            if (last && !isRowBlank(last)) next.push(newRow());
            return next;
        });
        setRowErrors((prev) => {
            if (!prev[id]) return prev;
            const copy = { ...prev };
            delete copy[id];
            return copy;
        });
    }, []);

    const patchRow = useCallback((id: string, patch: Partial<SheetRow>) => {
        setRows((prev) => {
            const next = prev.map((row) => (row.id === id ? { ...row, ...patch } : row));
            const last = next[next.length - 1];
            if (last && !isRowBlank(last)) next.push(newRow());
            return next;
        });
        setRowErrors((prev) => {
            if (!prev[id]) return prev;
            const copy = { ...prev };
            delete copy[id];
            return copy;
        });
    }, []);

    const handleSheetKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
        rowIndex: number,
    ) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void handleImport();
            return;
        }
        if (e.key !== "Enter" || e.shiftKey) return;
        e.preventDefault();
        const nextIndex = rowIndex + 1;
        pendingFocusRef.current = { rowIndex: nextIndex, col: "name" };
        setRows((prev) => {
            const next = [...prev];
            while (next.length <= nextIndex) next.push(newRow());
            return next;
        });
    };

    const removeRow = (id: string) => {
        setRows((prev) => {
            const next = prev.filter((r) => r.id !== id);
            return next.length >= 1 ? next : [newRow()];
        });
    };

    const handleImport = async () => {
        const filled = rows.filter((r) => !isRowBlank(r));
        if (filled.length === 0) {
            setError("Enter at least one product. Name and price are required.");
            return;
        }

        const nextErrors: Record<string, string> = {};
        const drafts: {
            row: SheetRow;
            price: number;
            cost: number | null;
            stockNum: number;
            reorderNum: number;
        }[] = [];

        for (const row of filled) {
            if (!row.name.trim()) {
                nextErrors[row.id] = "Product name is required.";
                continue;
            }
            const price = parseAmountInput(row.priceGhs);
            if (!Number.isFinite(price) || price < 0) {
                nextErrors[row.id] = "Enter a valid selling price.";
                continue;
            }
            const costTrim = row.costPriceGhs.trim();
            const cost = costTrim === "" ? null : parseAmountInput(costTrim);
            if (costTrim && (!Number.isFinite(cost) || (cost as number) < 0)) {
                nextErrors[row.id] = "Cost must be a valid amount, or left blank.";
                continue;
            }
            const stockNum =
                row.stock.trim() === ""
                    ? 0
                    : Math.max(0, Math.round(parseAmountInput(row.stock)));
            if (row.stock.trim() && !Number.isFinite(stockNum)) {
                nextErrors[row.id] = "Stock must be a whole number, or left blank.";
                continue;
            }
            const reorderNum =
                row.reorderAt.trim() === "" ? 0 : Math.max(0, Math.round(Number(row.reorderAt)));
            if (row.reorderAt.trim() && !Number.isFinite(reorderNum)) {
                nextErrors[row.id] = "Reorder level must be a whole number, or left blank.";
                continue;
            }
            drafts.push({ row, price, cost, stockNum, reorderNum });
        }

        setRowErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            setError("Fix the highlighted rows. Name and price are required; other fields can stay empty.");
            return;
        }

        setStep("importing");
        setError(null);
        setImportProgress(2);
        setTotalRows(drafts.length);

        const items: Record<string, unknown>[] = [];
        for (const draft of drafts) {
            const { row, price, cost, stockNum, reorderNum } = draft;
            let imageSrc = row.imageSrc.trim() || null;
            if (row.imageFile) {
                try {
                    const uploaded = await startUpload([row.imageFile]);
                    if (uploaded?.[0]?.url) imageSrc = uploaded[0].url;
                } catch {
                    setError("Image upload failed. Try a smaller photo or skip the image.");
                    setStep("sheet");
                    return;
                }
            }
            items.push({
                name: row.name.trim(),
                priceGhs: String(price),
                ...(cost != null ? { costPriceGhs: String(cost) } : {}),
                stock: stockNum,
                reorderAt: reorderNum,
                unit: row.unit.trim() || "piece",
                barcode: row.barcode.trim() || null,
                description: row.description.trim() || "",
                categoryId: row.categoryId || null,
                status: row.status,
                imageSrc,
                tagIds: row.tagIds,
                variations: expandVariationGroups(row.variationGroups, String(price)),
            });
        }
        const chunkSize = 500;
        let processed = 0;

        try {
            for (let i = 0; i < items.length; i += chunkSize) {
                const chunk = items.slice(i, i + chunkSize);
                const res = await fetch("/api/products/bulk", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ items: chunk }),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(
                        typeof data.error === "string"
                            ? data.error
                            : `Bulk import failed at chunk ${Math.floor(i / chunkSize) + 1}`,
                    );
                }
                processed += chunk.length;
                setProcessedRows(processed);
                setImportProgress(Math.min(Math.round((processed / items.length) * 100), 100));
            }
            setStep("success");
            onImport();
            setTimeout(() => {
                onClose();
                reset();
            }, 2500);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Bulk import failed");
            setStep("sheet");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4">
            <div className="flex max-h-[92vh] w-full max-w-[1240px] animate-in fade-in zoom-in duration-200 flex-col overflow-hidden rounded-[1.5rem] border border-[#eef0f2] bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111]">
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#f0f2f4] px-5 py-4 dark:border-white/[0.06] sm:px-6">
                    <div className="min-w-0">
                        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-foreground">
                            Import products
                        </h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {step === "sheet" &&
                                "Fill the spreadsheet. Name and price are required. SKU, slug, and variation codes are generated automatically."}
                            {step === "importing" && "Adding products to your catalog..."}
                            {step === "success" && "Products successfully imported."}
                        </p>
                    </div>
                    {step !== "importing" ? (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                reset();
                            }}
                            className="rounded-full p-2 transition-colors hover:bg-[#f4f5f7] dark:hover:bg-white/5"
                            aria-label="Close"
                        >
                            <X className="size-5" />
                        </button>
                    ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-5">
                    {error ? (
                        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-red-800 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400">
                            <AlertCircle className="mt-0.5 size-4 shrink-0" />
                            <p className="text-[13px] leading-relaxed">{error}</p>
                        </div>
                    ) : null}

                    {step === "sheet" ? (
                        <div className="flex h-full min-h-0 flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[12px] text-muted-foreground">
                                    <span className="font-semibold text-foreground">{filledCount}</span> product
                                    {filledCount === 1 ? "" : "s"} entered
                                    <span className="mx-2 text-[#d1d5db]">·</span>
                                    Press Enter for the next row · Ctrl/⌘ + Enter to import
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRows((prev) => [...prev, newRow()])}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e7eb] px-3 py-1.5 text-[12px] font-semibold hover:bg-[#f4f5f7] dark:border-white/[0.12] dark:hover:bg-white/5"
                                    >
                                        <Plus className="size-3.5" />
                                        Add row
                                    </button>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[#d1d5db] bg-white shadow-inner dark:border-white/[0.1] dark:bg-[#0c0c0c]">
                                <table className="w-max min-w-full border-collapse text-[13px]">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-[#e8f5f0] dark:bg-[#0d2a22]">
                                            <th className="sticky left-0 z-20 w-10 border-b border-r border-[#c5ddd4] bg-[#dceee8] px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground dark:border-[#1a4a3c] dark:bg-[#0a241d]">
                                                #
                                            </th>
                                            {COLUMNS.map((col) => (
                                                <th
                                                    key={col.key}
                                                    className={`border-b border-r border-[#c5ddd4] px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-[#0f3d32] dark:border-[#1a4a3c] dark:text-[#6ffbbe] ${col.width}`}
                                                >
                                                    {col.label}
                                                    {col.required ? (
                                                        <span className="ml-0.5 text-red-500">*</span>
                                                    ) : (
                                                        <span className="ml-1 font-medium normal-case tracking-normal text-muted-foreground">
                                                            optional
                                                        </span>
                                                    )}
                                                </th>
                                            ))}
                                            <th className="w-10 border-b border-[#c5ddd4] bg-[#dceee8] dark:border-[#1a4a3c] dark:bg-[#0a241d]" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, rowIndex) => {
                                            const invalid = rowErrors[row.id];
                                            return (
                                                <tr
                                                    key={row.id}
                                                    className={
                                                        invalid
                                                            ? "bg-red-50 dark:bg-red-950/30"
                                                            : rowIndex % 2 === 0
                                                              ? "bg-white dark:bg-[#111]"
                                                              : "bg-[#f8faf9] dark:bg-[#141414]"
                                                    }
                                                >
                                                    <td className="sticky left-0 z-10 border-b border-r border-[#e5e7eb] bg-inherit px-2 py-0 text-center font-mono text-[11px] text-muted-foreground dark:border-white/[0.08]">
                                                        {rowIndex + 1}
                                                    </td>
                                                    {COLUMNS.map((col) => (
                                                        <td
                                                            key={col.key}
                                                            className="border-b border-r border-[#e5e7eb] p-0 dark:border-white/[0.08]"
                                                        >
                                                            {col.key === "image" ? (
                                                                <ImageCell
                                                                    row={row}
                                                                    onFile={(file) =>
                                                                        patchRow(row.id, {
                                                                            imageFile: file,
                                                                            imagePreview: URL.createObjectURL(file),
                                                                        })
                                                                    }
                                                                    onClear={() =>
                                                                        patchRow(row.id, {
                                                                            imageFile: null,
                                                                            imagePreview: null,
                                                                            imageSrc: "",
                                                                        })
                                                                    }
                                                                />
                                                            ) : col.key === "variations" ? (
                                                                <VariationCell
                                                                    groups={row.variationGroups}
                                                                    typeOptions={typeOptions}
                                                                    onChange={(variationGroups) =>
                                                                        patchRow(row.id, { variationGroups })
                                                                    }
                                                                />
                                                            ) : col.key === "tagIds" ? (
                                                                <TagsCell
                                                                    selectedIds={row.tagIds}
                                                                    tags={tags as { id: string; name: string }[]}
                                                                    onChange={(tagIds) => patchRow(row.id, { tagIds })}
                                                                />
                                                            ) : col.key === "status" ? (
                                                                <select
                                                                    ref={(el) => {
                                                                        cellRefs.current[`${row.id}:${col.key}`] = el;
                                                                    }}
                                                                    value={row.status}
                                                                    onChange={(e) =>
                                                                        updateRow(
                                                                            row.id,
                                                                            "status",
                                                                            e.target.value as "active" | "archived",
                                                                        )
                                                                    }
                                                                    onKeyDown={(e) => handleSheetKeyDown(e, rowIndex)}
                                                                    className="h-10 w-full bg-background px-2 text-foreground outline-none focus:bg-[#006c49]/8 focus:ring-2 focus:ring-inset focus:ring-[#006c49]/30 dark:bg-[#141414] dark:focus:bg-[#6ffbbe]/10"
                                                                >
                                                                    <option value="active">Active</option>
                                                                    <option value="archived">Archived</option>
                                                                </select>
                                                            ) : col.key === "unit" ? (
                                                                <select
                                                                    ref={(el) => {
                                                                        cellRefs.current[`${row.id}:${col.key}`] = el;
                                                                    }}
                                                                    value={row.unit}
                                                                    onChange={(e) =>
                                                                        updateRow(row.id, "unit", e.target.value)
                                                                    }
                                                                    onKeyDown={(e) => handleSheetKeyDown(e, rowIndex)}
                                                                    className="h-10 w-full bg-background px-2 text-foreground outline-none focus:bg-[#006c49]/8 focus:ring-2 focus:ring-inset focus:ring-[#006c49]/30 dark:bg-[#141414] dark:focus:bg-[#6ffbbe]/10"
                                                                >
                                                                    {PRODUCT_UNITS.map((u) => (
                                                                        <option key={u.value} value={u.value}>
                                                                            {u.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            ) : col.key === "categoryId" ? (
                                                                <select
                                                                    ref={(el) => {
                                                                        cellRefs.current[`${row.id}:${col.key}`] = el;
                                                                    }}
                                                                    value={row.categoryId}
                                                                    onChange={(e) =>
                                                                        updateRow(row.id, "categoryId", e.target.value)
                                                                    }
                                                                    onKeyDown={(e) => handleSheetKeyDown(e, rowIndex)}
                                                                    className="h-10 w-full bg-background px-2 text-foreground outline-none focus:bg-[#006c49]/8 focus:ring-2 focus:ring-inset focus:ring-[#006c49]/30 dark:bg-[#141414] dark:focus:bg-[#6ffbbe]/10"
                                                                >
                                                                    <option value="">—</option>
                                                                    {categories.map((c: { id: string; name: string }) => (
                                                                        <option key={c.id} value={c.id}>
                                                                            {c.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <input
                                                                    ref={(el) => {
                                                                        cellRefs.current[`${row.id}:${col.key}`] = el;
                                                                    }}
                                                                    value={row[col.key]}
                                                                    onChange={(e) => {
                                                                        const raw = e.target.value;
                                                                        const next =
                                                                            col.key === "priceGhs" ||
                                                                            col.key === "costPriceGhs"
                                                                                ? formatAmountGrouping(raw)
                                                                                : raw;
                                                                        updateRow(row.id, col.key, next);
                                                                    }}
                                                                    onKeyDown={(e) => handleSheetKeyDown(e, rowIndex)}
                                                                    inputMode={
                                                                        col.key === "priceGhs" ||
                                                                        col.key === "costPriceGhs" ||
                                                                        col.key === "stock" ||
                                                                        col.key === "reorderAt"
                                                                            ? "decimal"
                                                                            : "text"
                                                                    }
                                                                    placeholder={col.required ? "Required" : ""}
                                                                    className="h-10 w-full bg-transparent px-2 outline-none placeholder:text-muted-foreground/40 focus:bg-[#006c49]/8 focus:ring-2 focus:ring-inset focus:ring-[#006c49]/30 dark:focus:bg-[#6ffbbe]/10"
                                                                    aria-invalid={Boolean(invalid)}
                                                                />
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="border-b border-[#e5e7eb] px-1 dark:border-white/[0.08]">
                                                        {!isRowBlank(row) ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeRow(row.id)}
                                                                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                                                                aria-label={`Remove row ${rowIndex + 1}`}
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </button>
                                                        ) : null}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {Object.keys(rowErrors).length > 0 ? (
                                <p className="text-[12px] text-red-600 dark:text-red-400">
                                    Highlighted rows need a product name and a valid price.
                                </p>
                            ) : null}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-10 text-center">
                            {step === "success" ? (
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 animate-pulse rounded-full bg-[#006c49]/10 blur-2xl" />
                                    <div className="relative flex size-20 items-center justify-center rounded-3xl bg-[#006c49]/10 text-[#006c49] animate-in zoom-in duration-500">
                                        <CheckCircle2 className="size-10" />
                                    </div>
                                </div>
                            ) : (
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 animate-pulse rounded-full bg-[#003527]/5 blur-2xl" />
                                    <div className="relative flex size-20 items-center justify-center rounded-3xl bg-[#003527]/5 text-[#003527] shadow-sm ring-1 ring-black/5 dark:bg-white/5 dark:text-white dark:ring-white/10">
                                        <DownloadCloud className="size-10 animate-bounce" />
                                    </div>
                                </div>
                            )}
                            <h3 className="mb-2 text-2xl font-bold tracking-tight">
                                {step === "success" ? "Import complete" : "Importing products"}
                            </h3>
                            <p className="mb-10 font-medium text-muted-foreground">
                                {step === "success"
                                    ? `Successfully added ${totalRows} items to your catalog.`
                                    : `Adding ${totalRows} items. Keep this window open...`}
                            </p>
                            <div className="w-full max-w-sm space-y-4">
                                <div className="relative h-4 w-full overflow-hidden rounded-full bg-[#f0f2f4] shadow-inner dark:bg-white/5">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#003527] to-[#006c49] shadow-lg transition-all duration-300 ease-out dark:from-[#006c49] dark:to-[#6ffbbe]"
                                        style={{ width: `${visualProgress}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between px-1 text-[13px] font-bold text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <span className="tabular-nums text-foreground">{processedRows}</span>
                                        <span>/</span>
                                        <span>{totalRows}</span>
                                    </span>
                                    <span className="rounded-lg bg-muted px-2 py-0.5 font-mono text-[11px] tabular-nums">
                                        {Math.round(visualProgress)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {step === "sheet" ? (
                    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[#f0f2f4] px-5 py-4 dark:border-white/[0.06] sm:px-6">
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                reset();
                            }}
                            className="rounded-2xl border border-[#e5e7eb] px-5 py-3 text-[14px] font-bold hover:bg-[#f4f5f7] dark:border-white/[0.12] dark:hover:bg-white/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleImport()}
                            disabled={filledCount === 0}
                            className="rounded-2xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-6 py-3 text-[14px] font-bold text-white shadow-lg shadow-[#003527]/10 transition-all hover:brightness-110 disabled:opacity-50"
                        >
                            Import {filledCount > 0 ? `${filledCount} product${filledCount === 1 ? "" : "s"}` : "products"}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
