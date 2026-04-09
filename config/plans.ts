export type PlanId = "starter" | "growth" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  bestFor: string;
  priceMonthly: number;
  priceAnnually: number;
  highlighted: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Includes a 14-Day Free Trial to help your business move from manual processes into a clean digital operating flow.",
    bestFor: "Single-location SMEs, mini marts, small pharmacies, boutiques.",
    priceMonthly: 149,
    priceAnnually: 1490,
    highlighted: false,
    features: [
      "14-Day Free Trial",
      "1 branch & store setup",
      "POS checkout & digital receipts",
      "Product & stock tracking",
      "Basic staff roles & customer records",
      "Expense tracking & basic reports",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description: "Move from simple digital operations into structured operational management.",
    bestFor: "Growing SMEs with multiple branches or active supermarkets.",
    priceMonthly: 249,
    priceAnnually: 2490,
    highlighted: true,
    features: [
      "Everything in Starter, plus:",
      "Multiple branches with stock transfers",
      "Branch-level inventory & reporting",
      "More staff accounts & advanced roles",
      "Barcode support, refunds & returns",
      "Cashier performance & deeper reports",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "A more advanced operating system with stronger governance and insight.",
    bestFor: "Serious supermarkets, multi-branch groups, busy pharmacies.",
    priceMonthly: 399,
    priceAnnually: 3990,
    highlighted: false,
    features: [
      "Everything in Growth, plus:",
      "Audit logs & cash reconciliation",
      "Approval workflows & restricted discounts",
      "Register open/close controls",
      "Expiry & batch tracking",
      "Multi-terminal POS support",
      "Priority & assisted onboarding",
    ],
  },
];
