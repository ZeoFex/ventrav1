import { count, eq, or } from "drizzle-orm";
import { db } from "@/server/db";
import { auditLogs } from "@/server/db/schema/audit-logs";
import { branches } from "@/server/db/schema/branches";
import { businesses } from "@/server/db/schema/businesses";
import { customers } from "@/server/db/schema/customers";
import { discounts } from "@/server/db/schema/discounts";
import { expenses } from "@/server/db/schema/expenses";
import { notifications } from "@/server/db/schema/notifications";
import { pendingSubscriptions } from "@/server/db/schema/pending-subscriptions";
import { referralQualifications } from "@/server/db/schema/referral-qualifications";
import { permissions, rolePermissions, roles, userRoles } from "@/server/db/schema/roles";
import { productTags, products, categories, tags, productVariations } from "@/server/db/schema/products";
import { reports } from "@/server/db/schema/reports";
import { saleItems, sales } from "@/server/db/schema/sales";
import { users } from "@/server/db/schema/users";
import { emailVerifications } from "@/server/db/schema/email-verifications";
import { passwordResets } from "@/server/db/schema/password-resets";

const n = (row: { n: number } | undefined) => Number(row?.n ?? 0);
const first = (rows: { n: number }[]) => n(rows[0]);

/**
 * Counts for GET /api/platform/stats and GET /api/platform/overview.
 */
