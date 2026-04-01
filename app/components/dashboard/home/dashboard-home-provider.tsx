"use client";

import { ReactNode } from "react";
import { SWRConfig } from "swr";

export function DashboardHomeSWRProvider({
    fallback,
    children
}: {
    fallback: any;
    children: ReactNode;
}) {
    return (
        <SWRConfig value={{
            fallback,
            refreshInterval: 10000, // 10s silent background refresh
            revalidateOnFocus: true,
            dedupingInterval: 5000,
        }}>
            {children}
        </SWRConfig>
    );
}
