"use client";

import { nanoid } from "nanoid";
import { MAX_BRANCHES_BY_PLAN, type PlanId } from "@/config/plans";
import { BUSINESS_TYPES } from "./constants";
import { GHANA_REGIONS } from "./constants";
import { field, fieldSelect } from "./onboarding-input-classes";
import type { BusinessTypeId, OnboardingData, BranchData } from "./types";

type SetData = React.Dispatch<React.SetStateAction<OnboardingData>>;

const labelClass = "text-[13px] font-medium text-muted-foreground";

function StepCaption({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-[#003527]/8 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
      {text}
    </span>
  );
}

function ShopTypePicker({
  value,
  onChange,
}: {
  value: BusinessTypeId | null;
  onChange: (id: BusinessTypeId) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {BUSINESS_TYPES.map((type) => {
        const selected = value === type.id;
        return (
          <button
            key={type.id}
            type="button"
            onClick={() => onChange(type.id)}
            className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
              selected
                ? "border-[#006c49]/40 bg-[#003527]/10 ring-2 ring-[#006c49] dark:bg-[#6ffbbe]/10 dark:ring-[#6ffbbe]"
                : "border-[#bfc9c3]/35 bg-surface-card hover:border-[#95d3ba]/50 dark:border-white/[0.12] dark:bg-[#141414]"
            }`}
          >
            <p className="text-[14px] font-medium text-foreground">{type.label}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{type.hint}</p>
          </button>
        );
      })}
    </div>
  );
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
  const maxBranches = MAX_BRANCHES_BY_PLAN[data.plan as PlanId] ?? 1;
  const atLimit = data.branches.length >= maxBranches;
  const planLabel = data.plan === "growth" ? "Growth" : data.plan === "pro" ? "Pro" : "Starter";

  const addBranch = () => {
    if (atLimit) return;
    setData((d) => ({
      ...d,
      branches: [
        ...d.branches,
        {
          id: nanoid(6),
          name: "",
          region: "",
          shopType: d.businessType,
          isMain: false,
        },
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
      <div className="rounded-2xl border border-[#95d3ba]/30 bg-gradient-to-br from-[#003527]/5 to-transparent p-5 dark:border-[#6ffbbe]/20 dark:from-[#6ffbbe]/5">
        <StepCaption text={formStepLabel} />
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Branches & Outlets
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          Add each location you operate. Pick a shop type per branch so we seed the right
          product categories for that outlet.
        </p>
        <p className="mt-3 text-[13px] font-medium text-[#006c49] dark:text-[#6ffbbe]">
          {planLabel} plan · up to {maxBranches} branch{maxBranches === 1 ? "" : "es"} ·{" "}
          {data.branches.length}/{maxBranches} used
        </p>
      </div>

      <div className="space-y-5">
        {data.branches.map((branch, index) => (
          <div
            key={branch.id}
            className="overflow-hidden rounded-2xl border border-[#bfc9c3]/30 bg-surface-card shadow-sm dark:border-white/[0.12] dark:bg-[#111]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#bfc9c3]/20 bg-[#003527]/5 px-4 py-3 dark:border-white/[0.08] dark:bg-[#6ffbbe]/5">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-[#003527] text-[12px] font-bold text-white dark:bg-[#064e3b]">
                  {index + 1}
                </span>
                <p className="text-[14px] font-semibold text-foreground">
                  {branch.isMain ? "Main Branch" : `Branch ${index + 1}`}
                </p>
              </div>
              {!branch.isMain && (
                <button
                  type="button"
                  onClick={() => removeBranch(branch.id)}
                  className="rounded-lg px-2 py-1 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={`mb-1.5 block ${labelClass}`}>Branch name</label>
                  <input
                    value={branch.name}
                    onChange={(e) => updateBranch(branch.id, { name: e.target.value })}
                    placeholder={branch.isMain ? "e.g. Headquarters" : "e.g. Kumasi Mall"}
                    className={field}
                  />
                </div>
                <div>
                  <label className={`mb-1.5 block ${labelClass}`}>Region</label>
                  <select
                    value={branch.region}
                    onChange={(e) => updateBranch(branch.id, { region: e.target.value })}
                    className={fieldSelect}
                  >
                    <option value="">Select region</option>
                    {GHANA_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={`mb-2 block ${labelClass}`}>Shop type</label>
                <p className="mb-3 text-[13px] text-muted-foreground">
                  Categories for this branch are based on the shop type you choose.
                </p>
                <ShopTypePicker
                  value={branch.shopType}
                  onChange={(id) => updateBranch(branch.id, { shopType: id })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addBranch}
        disabled={atLimit}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#95d3ba]/50 bg-[#003527]/[0.03] px-4 py-3.5 text-[14px] font-medium text-foreground transition-colors hover:border-[#006c49]/50 hover:bg-[#003527]/5 disabled:cursor-not-allowed disabled:opacity-45 dark:border-[#6ffbbe]/30 dark:bg-[#6ffbbe]/5 dark:hover:bg-[#6ffbbe]/10"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        {atLimit
          ? `Maximum ${maxBranches} branches on ${planLabel} plan`
          : "Add another branch"}
      </button>
    </div>
  );
}
