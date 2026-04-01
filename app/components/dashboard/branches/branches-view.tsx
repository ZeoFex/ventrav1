"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { BranchesList } from "./branches-list";

export function BranchesView() {
    return (
        <div className="flex h-full flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-foreground">
                        Branches & Outlets
                    </h1>
                    <p className="text-[14px] text-muted-foreground">
                        Manage your store locations, registers, and branch managers.
                    </p>
                </div>

                <Link
                    href="/dashboard/branches/new"
                    className="tap-target inline-flex items-center justify-center gap-2 rounded-full bg-[#006c49] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-colors active:bg-[#005a3c] hover:bg-[#005a3c] dark:bg-[#6ffbbe] dark:text-[#003527] dark:active:bg-[#4de9a4] dark:hover:bg-[#4de9a4]"
                >
                    <Plus className="size-4" strokeWidth={2.5} aria-hidden />
                    New Branch
                </Link>
            </div>

            <div className="min-h-0 flex-1">
                <BranchesList />
            </div>
        </div>
    );
}
