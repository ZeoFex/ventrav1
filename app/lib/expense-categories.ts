/** Shared expense category labels for forms, filters, and reports */
export const EXPENSE_CATEGORY_OPTIONS = [
    "Utilities",
    "Rent",
    "Transportation / Fuel",
    "Staff Salaries",
    "Maintenance",
    "Supplies (Non-stock)",
    "Marketing / Ads",
    "Inventory",
    "Miscellaneous",
] as const;

export type ExpenseCategoryOption = (typeof EXPENSE_CATEGORY_OPTIONS)[number];
