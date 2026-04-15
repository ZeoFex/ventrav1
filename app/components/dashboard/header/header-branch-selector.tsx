"use client";

import { Building2, ChevronDown } from "lucide-react";
import { useId, useEffect } from "react";
import { useBranches } from "../branches/branches-data-hooks";
import { useBranchContext } from "../branch-context";
import { useSession } from "../../auth/use-session";

const fieldClass =
  "tap-target h-9 w-full min-w-0 max-w-full cursor-pointer appearance-none rounded-xl border border-[#bfc9c3]/25 bg-background py-2 pl-9 pr-9 text-[13px] font-medium text-foreground outline-none transition-[box-shadow,border-color] focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/15 sm:h-10 sm:min-w-[12rem] sm:max-w-[14rem] sm:text-[14px] dark:border-white/[0.1] dark:bg-[#141414] dark:focus:border-[#6ffbbe]/35 dark:focus:ring-[#6ffbbe]/10";

export function HeaderBranchSelector() {
  const id = useId();
  const { branches, isLoading: branchesLoading } = useBranches();
  const { branchId, setBranchId } = useBranchContext();
  const { user, isLoading: sessionLoading } = useSession();

  const isLoading = branchesLoading || sessionLoading;
  const isLocked = Boolean(user?.branchId);
  const hasSingleBranch = branches?.length === 1;
  const singleBranch = hasSingleBranch ? branches[0] : null;

  // Auto-select locked branch; single-branch businesses; drop stale IDs (e.g. cookie cleared but LS survived)
  useEffect(() => {
    if (isLoading || !branches || branches.length === 0) return;

    if (isLocked && user?.branchId && branchId !== user.branchId) {
      setBranchId(user.branchId);
      return;
    }

    const validIds = new Set(branches.map((b: { id: string }) => b.id));

    if (branches.length === 1 && branchId === "all") {
      setBranchId(branches[0].id);
      return;
    }

    if (branchId !== "all" && !validIds.has(branchId)) {
      setBranchId(branches.length === 1 ? branches[0].id : "all");
    }
  }, [branches, branchId, setBranchId, isLocked, user?.branchId, isLoading]);

  return (
    <div className={`relative w-full min-w-0 shrink-0 sm:w-auto sm:max-w-[14rem] ${isLocked ? "opacity-80" : ""}`}>
      <Building2
        className="pointer-events-none absolute left-3 top-1/2 size-[1.125rem] -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden
      />
      <label htmlFor={id} className="sr-only">
        Branch
      </label>
      {hasSingleBranch && singleBranch ? (
        <div className={`${fieldClass} flex items-center cursor-default`}>
          <span className="truncate">
            {singleBranch.name}
            {singleBranch.id === user?.branchId ? " (Assigned)" : ""}
          </span>
        </div>
      ) : (
        <>
          <select
            id={id}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className={`${fieldClass} ${isLocked ? "cursor-not-allowed bg-muted/30" : ""}`}
            disabled={isLoading || isLocked}
          >
            {!isLocked && <option value="all">All Branches</option>}
            {isLoading ? (
              <option value="" disabled>Loading branches...</option>
            ) : branches && branches.length > 0 ? (
              branches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.id === user?.branchId ? "(Assigned)" : ""}
                </option>
              ))
            ) : null}
          </select>
          {!isLocked && (
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
          )}
        </>
      )}
    </div>
  );
}

