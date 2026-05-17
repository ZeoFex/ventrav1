"use client";

import { Check, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { GHANA_REGIONS } from "@/app/components/onboarding/constants";
import type { BranchStatus } from "./branches-mock-data";

export type BranchFormInitialValues = {
    name: string;
    region: string;
    managerNote: string;
    status: BranchStatus;
    isMain: boolean;
};

const defaultInitial: BranchFormInitialValues = {
    name: "",
    region: "",
    managerNote: "",
    status: "active",
    isMain: false,
};

export function BranchForm({
    mode,
    branchId,
    initial = defaultInitial,
    title,
    shellDescription,
}: {
    mode: "new" | "edit";
    branchId: string;
    initial?: BranchFormInitialValues;
    title: string;
    shellDescription: string;
}) {
    const router = useRouter();
    const [data, setData] = useState<BranchFormInitialValues>(initial);
    const [isSaving, setIsSaving] = useState(false);

    const isValid = data.name.trim().length > 0 && data.region !== "";

    async function handleSave() {
        if (!isValid) return;
        setIsSaving(true);

        try {
            const endpoint = mode === "new" ? "/api/branches" : `/api/branches/${branchId}`;
            const method = mode === "new" ? "POST" : "PUT";

            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const payload = await res.json().catch(() => ({}));

            if (!res.ok) {
                const msg =
                    typeof payload?.error === "string"
                        ? payload.error
                        : "Failed to save branch";
                toast.error(msg);
                setIsSaving(false);
                return;
            }

            // Option to mutate global SWR cache before redirect
            const { mutate } = await import("swr");
            mutate("/api/branches");

            router.push("/dashboard/branches");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong. Try again.");
            setIsSaving(false);
        }
    }

    return (
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2">
                    <Link
                        href="/dashboard/branches"
                        className="tap-target inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ChevronLeft className="size-4" strokeWidth={2} />
                        Back to Branches
                    </Link>
                    <div>
                        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-foreground">
                            {title}
                        </h1>
                        <p className="mt-1 text-[14px] text-muted-foreground">
                            {shellDescription}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    disabled={!isValid || isSaving}
                    onClick={handleSave}
                    className="tap-target inline-flex items-center justify-center gap-2 rounded-full bg-[#006c49] px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#006c49] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground dark:bg-[#6ffbbe] dark:text-[#003527] dark:focus:ring-[#6ffbbe] dark:focus:ring-offset-[#111] dark:disabled:bg-white/[0.05]"
                >
                    {isSaving ? (
                        <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white dark:border-[#003527]/20 dark:border-t-[#003527]" />
                    ) : (
                        <Check className="size-4" strokeWidth={2.5} aria-hidden />
                    )}
                    {isSaving ? "Saving..." : "Save Branch"}
                </button>
            </div>

            {/* Form Content */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                <div className="flex min-w-0 flex-1 flex-col gap-6">

                    {/* Main Info Box */}
                    <div className="rounded-2xl border border-[#eef0f2] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111]">
                        <h2 className="mb-4 text-[15px] font-semibold text-foreground">
                            Branch details
                        </h2>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                                    Branch Name
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData({ ...data, name: e.target.value })}
                                    placeholder="e.g. East Legon Flagship"
                                    className="w-full rounded-xl border border-[#e5e7eb] bg-transparent px-3.5 py-2.5 text-[14px] text-foreground transition-colors placeholder:text-muted-foreground focus:border-[#006c49] focus:outline-none focus:ring-1 focus:ring-[#006c49] dark:border-white/[0.12] dark:focus:border-[#6ffbbe] dark:focus:ring-[#6ffbbe]"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                                    Region
                                </label>
                                <select
                                    value={data.region}
                                    onChange={(e) => setData({ ...data, region: e.target.value })}
                                    className="w-full rounded-xl border border-[#e5e7eb] bg-transparent px-3.5 py-2.5 text-[14px] text-foreground transition-colors focus:border-[#006c49] focus:outline-none focus:ring-1 focus:ring-[#006c49] dark:border-white/[0.12] dark:focus:border-[#6ffbbe] dark:focus:ring-[#6ffbbe]"
                                >
                                    <option value="" disabled className="dark:bg-[#111]">Select region</option>
                                    {GHANA_REGIONS.map((r) => (
                                        <option key={r} value={r} className="dark:bg-[#111]">
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                                    Manager Contact
                                </label>
                                <input
                                    type="text"
                                    value={data.managerNote}
                                    onChange={(e) => setData({ ...data, managerNote: e.target.value })}
                                    placeholder="e.g. Kwame - 0244123456"
                                    className="w-full rounded-xl border border-[#e5e7eb] bg-transparent px-3.5 py-2.5 text-[14px] text-foreground transition-colors placeholder:text-muted-foreground focus:border-[#006c49] focus:outline-none focus:ring-1 focus:ring-[#006c49] dark:border-white/[0.12] dark:focus:border-[#6ffbbe] dark:focus:ring-[#6ffbbe]"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="flex w-full shrink-0 flex-col gap-6 lg:w-[320px] xl:w-[360px]">
                    {mode === "edit" && (
                        <div className="rounded-2xl border border-[#eef0f2] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111]">
                            <h2 className="mb-4 text-[15px] font-semibold text-foreground">
                                Settings
                            </h2>
                            <div className="flex flex-col gap-5">

                                {/* Status Toggle */}
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[14px] font-medium text-foreground">Operational Status</span>
                                        <span className="text-[12px] text-muted-foreground">Is this branch active?</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setData({
                                                ...data,
                                                status: data.status === "active" ? "inactive" : "active",
                                            })
                                        }
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#006c49] focus:ring-offset-2 dark:focus:ring-[#6ffbbe] dark:focus:ring-offset-[#111] ${data.status === "active" ? "bg-[#006c49] dark:bg-[#6ffbbe]" : "bg-neutral-200 dark:bg-white/[0.15]"
                                            }`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out dark:bg-[#003527] ${data.status === "active" ? "translate-x-5" : "translate-x-0"
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Main Branch Toggle */}
                                <div className="flex items-center justify-between gap-4 border-t border-[#f0f2f4] pt-5 dark:border-white/[0.06]">
                                    <div className="flex flex-col">
                                        <span className="text-[14px] font-medium text-foreground">Main Branch</span>
                                        <span className="text-[12px] text-muted-foreground">Flag as HQ</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setData({ ...data, isMain: !data.isMain })}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#006c49] focus:ring-offset-2 dark:focus:ring-[#6ffbbe] dark:focus:ring-offset-[#111] ${data.isMain ? "bg-[#006c49] dark:bg-[#6ffbbe]" : "bg-neutral-200 dark:bg-white/[0.15]"
                                            }`}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out dark:bg-[#003527] ${data.isMain ? "translate-x-5" : "translate-x-0"
                                                }`}
                                        />
                                    </button>
                                </div>

                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
