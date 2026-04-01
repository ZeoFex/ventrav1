"use client";

import { ReactNode } from "react";
import { SWRConfig } from "swr";

export function SalesOverviewSWRProvider({
    fallback,
    children
}: {
    fallback: any;
    children: ReactNode;
}) {
    return (
        <SWRConfig value={{
            fallback,
            refreshInterval: 30000, // 30s background refresh
            revalidateOnFocus: true,
            dedupingInterval: 5000,
        }}>
            {children}
        </SWRConfig>
    );
}
