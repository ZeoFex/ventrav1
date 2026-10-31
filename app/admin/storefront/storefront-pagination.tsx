"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function pageItems(page: number, pages: number): Array<number | "gap"> {
    if (pages <= 7) {
        return Array.from({ length: pages }, (_, i) => i);
    }

    const items: Array<number | "gap"> = [0];
    const start = Math.max(1, page - 1);
    const end = Math.min(pages - 2, page + 1);

    if (start > 1) items.push("gap");
    for (let i = start; i <= end; i++) items.push(i);
    if (end < pages - 2) items.push("gap");
    items.push(pages - 1);

    return items;
}

export function StorefrontPagination({
    total,
    page,
    pageSize,
    onPageChange,
    disabled,
}: {
    total: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    disabled?: boolean;
}) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const from = total === 0 ? 0 : page * pageSize + 1;
    const to = Math.min(total, (page + 1) * pageSize);

    if (total <= pageSize) {
        return (
            <p className="mt-10 text-center text-sm text-[#8a8478]">
                Showing{" "}
                <span className="font-medium tabular-nums text-[#1c1917] dark:text-zinc-100">
                    {total}
                </span>{" "}
                {total === 1 ? "product" : "products"}
            </p>
        );
    }

    return (
        <nav
            aria-label="Product pagination"
            className="mt-10 rounded-[1.5rem] border border-[#e7e0d4] bg-white px-4 py-3 shadow-[0_12px_40px_-28px_rgba(31,61,50,0.45)] dark:border-white/10 dark:bg-[#141414]"
        >
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-sm text-[#8a8478]">
                Showing{" "}
                <span className="font-semibold tabular-nums text-[#1c1917] dark:text-zinc-100">
                    {from.toLocaleString()}–{to.toLocaleString()}
                </span>{" "}
                of{" "}
                <span className="font-semibold tabular-nums text-[#1c1917] dark:text-zinc-100">
                    {total.toLocaleString()}
                </span>
            </p>
            <div className="flex items-center gap-1.5">
                <PageButton
                    aria-label="Previous page"
                    disabled={disabled || page <= 0}
                    onClick={() => onPageChange(page - 1)}
                >
                    <ChevronLeft className="size-4" />
                </PageButton>
                {pageItems(page, pages).map((item, i) =>
                    item === "gap" ? (
                        <span
                            key={`gap-${i}`}
                            className="px-1.5 text-sm text-[#8a8478]"
                        >
                            …
                        </span>
                    ) : (
                        <PageButton
                            key={item}
                            active={item === page}
                            disabled={disabled}
                            onClick={() => onPageChange(item)}
                        >
                            {item + 1}
                        </PageButton>
                    ),
                )}
                <PageButton
                    aria-label="Next page"
                    disabled={disabled || page >= pages - 1}
                    onClick={() => onPageChange(page + 1)}
                >
                    <ChevronRight className="size-4" />
                </PageButton>
            </div>
            </div>
        </nav>
    );
}

function PageButton({
    children,
    active,
    disabled,
    onClick,
    ...rest
}: {
    children: ReactNode;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "inline-flex size-10 items-center justify-center rounded-full text-sm font-medium tabular-nums transition",
                active
                    ? "bg-[#1f3d32] text-white shadow-sm dark:bg-[#6ffbbe] dark:text-[#003527]"
                    : "border border-[#e7e0d4] bg-white text-[#1c1917] hover:border-[#1f3d32]/40 hover:bg-[#efe8dc] disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:hover:bg-white/10",
            )}
            {...rest}
        >
            {children}
        </button>
    );
}
