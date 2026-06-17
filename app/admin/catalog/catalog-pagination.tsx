"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const SHOP_PAGE_SIZE = 12;
export const PRODUCT_PAGE_SIZE = 20;
export const MASTER_PRODUCT_PAGE_SIZE = 20;
export const SUBSCRIPTION_PAGE_SIZE = 25;

export function pageCount(total: number, pageSize: number) {
    return Math.max(1, Math.ceil(total / pageSize));
}

export function pageOffset(page: number, pageSize: number) {
    return page * pageSize;
}

type CatalogPaginationProps = {
    total: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    disabled?: boolean;
    className?: string;
};

export function CatalogPagination({
    total,
    page,
    pageSize,
    onPageChange,
    disabled,
    className,
}: CatalogPaginationProps) {
    const pages = pageCount(total, pageSize);
    const from = total === 0 ? 0 : page * pageSize + 1;
    const to = Math.min(total, (page + 1) * pageSize);

    if (total === 0) return null;

    const windowStart = Math.max(0, Math.min(page - 2, pages - 5));
    const windowEnd = Math.min(pages, windowStart + 5);
    const pageNumbers = Array.from(
        { length: windowEnd - windowStart },
        (_, i) => windowStart + i
    );

    return (
        <div
            className={cn(
                "flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                className
            )}
        >
            <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium tabular-nums text-foreground">
                    {from}–{to}
                </span>{" "}
                of <span className="font-medium tabular-nums text-foreground">{total}</span>
            </p>
            <div className="flex flex-wrap items-center gap-1">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || page <= 0}
                    onClick={() => onPageChange(page - 1)}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                </Button>
                {pageNumbers.map((p) => (
                    <Button
                        key={p}
                        type="button"
                        variant={p === page ? "default" : "outline"}
                        size="sm"
                        className="min-w-9 px-2 tabular-nums"
                        disabled={disabled}
                        onClick={() => onPageChange(p)}
                    >
                        {p + 1}
                    </Button>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || page >= pages - 1}
                    onClick={() => onPageChange(page + 1)}
                >
                    Next
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
