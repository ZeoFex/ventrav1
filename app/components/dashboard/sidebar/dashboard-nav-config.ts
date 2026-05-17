/** Sidebar: routes under `/dashboard` (catch-all page until each exists). */

export type DashboardNavChild = {
  id: string;
  label: string;
  href: string;
};

export type DashboardNavItem = {
  id: string;
  label: string;
  href: string;
  icon: DashboardNavIconId;
  children?: DashboardNavChild[];
  collapsibleOnly?: boolean;
  branchOnly?: boolean;
  globalOnly?: boolean;
};

export type DashboardNavIconId =
  | "home"
  | "pos"
  | "sales"
  | "products"
  | "contacts"
  | "staff"
  | "finance"
  | "branches"
  | "reports"
  | "marketing"
  | "settings";

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  {
    id: "home",
    label: "Home",
    href: "/dashboard",
    icon: "home",
  },
  {
    id: "pos",
    label: "POS",
    href: "/dashboard/pos",
    icon: "pos",
    collapsibleOnly: true,
    branchOnly: true, // POS is only available when a specific branch is selected
    children: [
      // {
      //   id: "open-register",
      //   label: "Open register / shift",
      //   href: "/dashboard/pos/register",
      // },
      { id: "new-sale", label: "New sale", href: "/dashboard/pos/sale" },
      {
        id: "held-sales",
        label: "Held sales",
        href: "/dashboard/pos/held",
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    href: "/dashboard/sales",
    icon: "sales",
    collapsibleOnly: true,
    children: [
      {
        id: "sales-overview",
        label: "Overview",
        href: "/dashboard/sales/overview",
      },
      {
        id: "sales-refunds",
        label: "Returns / refunds",
        href: "/dashboard/sales/refunds",
      },
    ],
  },
  {
    id: "products",
    label: "Products",
    href: "/dashboard/products",
    icon: "products",
    collapsibleOnly: true,
    children: [
      {
        id: "product-list",
        label: "Product list",
        href: "/dashboard/products",
      },
      {
        id: "categories",
        label: "Categories",
        href: "/dashboard/products/categories",
      },
      {
        id: "tags",
        label: "Tags",
        href: "/dashboard/products/tags",
      },
      {
        id: "stock",
        label: "Stock / inventory",
        href: "/dashboard/inventory",
      },
      {
        id: "stock-take",
        label: "Stock take",
        href: "/dashboard/inventory/stock-take",
      },
    ],
  },
  {
    id: "customers",
    label: "Contacts",
    href: "/dashboard/customers",
    icon: "contacts",
    collapsibleOnly: true,
    children: [
      {
        id: "customer-list",
        label: "Customers",
        href: "/dashboard/customers",
      },
      {
        id: "customer-add",
        label: "Add customer",
        href: "/dashboard/customers/new",
      },
      {
        id: "suppliers-list",
        label: "Supplier list",
        href: "/dashboard/suppliers",
      },
      {
        id: "supplier-add",
        label: "Add supplier",
        href: "/dashboard/suppliers/new",
      },
    ],
  },
  {
    id: "staff",
    label: "Staff",
    href: "/dashboard/staff",
    icon: "staff",
    collapsibleOnly: true,
    children: [
      { id: "staff-list", label: "Staff list", href: "/dashboard/staff" },
      {
        id: "add-staff",
        label: "Add staff",
        href: "/dashboard/staff/new",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    href: "/dashboard/finance",
    icon: "finance",
    collapsibleOnly: true,
    children: [
      {
        id: "finance-overview",
        label: "Overview",
        href: "/dashboard/finance",
      },
      {
        id: "finance-pnl",
        label: "P&L",
        href: "/dashboard/finance/pnl",
      },
      {
        id: "finance-expenses",
        label: "Expenses",
        href: "/dashboard/finance/expenses",
      },
      {
        id: "finance-expense-schedules",
        label: "Recurring expenses",
        href: "/dashboard/finance/expense-schedules",
      },
      {
        id: "finance-expense-reports",
        label: "Expense reports",
        href: "/dashboard/finance/expenses/reports",
      },
      {
        id: "finance-reminders",
        label: "Reminders",
        href: "/dashboard/finance/reminders",
      },
    ],
  },
  {
    id: "branches",
    label: "Branches",
    href: "/dashboard/branches",
    icon: "branches",
    collapsibleOnly: true,
    children: [
      {
        id: "branches-all",
        label: "All branches",
        href: "/dashboard/branches",
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    href: "/dashboard/reports",
    icon: "reports",
    collapsibleOnly: true,
    children: [
      {
        id: "reports-sales-summary",
        label: "Sales summary",
        href: "/dashboard/reports/sales-summary",
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    href: "/dashboard/marketing",
    icon: "marketing",
    collapsibleOnly: true,
    children: [
      {
        id: "marketing-discounts",
        label: "Discounts",
        href: "/dashboard/marketing/discounts",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    icon: "settings",
    collapsibleOnly: true,
    children: [
      {
        id: "settings-profile",
        label: "Business profile",
        href: "/dashboard/settings/profile",
      },
      {
        id: "settings-receipt",
        label: "Receipt & tax",
        href: "/dashboard/settings/receipt",
      },
      {
        id: "settings-referrals",
        label: "Referrals",
        href: "/dashboard/settings/referrals",
      },
      // {
      //   id: "settings-notifications",
      //   label: "Notifications",
      //   href: "/dashboard/settings/notifications",
      // },
    ],
  },
];
