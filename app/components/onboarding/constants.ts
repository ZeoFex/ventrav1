import type { BusinessTypeId, OnboardingData, StoreStructure } from "./types";

export const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Volta",
  "Northern",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
  "Oti",
  "Savannah",
  "North East",
  "Western North",
] as const;

export const BUSINESS_TYPES: {
  id: BusinessTypeId;
  label: string;
  hint: string;
}[] = [
    { id: "retail", label: "Retail", hint: "General goods" },
    { id: "restaurant", label: "Restaurant", hint: "Food & drink" },
    { id: "pharmacy", label: "Pharmacy", hint: "Health & wellness" },
    { id: "supermarket", label: "Supermarket", hint: "Groceries at scale" },
    { id: "mini_mart", label: "Mini mart", hint: "Neighbourhood shop" },
    { id: "boutique", label: "Boutique", hint: "Fashion & specialty" },
    { id: "electronics", label: "Electronics", hint: "Phones & gadgets" },
    { id: "other", label: "Other", hint: "We’ll adapt defaults" },
  ];

/** Fixed prefix through structure (before branching). */
export const ONBOARDING_PREFIX = [
  "welcome",
  "business-type",
  "store-name",
  "profile",
  "contact",
  "address",
  "money",
  "brand",
  "hours",
  "structure",
] as const;

export const BRANCH_STEP_IDS = [
  "branches",
] as const;

export type BranchStepId = (typeof BRANCH_STEP_IDS)[number];

export function isBranchStepId(id: string): id is BranchStepId {
  return (BRANCH_STEP_IDS as readonly string[]).includes(id);
}

export type OnboardingStepId =
  | (typeof ONBOARDING_PREFIX)[number]
  | BranchStepId
  | "billing"
  | "checklist"
  | "guided"
  | "complete";

/** Dynamic list: after `structure`, multi-branch adds branch steps, then checklist → guided → complete. */
export function buildOnboardingSteps(structure: StoreStructure, plan: string): string[] {
  const prefix = [...ONBOARDING_PREFIX];
  const tail: string[] = [];
  if (structure === "multi") {
    tail.push(...BRANCH_STEP_IDS);
  }
  
  // Only require billing if not on the Starter (Free Trial) plan
  if (plan !== "starter") {
    tail.push("billing");
  }
  
  tail.push("checklist", "guided", "complete");
  return [...prefix, ...tail];
}

/** Label for form steps (excludes welcome + complete). */
export function getFormStepLabel(
  steps: string[],
  stepIndex: number,
): string | null {
  const id = steps[stepIndex];
  if (!id || id === "welcome" || id === "complete") return null;
  const formSteps = steps.filter((s) => s !== "welcome" && s !== "complete");
  const total = formSteps.length;
  const pos = formSteps.indexOf(id);
  if (pos < 0) return null;
  return `Step ${pos + 1} of ${total}`;
}

export function canProceedStep(
  stepId: string | undefined,
  data: OnboardingData,
): boolean {
  if (!stepId) return false;
  switch (stepId) {
    case "welcome":
      return true;
    case "business-type":
      return data.businessType != null;
    case "store-name":
      return data.storeName.trim().length > 0;
    case "profile":
      return data.legalName.trim().length > 0;
    case "contact":
      return (
        data.phone.trim().length > 0 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
      );
    case "address":
      return (
        data.addressLine.trim().length > 0 &&
        data.city.trim().length > 0 &&
        data.region.length > 0
      );
    case "money":
      if (!data.taxRegistered) return true;
      if (!data.taxRate.trim()) return false;
      const n = parseFloat(data.taxRate.replace(",", "."));
      return !Number.isNaN(n) && n >= 0 && n <= 100;
    case "brand":
    case "hours":
      return true;
    case "structure":
      return data.structure != null;
    case "branches":
      return (
        data.branches.length > 0 &&
        data.branches.every((b) => b.name.trim().length > 0 && b.region.length > 0)
      );
    case "billing":
      return data.billingComplete;
    case "checklist":
    case "guided":
      return true;
    default:
      return true;
  }
}
