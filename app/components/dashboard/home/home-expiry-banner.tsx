"use client";

import Link from "next/link";
import useSWR from "swr";
import { AlertTriangle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const DEFAULT_DAYS = 14;

export function HomeExpiryBanner() {
    const { data } = useSWR(
        `/api/inventory/expiring?days=${DEFAULT_DAYS}`,
        fetcher,
        { revalidateOnFocus: true },
    );

    const count = data?.count ?? 0;
    if (!count) return null;

    const uniqueProducts = new Set(
        (data?.items ?? [])
            .map((i: { productId: string | null; productName: string }) => i.productId ?? i.productName)
            .filter(Boolean),
    ).size;

    return (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3.5 dark:border-amber-500/25 dark:bg-amber-500/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                        <p className="text-[14px] font-semibold text-amber-900 dark:text-amber-100">
                            {count} supply {count === 1 ? "line" : "lines"} expiring within {DEFAULT_DAYS} days
                        </p>
                        <p className="mt-0.5 text-[13px] text-amber-800/80 dark:text-amber-200/80">
                            {uniqueProducts} {uniqueProducts === 1 ? "product" : "products"} affected. Review stock before items expire.
                        </p>
                    </div>
                </div>
                <Link
                    href="/dashboard/inventory"
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
                >
                    View inventory
                </Link>
            </div>
        </div>
    );
}
