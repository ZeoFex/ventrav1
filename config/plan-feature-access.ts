/**
 * VentraPOS — Plan-Based Feature Access Matrix
 *
 * SINGLE SOURCE OF TRUTH for sidebar gating, API guards, and upgrade prompts.
 * Aligned 1:1 with the compare table in app/components/landing/pricing.tsx.
 */

export type PlanId = "starter" | "growth" | "pro";

/** Feature id for Zuri in-dashboard assistant (`copilot` key; Pro-only). */
export const COPILOT_FEATURE_ID = "copilot" as const;

export const PLAN_LIMITS = {
  starter: { maxBranches: 1, maxStaff: 3, maxProducts: 500, maxTerminals: 1 },
  growth:  { maxBranches: 3, maxStaff: 15, maxProducts: 5000, maxTerminals: 3 },
  pro:     { maxBranches: 5, maxStaff: -1, maxProducts: -1, maxTerminals: -1 },
} as const;

export const PLAN_FEATURE_ACCESS: Record<PlanId, Record<string, boolean>> = {

  // ── STARTER ── 1 branch · basic POS · basic stock · basic reports
  starter: {
    "home": true,
    // POS (Checkout ✓, barcode ✗, register ✗)
    "pos": true, "new-sale": true, "held-sales": true, "customer-orders": true,
    "open-register": false, "pos-scan": false,
    // Sales (basic ✓)
    "sales": true, "sales-overview": true, "sales-transactions": true,
    "sales-revenue": false, "sales-profit": false,
    "sales-average-order-value": false, "sales-refunds": false,
    // Products (stock ✓, transfers ✗, expiry ✗)
    "products": true, "product-list": true, "categories": true,
    "tags": true, "stock": true, "stock-take": true,
    "stock-transfers": false, "expiry-batch-tracking": false,
    // Customers
    "customers": true, "customer-list": true, "customer-add": true,
    "suppliers-list": true, "supplier-add": true,
    // Staff (basic roles ✓, advanced ✗, performance ✗)
    "staff": true, "staff-list": true, "add-staff": true,
    "staff-advanced-roles": false, "staff-performance": false,
    // Finance (expenses ✓, profit trends ✗)
    "finance": true, "finance-overview": true, "finance-pnl": true,
    "finance-expenses": true,
    "finance-expense-schedules": true,
    "finance-expense-reports": true,
    "finance-reminders": true,
    "finance-profit-trends": false,
    // Branches (single only → locked)
    "branches": false, "branches-all": false,
    // Reports (basic ✓)
    "reports": true, "reports-sales-summary": true,
    "reports-product-report": false,
    "reports-inventory-valuation": false, "reports-taxes": false,
    "reports-z-report": false, "reports-branch-profitability": false,
    // Marketing (✗)
    "marketing": false, "marketing-discounts": false,
    // Settings (always)
    "settings": true, "settings-profile": true, "settings-receipt": true,
    "settings-notifications": true, "settings-account": true,
    "settings-security": true, "settings-billing": true,
    "settings-referrals": true,
    "support": true,
    // Pro governance
    "audit-logs": false, "approval-workflows": false,
    "restricted-discounts": false, "cash-reconciliation": false,
    // AI
    "copilot": false,
  },

  // ── GROWTH ── Multi-branch · adv roles · barcode · refunds · deeper reports
  growth: {
    "home": true,
    "pos": true, "new-sale": true, "held-sales": true, "customer-orders": true,
    "open-register": false, "pos-scan": true,
    "sales": true, "sales-overview": true, "sales-transactions": true,
    "sales-revenue": true, "sales-profit": true,
    "sales-average-order-value": true, "sales-refunds": true,
    "products": true, "product-list": true, "categories": true,
    "tags": true, "stock": true, "stock-take": true,
    "stock-transfers": true, "expiry-batch-tracking": false,
    "customers": true, "customer-list": true, "customer-add": true,
    "suppliers-list": true, "supplier-add": true,
    "staff": true, "staff-list": true, "add-staff": true,
    "staff-advanced-roles": true, "staff-performance": true,
    "finance": true, "finance-overview": true, "finance-pnl": true, "finance-expenses": true,
    "finance-expense-schedules": true,
    "finance-expense-reports": true,
    "finance-reminders": true,
    "finance-profit-trends": true,
    "branches": true, "branches-all": true,
    "reports": true, "reports-sales-summary": true,
    "reports-product-report": false,
    "reports-inventory-valuation": true, "reports-taxes": true,
    "reports-z-report": false, "reports-branch-profitability": false,
    "marketing": true, "marketing-discounts": true,
    "settings": true, "settings-profile": true, "settings-receipt": true,
    "settings-notifications": true, "settings-account": true,
    "settings-security": true, "settings-billing": true,
    "settings-referrals": true,
    "support": true,
    "audit-logs": false, "approval-workflows": false,
    "restricted-discounts": false, "cash-reconciliation": false,
    "copilot": false,
  },

  // ── PRO ── Everything unlocked
  pro: {
    "home": true,
    "pos": true, "new-sale": true, "held-sales": true, "customer-orders": true,
    "open-register": true, "pos-scan": true,
    "sales": true, "sales-overview": true, "sales-transactions": true,
    "sales-revenue": true, "sales-profit": true,
    "sales-average-order-value": true, "sales-refunds": true,
    "products": true, "product-list": true, "categories": true,
    "tags": true, "stock": true, "stock-take": true,
    "stock-transfers": true, "expiry-batch-tracking": true,
    "customers": true, "customer-list": true, "customer-add": true,
    "suppliers-list": true, "supplier-add": true,
    "staff": true, "staff-list": true, "add-staff": true,
    "staff-advanced-roles": true, "staff-performance": true,
    "finance": true, "finance-overview": true, "finance-pnl": true, "finance-expenses": true,
    "finance-expense-schedules": true,
    "finance-expense-reports": true,
    "finance-reminders": true,
    "finance-profit-trends": true,
    "branches": true, "branches-all": true,
    "reports": true, "reports-sales-summary": true,
    "reports-product-report": true,
    "reports-inventory-valuation": true, "reports-taxes": true,
    "reports-z-report": true, "reports-branch-profitability": true,
    "marketing": true, "marketing-discounts": true,
    "settings": true, "settings-profile": true, "settings-receipt": true,
    "settings-notifications": true, "settings-account": true,
    "settings-security": true, "settings-billing": true,
    "settings-referrals": true,
    "support": true,
    "audit-logs": true, "approval-workflows": true,
    "restricted-discounts": true, "cash-reconciliation": true,
    "copilot": true,
  },
};

/** Check if a specific feature is accessible for the given plan. */
export function canAccess(plan: PlanId, featureId: string): boolean {
  return PLAN_FEATURE_ACCESS[plan]?.[featureId] ?? false;
}

/** Get all feature IDs that are gated (locked) for a given plan. */
export function getGatedFeatures(plan: PlanId): string[] {
  const access = PLAN_FEATURE_ACCESS[plan];
  if (!access) return [];
  return Object.entries(access).filter(([, v]) => !v).map(([id]) => id);
}

/** Get the minimum plan required for a given feature. */
export function getMinimumPlan(featureId: string): PlanId {
  if (PLAN_FEATURE_ACCESS.starter[featureId]) return "starter";
  if (PLAN_FEATURE_ACCESS.growth[featureId]) return "growth";
  return "pro";
}

/** Get features a plan unlocks above the previous tier. */
export function getUpgradeFeatures(plan: PlanId): string[] {
  if (plan === "starter") return [];
  const prev: PlanId = plan === "growth" ? "starter" : "growth";
  return Object.entries(PLAN_FEATURE_ACCESS[plan])
    .filter(([id, v]) => v && !PLAN_FEATURE_ACCESS[prev][id])
    .map(([id]) => id);
}
