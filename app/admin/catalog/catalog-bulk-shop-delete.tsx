"use client";

import { useMemo, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatalogShop } from "./catalog-admin-types";
import { platformDeleteShop } from "./catalog-admin-utils";

type Props = {
    token: string;
    shops: CatalogShop[];
    selectedIds: Set<string>;
    onClearSelection: () => void;
    onDeleted: (deletedIds: string[]) => void;
};

export function CatalogBulkShopDelete({
    token,
    shops,
    selectedIds,
    onClearSelection,
    onDeleted,
}: Props) {
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selected = useMemo(
        () => shops.filter((s) => selectedIds.has(s.id)),
        [shops, selectedIds]
    );

    if (selectedIds.size === 0) return null;

    const runDelete = async () => {
        if (confirmText.trim() !== "DELETE") return;
        setBusy(true);
        setError(null);
        const failed: string[] = [];
        const deleted: string[] = [];

        for (const shop of selected) {
            try {
                await platformDeleteShop(token, shop.id, shop.slug);
                deleted.push(shop.id);
            } catch {
                failed.push(shop.name);
            }
        }

        setBusy(false);
        if (deleted.length > 0) {
            onDeleted(deleted);
            onClearSelection();
            setOpen(false);
            setConfirmText("");
        }
        if (failed.length > 0) {
            setError(`Failed to delete: ${failed.join(", ")}`);
        }
    };

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                    <span className="tabular-nums">{selectedIds.size}</span> shop
                    {selectedIds.size === 1 ? "" : "s"} selected
                </p>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={onClearSelection}>
                        <X className="mr-1.5 h-4 w-4" />
                        Clear
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setOpen(true)}
                    >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Delete selected
                    </Button>
                </div>
            </div>

            {open ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
                    <div
                        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-lg"
                        role="dialog"
                        aria-labelledby="bulk-delete-title"
                    >
                        <h3
                            id="bulk-delete-title"
                            className="text-lg font-semibold text-destructive"
                        >
                            Delete {selectedIds.size} shop{selectedIds.size === 1 ? "" : "s"}?
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            This permanently removes all data for the selected shops. Type{" "}
                            <code className="rounded bg-muted px-1 font-mono text-xs">DELETE</code>{" "}
                            to confirm.
                        </p>
                        <ul className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                            {selected.map((s) => (
                                <li key={s.id} className="py-1 text-foreground">
                                    {s.name}{" "}
                                    <span className="font-mono text-xs text-muted-foreground">
                                        ({s.slug})
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="Type DELETE"
                            autoComplete="off"
                            className="mt-4 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                        />
                        {error ? (
                            <p className="mt-2 text-sm text-destructive">{error}</p>
                        ) : null}
                        <div className="mt-4 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={busy}
                                onClick={() => {
                                    setOpen(false);
                                    setConfirmText("");
                                    setError(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={busy || confirmText.trim() !== "DELETE"}
                                onClick={() => void runDelete()}
                            >
                                {busy ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                        Deleting…
                                    </>
                                ) : (
                                    "Permanently delete"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
