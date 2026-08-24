"use client";

import { useEffect, type ReactNode } from "react";
import { Ban, Loader2, Trash2 } from "lucide-react";

export function DeleteConfirmModal({
    title,
    description,
    confirmLabel = "Delete",
    dismissLabel = "Cancel",
    isDeleting,
    onCancel,
    onConfirm,
    icon = "trash",
}: {
    title: string;
    description: ReactNode;
    confirmLabel?: string;
    dismissLabel?: string;
    isDeleting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    icon?: "trash" | "ban";
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !isDeleting) onCancel();
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener("keydown", onKey);
        };
    }, [isDeleting, onCancel]);

    const Icon = icon === "ban" ? Ban : Trash2;

    return (
        <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center print:hidden">
            <div
                className="absolute inset-0 bg-black/50 sm:bg-black/40 sm:backdrop-blur-sm"
                onClick={() => {
                    if (!isDeleting) onCancel();
                }}
            />
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-confirm-title"
                aria-describedby="delete-confirm-desc"
                className="relative z-10 w-full max-w-md rounded-t-[1.75rem] border border-red-500/15 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_40px_rgba(0,0,0,0.18)] dark:bg-[#141414] sm:rounded-2xl sm:p-6 sm:shadow-xl"
            >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/25 sm:hidden" />
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300">
                    <Icon className="size-5" strokeWidth={1.75} />
                </div>
                <h2 id="delete-confirm-title" className="text-[1.125rem] font-bold tracking-tight">
                    {title}
                </h2>
                <p id="delete-confirm-desc" className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    {description}
                </p>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="w-full rounded-xl border border-[#e5e7eb] px-5 py-3 text-[15px] font-semibold transition-all hover:bg-muted/40 disabled:opacity-50 dark:border-white/12 sm:w-auto sm:py-2.5"
                    >
                        {dismissLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-[15px] font-bold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 disabled:opacity-50 sm:w-auto sm:px-8 sm:py-2.5"
                    >
                        {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
                        {isDeleting ? "Please wait…" : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
