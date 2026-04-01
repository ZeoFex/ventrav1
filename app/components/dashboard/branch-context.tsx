"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useSWRConfig } from "swr";

type BranchContextType = {
    branchId: string;
    setBranchId: (id: string) => void;
};

const BranchContext = createContext<BranchContextType>({
    branchId: "all",
    setBranchId: () => { },
});

export function useBranchContext() {
    return useContext(BranchContext);
}

function getCookie(name: string): string {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : "all";
}

function setCookie(name: string, value: string) {
    document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
}

export function BranchProvider({ children }: { children: ReactNode }) {
    const [branchId, _setBranchId] = useState<string>(() => {
        if (typeof window === "undefined") return "all";
        return getCookie("__ventra_branch") || "all";
    });

    const { mutate } = useSWRConfig();

    const setBranchId = useCallback(
        (id: string) => {
            _setBranchId(id);
            setCookie("__ventra_branch", id);
            // Revalidate every SWR key so all data refetches for the new branch
            mutate(() => true, undefined, { revalidate: true });
        },
        [mutate]
    );

    return (
        <BranchContext.Provider value={{ branchId, setBranchId }}>
            {children}
        </BranchContext.Provider>
    );
}
