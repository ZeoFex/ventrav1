"use client";

import Link from "next/link";
import useSWR from "swr";
import { Loader2, Pencil } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { DASHBOARD_NAV_ITEMS } from "../sidebar/dashboard-nav-config";

const fetcher = (url: string) =>
    fetch(url).then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
    });

function resolvePermissionLabels(keys: string[]): string[] {
    const labels: string[] = [];
    for (const item of DASHBOARD_NAV_ITEMS) {
        if (keys.includes(item.id)) labels.push(item.label);
        for (const child of item.children ?? []) {
            if (keys.includes(child.id)) labels.push(child.label);
        }
    }
    const known = new Set(labels);
    for (const key of keys) {
        if (!known.has(key)) labels.push(key);
    }
    return labels;
}

function formatStatus(status: string): string {
    if (status === "active") return "Active";
    if (status === "suspended") return "Suspended";
    if (status === "deactivated") return "Inactive";
    if (status === "pending_verification") return "Pending";
    return status;
}

export function StaffDetailView({ staffId }: { staffId: string }) {
    const { data: staff, isLoading, error } = useSWR(
        staffId ? `/api/staff/${staffId}` : null,
        fetcher,
    );

    if (isLoading) {
        return (
            <ProductsPageShell title="Staff member" description="">
                <div className="flex min-h-[40vh] items-center justify-center">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
            </ProductsPageShell>
        );
    }

    if (error || !staff || staff.error) {
        return (
            <ProductsPageShell title="Staff member" description="">
                <p className="text-muted-foreground">Could not load this staff member.</p>
                <Link href="/dashboard/staff" className="mt-4 inline-block text-[#006c49] underline">
                    Back to staff
                </Link>
            </ProductsPageShell>
        );
    }

    const displayName = staff.name?.trim() || `${staff.firstName} ${staff.lastName ?? ""}`.trim();
    const permissionLabels = resolvePermissionLabels(staff.permissionKeys ?? []);

    return (
        <ProductsPageShell
            title={displayName}
            description="Staff profile and access permissions."
            actions={
                <Link
                    href={`/dashboard/staff/${staffId}/edit`}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#eef0f2] px-4 py-2.5 text-[14px] font-semibold dark:border-white/10"
                >
                    <Pencil className="size-4" />
                    Edit
                </Link>
            }
        >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                    <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-5">
                        {staff.imageSrc ? (
                            <img
                                src={staff.imageSrc}
                                alt={displayName}
                                className="size-24 shrink-0 rounded-full object-cover border border-[#eef0f2] dark:border-white/10"
                            />
                        ) : (
                            <div className="flex size-24 shrink-0 items-center justify-center rounded-full bg-[#006c49]/10 text-3xl font-bold text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                                {(displayName || "?").charAt(0)}
                            </div>
                        )}
                        <div className="mt-4 sm:mt-0 min-w-0">
                            <h2 className="text-xl font-semibold text-foreground">{displayName}</h2>
                            <span
                                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    staff.status === "active"
                                        ? "bg-[#006c49]/12 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]"
                                        : "bg-muted text-muted-foreground"
                                }`}
                            >
                                {formatStatus(staff.status)}
                            </span>
                        </div>
                    </div>

                    <dl className="mt-6 space-y-4">
                        <div>
                            <dt className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Phone</dt>
                            <dd className="mt-1 text-[15px] text-foreground">{staff.phone || "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Role</dt>
                            <dd className="mt-1 text-[15px] text-foreground">{staff.roleName}</dd>
                        </div>
                        <div>
                            <dt className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Branch</dt>
                            <dd className="mt-1 text-[15px] text-foreground">{staff.branchName || "—"}</dd>
                        </div>
                    </dl>
                </div>

                <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                    <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Permissions
                    </h2>
                    {permissionLabels.length === 0 ? (
                        <p className="mt-4 text-[14px] text-muted-foreground">
                            No permissions assigned to this role.
                        </p>
                    ) : (
                        <ul className="mt-4 flex flex-wrap gap-2">
                            {permissionLabels.map((label) => (
                                <li
                                    key={label}
                                    className="rounded-full bg-[#e5e7eb]/80 px-3 py-1 text-[12px] font-medium text-foreground dark:bg-white/[0.08]"
                                >
                                    {label}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </ProductsPageShell>
    );
}
