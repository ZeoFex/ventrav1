"use client";

import { nanoid } from "nanoid";
import { GHANA_REGIONS } from "./constants";
import { field, fieldSelect } from "./onboarding-input-classes";
import type { OnboardingData, BranchData } from "./types";

type SetData = React.Dispatch<React.SetStateAction<OnboardingData>>;

const labelClass = "text-[13px] font-medium text-muted-foreground";

function StepCaption({ text }: { text: string | null }) {
  if (!text) return null;
  return <p className={labelClass}>{text}</p>;
}

export function MultiBranchStepContent({
  formStepLabel,
  data,
  setData,
}: {
  formStepLabel: string | null;
  data: OnboardingData;
  setData: SetData;
}) {
  const addBranch = () => {
    setData((d) => ({
      ...d,
      branches: [
        ...d.branches,
        { id: nanoid(6), name: "", region: "", isMain: false },
      ],
    }));
  };

  const updateBranch = (id: string, updates: Partial<BranchData>) => {
    setData((d) => ({
      ...d,
      branches: d.branches.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
  };

  const removeBranch = (id: string) => {
    setData((d) => ({
      ...d,
      branches: d.branches.filter((b) => b.id !== id),
    }));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <StepCaption text={formStepLabel} />
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Branches & Outlets
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          You're growing! Add all your branch locations. Each branch acts as a separate
          outlet for point-of-sale, inventory, and staff assignment.
        </p>
      </div>

      <div className="space-y-4">
        {data.branches.map((branch, index) => (
          <div
            key={branch.id}
            className="flex flex-col sm:flex-row gap-4 rounded-xl border border-[#bfc9c3]/30 bg-surface-card p-4 dark:border-white/[0.12] dark:bg-[#111]"
          >
            <div className="flex-1 space-y-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                  {branch.isMain ? "Main Branch Name" : `Branch ${index + 1} Name`}
                </label>
                <input
                  value={branch.name}
                  onChange={(e) => updateBranch(branch.id, { name: e.target.value })}
                  placeholder={branch.isMain ? "e.g. Headquarters" : "e.g. Kumasi Mall"}
                  className={field}
                />
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                  Region
                </label>
                <select
                  value={branch.region}
                  onChange={(e) => updateBranch(branch.id, { region: e.target.value })}
                  className={fieldSelect}
                >
                  <option value="">Select region</option>
                  {GHANA_REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {!branch.isMain && (
              <div className="flex items-end pb-1">
                <button
                  type="button"
                  onClick={() => removeBranch(branch.id)}
                  className="flex size-10 items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                  title="Remove branch"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addBranch}
        className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-[#bfc9c3]/50 bg-transparent px-4 py-3.5 text-[14px] font-medium text-foreground hover:bg-[#003527]/5 hover:border-[#006c49]/50 transition-colors dark:border-white/[0.15] dark:hover:bg-[#6ffbbe]/10"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Add another branch
      </button>
    </div>
  );
}
