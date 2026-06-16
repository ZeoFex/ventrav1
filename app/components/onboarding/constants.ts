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

/** Shop types shown during onboarding (maps to shop_types.slug in the database). */
export const BUSINESS_TYPES: {
  id: BusinessTypeId;
  label: string;
  hint: string;
}[] = [
    { id: "pharmacy", label: "Pharmacy", hint: "Medicines & health products" },
    {
      id: "agrochemical_shop",
      label: "Agrochemical Shop",
      hint: "Fertilizers, pesticides & farm inputs",
    },
    {
      id: "building_construction",
      label: "Building & Construction Materials",
      hint: "Cement, steel, tiles & supplies",
    },
    {
      id: "boutique_fashion",
      label: "Boutique / Fashion Store",
      hint: "Clothing, shoes & accessories",
    },
    { id: "supermarket", label: "Supermarket", hint: "Groceries at scale" },
    { id: "cold_store", label: "Cold Store", hint: "Meat, fish & frozen goods" },
    {
      id: "electronics_store",
      label: "Electronics Store",
      hint: "Phones, laptops & gadgets",
    },
    { id: "hardware_store", label: "Hardware Store", hint: "Tools & building supplies" },
    {
      id: "stationery_bookshop",
      label: "Stationery & Bookshop",
      hint: "Books, office & school supplies",
    },
    { id: "furniture_store", label: "Furniture Store", hint: "Home & office furniture" },
    {
      id: "cosmetics_beauty",
      label: "Cosmetics & Beauty Shop",
      hint: "Makeup, skincare & grooming",
    },
    {
      id: "general_retail_store",
      label: "General Retail Store",
      hint: "Mixed goods & neighbourhood shop",
    },
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
