import { db } from "@/server/db";
import { permissions } from "@/server/db/schema/roles";

// We extract all known permissions from the dashboard nav config.
const APP_PERMISSIONS = [
    { key: "home", label: "Dashboard Home" },

    { key: "pos", label: "POS Module" },
    { key: "new-sale", label: "New POS Sale" },
    { key: "held-sales", label: "Held Sales" },

    { key: "sales", label: "Sales Module" },
    { key: "sales-overview", label: "Sales Overview" },

    { key: "products", label: "Products Module" },
    { key: "product-list", label: "Product List" },
    { key: "categories", label: "Product Categories" },
    { key: "tags", label: "Product Tags" },
    { key: "stock", label: "Stock & Inventory" },
    { key: "stock-take", label: "Stock take" },

    { key: "customers", label: "Contacts Module" },
    { key: "customer-list", label: "Customer List" },
    { key: "customer-add", label: "Add Customer" },

    { key: "suppliers-list", label: "Supplier List" },
    { key: "supplier-add", label: "Add Supplier" },

    { key: "staff", label: "Staff Module" },
    { key: "staff-list", label: "Staff List" },
    { key: "add-staff", label: "Add Staff" },

    { key: "finance", label: "Finance Module" },
    { key: "finance-overview", label: "Finance Overview" },
    { key: "finance-pnl", label: "Profit & loss (P&L)" },
    { key: "finance-expenses", label: "Expenses" },
    { key: "finance-expense-schedules", label: "Recurring expenses" },
    { key: "finance-expense-reports", label: "Expense reports" },
    { key: "finance-reminders", label: "Reminders" },

    { key: "branches", label: "Branches Module" },
    { key: "branches-all", label: "All Branches" },

    { key: "reports", label: "Reports Module" },
    { key: "reports-sales-summary", label: "Sales Summary Report" },

    { key: "settings", label: "Settings Module" },
    { key: "settings-profile", label: "Business Profile Settings" },
    { key: "settings-receipt", label: "Receipt & Tax Settings" },
    { key: "settings-notifications", label: "Notification Settings" },
];

export async function seedPermissions() {
    console.log("Seeding application permissions...");

    // Using ON CONFLICT DO NOTHING to ensure idempotency.
    // Drizzle doesn't have a built-in cross-db upsert for this specific shape without specifying conflict target,
    // so we'll do an insert with onConflictDoNothing to avoid crashing on reruns.

    await db.insert(permissions)
        .values(APP_PERMISSIONS)
        .onConflictDoNothing({ target: permissions.key });

    console.log("Permissions seeded successfully.");
}

// Automatically run if this file is executed directly 
if (require.main === module) {
    seedPermissions()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error("Failed to seed permissions:", err);
            process.exit(1);
        });
}
