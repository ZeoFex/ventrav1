"use client";

import { useId } from "react";
import { BranchForm } from "./branch-form";

export function BranchesNewView() {
    const branchId = `new-br-${useId()}`; // Using unique mock ID

    return (
        <BranchForm
            mode="new"
            branchId={branchId}
            title="Add new branch"
            shellDescription="Setup a new retail or backend location."
        />
    );
}
