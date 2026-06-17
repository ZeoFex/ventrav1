export type PlanId = "starter" | "growth" | "pro";

/** Max active branches per subscription tier (enforced on branch create). */
export const MAX_BRANCHES_BY_PLAN: Record<PlanId, number> = {
  starter: 1,
  growth: 3,
  pro: 5,
};

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
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    badge: "Free Forever",
    description:
      "Move from manual records to a clean digital POS — at no monthly cost.",
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
    description:
      "Better control, reporting, and branch management for growing SMEs.",
    bestFor: "Growing SMEs that need better control, reporting, and branch management.",
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
      "Refunds and returns",
      "Up to 3 branches",
      "Stock transfers between branches",
      "Advanced staff roles and permissions",
      "Cashier performance tracking",
      "Business analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description:
      "Full operating system with governance, AI, and multi-branch scale.",
    bestFor: "Serious supermarkets, pharmacies, and multi-branch businesses.",
    priceMonthly: 349,
    priceAnnually: 3490,
    highlighted: false,
    trialDays: PREMIUM_TRIAL_DAYS,
    features: [
      "Everything in Growth",
      "Up to 5 branches",
      "Zuri AI Assistant",
      "Audit logs",
      "Cash reconciliation",
      "Approval workflows",
      "Restricted discounts",
      "Register open/close controls",
      "Expiry and batch tracking",
      "Multi-terminal POS support",
      "Priority support",
      "Assisted onboarding",
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
  if (planId === "starter") return `${plan.name} — Free Forever`;
  return `${plan.name} — ${plan.trialDays}-Day Free Trial`;
}

export function getPlanCtaLabel(planId: PlanId): string {
  if (planId === "starter") return "Get Started Free";
  if (planId === "growth") return "Start Growth Trial";
  return "Start Pro Trial";
}

export function planHasTrialCountdown(planId: PlanId): boolean {
  return planId === "growth" || planId === "pro";
}
