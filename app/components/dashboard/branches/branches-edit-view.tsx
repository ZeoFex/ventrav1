"use client";

import { BranchForm, type BranchFormInitialValues } from "./branch-form";
import { useBranch } from "./branches-data-hooks";

export function BranchesEditView({ branchId }: { branchId: string }) {
    const { branch, isLoading } = useBranch(branchId);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <div className="size-8 animate-spin rounded-full border-4 border-[#006c49]/20 border-t-[#006c49] dark:border-[#6ffbbe]/20 dark:border-t-[#6ffbbe]" />
            </div>
        );
    }

    if (!branch) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <h2 className="text-xl font-bold">Branch not found</h2>
            </div>
        );
    }

    const initial: BranchFormInitialValues = {
        name: branch.name,
        region: branch.region || "",
        managerNote: branch.phone || "", // Mapping phone/address as manager notes for now based on UI expectation
        status: branch.status || "active",
        isMain: branch.isMain || false,
    };

    return (
        <BranchForm
            mode="edit"
            branchId={branchId}
            initial={initial}
            title={`Manage ${branch.name}`}
            shellDescription="Update location settings and operational status."
        />
    );
}
