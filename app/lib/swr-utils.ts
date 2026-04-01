"use client";

import { preload } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Prefetches data for a specific dashboard API route to warm the SWR cache.
 * Useful for onMouseEnter events on navigation links.
 */
export function prefetchDashboardData(route: "/api/dashboard/home" | "/api/sales/overview") {
    preload(route, fetcher);
}
