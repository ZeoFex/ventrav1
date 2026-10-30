export type PlanId = "starter" | "growth" | "pro";

/** Max active branches per subscription tier (enforced on branch create). */
export const MAX_BRANCHES_BY_PLAN: Record<PlanId, number> = {
  starter: 1,
  growth: 5,
  pro: 5,
};

/** Monthly add-on price per admin-granted extra branch (GHS). */
export const BRANCH_ADDON_PRICE_MONTHLY_GHS = 50;

export function getEffectiveMaxBranches(
  plan: PlanId,
  paidExtraBranches = 0,
): number {
  return (MAX_BRANCHES_BY_PLAN[plan] ?? 1) + Math.max(0, paidExtraBranches);
}

export function getBranchAddonPriceGhs(
  paidExtraBranches: number,
  cycle: "monthly" | "annually",
): number {
  const monthly = BRANCH_ADDON_PRICE_MONTHLY_GHS * Math.max(0, paidExtraBranches);
  return cycle === "monthly" ? monthly : monthly * 12;
}

/** Free trial length for Growth and Pro signups (days). */
export const PREMIUM_TRIAL_DAYS = 14;

/** @deprecated Starter is free forever — no trial period. Kept for legacy session fallbacks. */
export const STARTER_TRIAL_DAYS = 0;

export interface Plan {
  id: PlanId;
  name: string;
  badge?: string;
  description: string;
  bestFor: string;
  priceMonthly: number;
  priceAnnually: number;
  highlighted: boolean;
  trialDays: number;
  features: string[];
  /** Not a self-serve package. The card asks the shop to hire VentraPOS or commission a custom build. */
  custom?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    badge: "Free Forever",
    description:
      "Digital POS for small shops — free, no monthly fee.",
    bestFor: "Small businesses moving from manual records to digital operations.",
    priceMonthly: 0,
    priceAnnually: 0,
    highlighted: false,
    trialDays: 0,
    features: [
      "1 branch",
      "POS checkout",
      "Digital receipts",
      "Product catalog",
      "View current stock quantities",
      "Basic stock increase/decrease tracking",
      "Up to 2 staff accounts",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    badge: "Most Popular",
    description: "The full VentraPOS toolkit for growing shops, including register controls and approvals.",
    bestFor: "Growing SMEs that need the complete shop system, reporting, and branch management.",
    priceMonthly: 249,
    priceAnnually: 2490,
    highlighted: true,
    trialDays: PREMIUM_TRIAL_DAYS,
    features: [
      "Everything in Starter",
      "Customer management",
      "Supplier management",
      "Expense tracking",
      "Sales reports",
      "Inventory reports",
      "Profit and loss summaries",
      "Barcode support",
      "Expiry and batch tracking",
      "Refunds and returns",
      "Up to 5 branches",
      "Stock transfers between branches",
      "Advanced staff roles and permissions",
      "Cashier performance tracking",
      "Business analytics",
      "Zuri assistant",
      "Cash reconciliation",
      "Approval workflows",
      "Restricted discounts",
      "Register open and close",
      "Multi-terminal POS",
      "Z-reports and audit logs",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Custom",
    description:
      "Hire VentraPOS to run the system with you, or let us build a custom one for your business.",
    bestFor: "Shops that want a team on the ground, or a system built around how they work.",
    priceMonthly: 0,
    priceAnnually: 0,
    highlighted: false,
    trialDays: 0,
    custom: true,
    features: [
      "Hire our team to set up and run VentraPOS with you",
      "Or we build a custom system for your shop",
    ],
  },
];

export function isValidPlanId(value: string): value is PlanId {
  return value === "starter" || value === "growth" || value === "pro";
}

export function getPlanById(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}

export function getPlanSignupLabel(planId: PlanId): string {
  const plan = getPlanById(planId);
  if (plan.custom) return `${plan.name} — Custom`;
  if (planId === "starter") return `${plan.name} — Free Forever`;
  return `${plan.name} — ${plan.trialDays}-Day Free Trial`;
}

export function getPlanCtaLabel(planId: PlanId): string {
  if (planId === "starter") return "Get Started Free";
  if (planId === "growth") return "Start Growth Trial";
  return "Talk to us";
}

export function planHasTrialCountdown(planId: PlanId): boolean {
  return planId === "growth";
}