export async function getPlatformStatsCounts(businessId: string | undefined) {
    const b = businessId
        ? {
              businesses: () =>
                  db
                      .select({ n: count() })
                      .from(businesses)
                      .where(eq(businesses.id, businessId)),
              users: () => db.select({ n: count() }).from(users).where(eq(users.businessId, businessId)),
              branches: () => db.select({ n: count() }).from(branches).where(eq(branches.businessId, businessId)),
              categories: () =>
                  db.select({ n: count() }).from(categories).where(eq(categories.businessId, businessId)),
              tags: () => db.select({ n: count() }).from(tags).where(eq(tags.businessId, businessId)),
              products: () => db.select({ n: count() }).from(products).where(eq(products.businessId, businessId)),
              productVariations: () =>
                  db
                      .select({ n: count() })
                      .from(productVariations)
                      .innerJoin(products, eq(productVariations.productId, products.id))
                      .where(eq(products.businessId, businessId)),
              productTags: () =>
                  db
                      .select({ n: count() })
                      .from(productTags)
                      .innerJoin(products, eq(productTags.productId, products.id))
                      .where(eq(products.businessId, businessId)),
              customers: () => db.select({ n: count() }).from(customers).where(eq(customers.businessId, businessId)),
              sales: () => db.select({ n: count() }).from(sales).where(eq(sales.businessId, businessId)),
              saleItems: () =>
                  db
                      .select({ n: count() })
                      .from(saleItems)
                      .innerJoin(sales, eq(saleItems.saleId, sales.id))
                      .where(eq(sales.businessId, businessId)),
              expenses: () => db.select({ n: count() }).from(expenses).where(eq(expenses.businessId, businessId)),
              discounts: () => db.select({ n: count() }).from(discounts).where(eq(discounts.businessId, businessId)),
              notifications: () =>
                  db.select({ n: count() }).from(notifications).where(eq(notifications.businessId, businessId)),
              reports: () => db.select({ n: count() }).from(reports).where(eq(reports.businessId, businessId)),
              roles: () => db.select({ n: count() }).from(roles).where(eq(roles.businessId, businessId)),
              userRoles: () =>
                  db
                      .select({ n: count() })
                      .from(userRoles)
                      .innerJoin(users, eq(userRoles.userId, users.id))
                      .where(eq(users.businessId, businessId)),
              auditLogs: () => db.select({ n: count() }).from(auditLogs).where(eq(auditLogs.businessId, businessId)),
              emailVerifications: () =>
                  db
                      .select({ n: count() })
                      .from(emailVerifications)
                      .innerJoin(users, eq(emailVerifications.userId, users.id))
                      .where(eq(users.businessId, businessId)),
              passwordResets: () =>
                  db
                      .select({ n: count() })
                      .from(passwordResets)
                      .innerJoin(users, eq(passwordResets.userId, users.id))
                      .where(eq(users.businessId, businessId)),
              referralQualifications: () =>
                  db
                      .select({ n: count() })
                      .from(referralQualifications)
                      .where(
                          or(
                              eq(referralQualifications.referrerBusinessId, businessId),
                              eq(referralQualifications.refereeBusinessId, businessId)
                          )
                      ),
          }
        : {
              businesses: () => db.select({ n: count() }).from(businesses),
              users: () => db.select({ n: count() }).from(users),
              branches: () => db.select({ n: count() }).from(branches),
              categories: () => db.select({ n: count() }).from(categories),
              tags: () => db.select({ n: count() }).from(tags),
              products: () => db.select({ n: count() }).from(products),
              productVariations: () => db.select({ n: count() }).from(productVariations),
              productTags: () => db.select({ n: count() }).from(productTags),
              customers: () => db.select({ n: count() }).from(customers),
              sales: () => db.select({ n: count() }).from(sales),
              saleItems: () => db.select({ n: count() }).from(saleItems),
              expenses: () => db.select({ n: count() }).from(expenses),
              discounts: () => db.select({ n: count() }).from(discounts),
              notifications: () => db.select({ n: count() }).from(notifications),
              reports: () => db.select({ n: count() }).from(reports),
              roles: () => db.select({ n: count() }).from(roles),
              userRoles: () => db.select({ n: count() }).from(userRoles),
              auditLogs: () => db.select({ n: count() }).from(auditLogs),
              emailVerifications: () => db.select({ n: count() }).from(emailVerifications),
              passwordResets: () => db.select({ n: count() }).from(passwordResets),
              referralQualifications: () => db.select({ n: count() }).from(referralQualifications),
          };

    const [
        businessesC,
        usersC,
        branchesC,
        categoriesC,
        tagsC,
        productsC,
        productVariationsC,
        productTagsC,
        customersC,
        salesC,
        saleItemsC,
        expensesC,
        discountsC,
        notificationsC,
        reportsC,
        rolesC,
        permissionsC,
        rolePermissionsC,
        userRolesC,
        auditLogsC,
        emailVerificationsC,
        passwordResetsC,
        pendingSubscriptionsC,
        referralQualificationsC,
    ] = await Promise.all([
        b.businesses(),
        b.users(),
        b.branches(),
        b.categories(),
        b.tags(),
        b.products(),
        b.productVariations(),
        b.productTags(),
        b.customers(),
        b.sales(),
        b.saleItems(),
        b.expenses(),
        b.discounts(),
        b.notifications(),
        b.reports(),
        b.roles(),
        db.select({ n: count() }).from(permissions),
        db.select({ n: count() }).from(rolePermissions),
        b.userRoles(),
        b.auditLogs(),
        b.emailVerifications(),
        b.passwordResets(),
        db.select({ n: count() }).from(pendingSubscriptions),
        b.referralQualifications(),
    ]);

    return {
        filter: businessId ? { businessId } : null,
        counts: {
            businesses: first(businessesC),
            users: first(usersC),
            branches: first(branchesC),
            categories: first(categoriesC),
            tags: first(tagsC),
            products: first(productsC),
            productVariations: first(productVariationsC),
            productTags: first(productTagsC),
            customers: first(customersC),
            sales: first(salesC),
            saleItems: first(saleItemsC),
            expenses: first(expensesC),
            discounts: first(discountsC),
            notifications: first(notificationsC),
            reports: first(reportsC),
            roles: first(rolesC),
            permissions: first(permissionsC),
            rolePermissions: first(rolePermissionsC),
            userRoles: first(userRolesC),
            auditLogs: first(auditLogsC),
            emailVerifications: first(emailVerificationsC),
            passwordResets: first(passwordResetsC),
            pendingSubscriptions: first(pendingSubscriptionsC),
            referralQualifications: first(referralQualificationsC),
        },
    };
}
