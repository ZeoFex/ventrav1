"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
    CatalogAdminMobileMenuButton,
    CatalogAdminSidebar,
    TAB_META,
} from "./catalog-admin-sidebar";
import type { TabId } from "./catalog-admin-types";

type Props = {
    tab: TabId;
    onTabChange: (tab: TabId) => void;
    totalProducts: number;
    shopTypeCount: number;
    mobileOpen: boolean;
    onMobileOpenChange: (open: boolean) => void;
    headerActions: ReactNode;
    children: ReactNode;
};

export function CatalogAdminShell({
    tab,
    onTabChange,
    totalProducts,
    shopTypeCount,
    mobileOpen,
    onMobileOpenChange,
    headerActions,
    children,
}: Props) {
    const meta = TAB_META[tab];

    return (
        <div className="min-h-dvh bg-[#f7f9fb] dark:bg-[#0a0a0a]">
            <CatalogAdminSidebar
                tab={tab}
                onTabChange={onTabChange}
                totalProducts={totalProducts}
                shopTypeCount={shopTypeCount}
                mobileOpen={mobileOpen}
                onMobileOpenChange={onMobileOpenChange}
            />

            <div className="flex min-h-dvh flex-col lg:pl-[17.5rem]">
                <header className="sticky top-0 z-20 border-b border-[#bfc9c3]/20 bg-surface-card/90 backdrop-blur-md dark:border-white/[0.08] dark:bg-[#0a0a0a]/90">
                    <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                                <CatalogAdminMobileMenuButton
                                    onClick={() => onMobileOpenChange(true)}
                                />
                                <div className="min-w-0 pt-0.5">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                        Platform
                                    </p>
                                    <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                        {meta.title}
                                    </h1>
                                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                        {meta.description}
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                {headerActions}
                            </div>
                        </div>
                    </div>
                </header>

                <main className={cn("flex-1 px-4 py-6 sm:px-6 lg:px-8")}>{children}</main>
            </div>
        </div>
    );
}
