"use client";

import { MapPin, MonitorSmartphone, MoreHorizontal, Store, User } from "lucide-react";
import Link from "next/link";
import { useBranches } from "./branches-data-hooks";

export function BranchesList() {
    const { branches, isLoading } = useBranches();

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 rounded-2xl bg-surface-elevated/40" />
                ))}
            </div>
        );
    }

    const safeBranches = branches || [];

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
            {safeBranches.map((branch: any) => (
                <BranchCard key={branch.id} branch={branch} />
            ))}

            {/* Add New Branch Affordance */}
            <Link
                href="/dashboard/branches/new"
                className="group tap-target flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#eef0f2] bg-transparent p-6 transition-colors hover:border-[#006c49]/40 hover:bg-[#006c49]/5 dark:border-white/[0.08] dark:hover:border-[#6ffbbe]/40 dark:hover:bg-[#6ffbbe]/5"
            >
                <div className="flex size-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#1a1a1a]">
                    <Store className="size-5 text-muted-foreground transition-colors group-hover:text-[#006c49] dark:group-hover:text-[#6ffbbe]" strokeWidth={2} />
                </div>
                <div className="text-center">
                    <p className="text-[14px] font-semibold text-foreground">Add New Branch</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">Set up a new retail location</p>
                </div>
            </Link>
        </div>
    );
}

export interface Branch {
    id: string;
    name: string;
    region?: string | null;
    managerNote?: string | null;
    status: "active" | "inactive";
    isMain: boolean;
    totalDevices?: number; // Might not come from db yet, optional
}

function BranchCard({ branch }: { branch: Branch }) {
    const isActive = branch.status === "active";

    return (
        <article className="flex flex-col overflow-hidden rounded-2xl border border-[#eef0f2] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:border-white/[0.08] dark:bg-[#111] dark:hover:border-white/[0.15]">
            <div className="flex items-start justify-between gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f4f5] dark:bg-[#1a1a1a]">
                    <Store className="size-[18px] text-foreground" strokeWidth={2} aria-hidden />
                </div>
                <button
                    type="button"
                    className="tap-target -mr-2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground dark:hover:bg-white/[0.05]"
                    aria-label="Branch options"
                >
                    <MoreHorizontal className="size-4" strokeWidth={2} />
                </button>
            </div>

            <div className="mt-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <h3 className="font-[family-name:var(--font-display)] text-[16px] font-semibold tracking-tight text-foreground line-clamp-1">
                        {branch.name}
                    </h3>
                    {branch.isMain && (
                        <span className="shrink-0 rounded-full bg-[#006c49]/10 px-2.py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]">
                            Main
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <MapPin className="size-3.5" strokeWidth={2.5} />
                    <span className="truncate">{branch.region} Region</span>
                </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 rounded-xl border border-[#f0f2f4] bg-[#fafafa] p-3.5 dark:border-white/[0.06] dark:bg-[#141414]">
                <div className="flex items-center justify-between gap-3 text-[13px]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="size-3.5 shrink-0" strokeWidth={2} />
                        <span className="truncate">Contact</span>
                    </div>
                    <span className="truncate font-medium text-foreground">
                        {branch.managerNote || "—"}
                    </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-[13px]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <MonitorSmartphone className="size-3.5 shrink-0" strokeWidth={2} />
                        <span>Registers</span>
                    </div>
                    <span className="font-semibold tabular-nums text-foreground">
                        {branch.totalDevices} active
                    </span>
                </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                    <span
                        className={`size-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-neutral-400 dark:bg-neutral-600"
                            }`}
                    />
                    {isActive ? "Operational" : "Offline"}
                </span>
                <Link
                    href={`/dashboard/branches/${branch.id}/edit`}
                    className="tap-target text-[13px] font-semibold text-[#006c49] transition-colors hover:text-[#004d34] dark:text-[#6ffbbe] dark:hover:text-[#4de9a4]"
                >
                    Manage
                </Link>
            </div>
        </article>
    );
}
