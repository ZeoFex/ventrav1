import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { auditLogs } from "../db/schema/audit-logs";
import { businesses } from "../db/schema/businesses";
import { branches } from "../db/schema/branches";
import { customers } from "../db/schema/customers";
import { customerAccountEntries } from "../db/schema/customer-account-entries";
import {
    customerOrders,
    customerOrderLines,
    customerOrderPaymentLines,
} from "../db/schema/customer-orders";
import { expenses } from "../db/schema/expenses";
import { categories, products } from "../db/schema/products";
import { roles, userRoles } from "../db/schema/roles";
import { saleReturnEvents } from "../db/schema/sale-return-events";
import { sales, saleItems, salePaymentLines } from "../db/schema/sales";
import { stockTakeLines, stockTakeSessions } from "../db/schema/stock-take";
import { superadminAuditLogs } from "../db/schema/superadmin-audit-logs";
import { superadmins } from "../db/schema/superadmins";
import { suppliers, supplyOrderLines, supplyOrders } from "../db/schema/suppliers";
import { users } from "../db/schema/users";
import {
    activityActionLabel,
    platformResourceLabel,
} from "./platform-activity-labels";

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const KINDS = new Set([
    "sale",
    "customer",
    "product",
    "expense",
    "return",
    "stocktake",
    "corder",
    "supply",
    "staff",
    "audit",
    "platform",
    "payment",
]);

export type ActivityDetailField = { label: string; value: string };

export type ActivityDetailLine = {
    title: string;
    subtitle?: string;
    qty?: string;
    amount?: string;
};

export type ActivityDetailSection = {
    title: string;
    lines: ActivityDetailLine[];
};

export type ActivityDetailPayload = {
    kind: string;
    title: string;
    subtitle: string | null;
    source: "platform" | "shop";
    actionLabel: string;
    resourceLabel: string;
    shopName: string | null;
    actorName: string | null;
    actorEmail: string | null;
    createdAt: string;
    fields: ActivityDetailField[];
    sections: ActivityDetailSection[];
};

function parseEntryId(entryId: string): { kind: string; id: string } | null {
    const i = entryId.indexOf(":");
    if (i <= 0) return null;
    const kind = entryId.slice(0, i);
    const id = entryId.slice(i + 1);
    if (!KINDS.has(kind) || !UUID_RE.test(id)) return null;
    return { kind, id };
}

function iso(d: Date | string | null | undefined): string {
    if (!d) return new Date(0).toISOString();
    if (d instanceof Date) return d.toISOString();
    const parsed = new Date(d);
    return Number.isNaN(parsed.getTime()) ? String(d) : parsed.toISOString();
}

function money(v: string | number | null | undefined): string {
    const n = Number(v ?? NaN);
    if (!Number.isFinite(n)) return "—";
    return `GHS ${n.toFixed(2)}`;
}

function pretty(v: string | null | undefined): string {
    if (!v) return "—";
    return v.replace(/_/g, " ");
}

function person(first?: string | null, last?: string | null): string | null {
    const n = [first, last].filter(Boolean).join(" ").trim();
    return n || null;
}

function metadataFields(meta: unknown): ActivityDetailField[] {
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) return [];
    const skip = new Set(["actorName", "actorEmail", "shopId", "shopName", "actor"]);
    return Object.entries(meta as Record<string, unknown>)
        .filter(([key]) => !skip.has(key))
        .map(([key, value]) => ({
            label: key
                .replace(/([A-Z])/g, " $1")
                .replace(/[_-]+/g, " ")
                .replace(/^\w/, (c) => c.toUpperCase())
                .trim(),
            value:
                value == null
                    ? "—"
                    : typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value),
        }));
}

/**
 * Full record for a unified activity-feed id (`sale:uuid`, `platform:uuid`, …).
 */
export async function getPlatformActivityDetail(
    entryId: string,
): Promise<ActivityDetailPayload | null> {
    const parsed = parseEntryId(entryId);
    if (!parsed) return null;

    switch (parsed.kind) {
        case "sale":
            return detailSale(parsed.id);
        case "customer":
            return detailCustomer(parsed.id);
        case "product":
            return detailProduct(parsed.id);
        case "expense":
            return detailExpense(parsed.id);
        case "return":
            return detailReturn(parsed.id);
        case "stocktake":
            return detailStockTake(parsed.id);
        case "corder":
            return detailCustomerOrder(parsed.id);
        case "supply":
            return detailSupply(parsed.id);
        case "staff":
            return detailStaff(parsed.id);
        case "payment":
            return detailPayment(parsed.id);
        case "audit":
            return detailAudit(parsed.id);
        case "platform":
            return detailPlatform(parsed.id);
        default:
            return null;
    }
}

async function detailSale(id: string): Promise<ActivityDetailPayload | null> {
    const [row] = await db
        .select({
            invoiceId: sales.invoiceId,
            subtotalGhs: sales.subtotalGhs,
            taxGhs: sales.taxGhs,
            discountGhs: sales.discountGhs,
            totalGhs: sales.totalGhs,
            amountPaidGhs: sales.amountPaidGhs,
            balanceDueGhs: sales.balanceDueGhs,
            paymentMethod: sales.paymentMethod,
            itemCount: sales.itemCount,
            status: sales.status,
            createdAt: sales.createdAt,
            shopName: businesses.name,
            branchName: branches.name,
            customerName: customers.name,
            customerPhone: customers.phone,
            actorName: sql<string | null>`nullif(trim(coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')), '')`,
            actorEmail: users.email,
        })
        .from(sales)
        .innerJoin(businesses, eq(sales.businessId, businesses.id))
        .leftJoin(branches, eq(sales.branchId, branches.id))
        .leftJoin(customers, eq(sales.customerId, customers.id))
        .leftJoin(users, eq(sales.userId, users.id))
        .where(eq(sales.id, id))
        .limit(1);

    if (!row) return null;

    const [lines, payments] = await Promise.all([
        db
            .select({
                productName: saleItems.productName,
                quantity: saleItems.quantity,
                quantityReturned: saleItems.quantityReturned,
                unitPriceGhs: saleItems.unitPriceGhs,
                lineTotalGhs: saleItems.lineTotalGhs,
            })
            .from(saleItems)
            .where(eq(saleItems.saleId, id))
            .orderBy(asc(saleItems.id)),
        db
            .select({
                paymentMethod: salePaymentLines.paymentMethod,
                amountGhs: salePaymentLines.amountGhs,
            })
            .from(salePaymentLines)
            .where(eq(salePaymentLines.saleId, id))
            .orderBy(asc(salePaymentLines.sortOrder), asc(salePaymentLines.id)),
    ]);

    return {
        kind: "sale",
        title: `Invoice ${row.invoiceId}`,
        subtitle: `${money(row.totalGhs)} · ${pretty(row.status)}`,
        source: "shop",
        actionLabel: activityActionLabel("shop.sale.completed"),
        resourceLabel: platformResourceLabel("sales"),
        shopName: row.shopName,
        actorName: row.actorName,
        actorEmail: row.actorEmail,
        createdAt: iso(row.createdAt),
        fields: [
            { label: "Customer", value: row.customerName || "Walk-in" },
            { label: "Phone", value: row.customerPhone || "—" },
            { label: "Cashier", value: row.actorName || "—" },
            { label: "Branch", value: row.branchName || "—" },
            { label: "Status", value: pretty(row.status) },
            { label: "Items", value: String(row.itemCount) },
            { label: "Subtotal", value: money(row.subtotalGhs) },
            { label: "Tax", value: money(row.taxGhs) },
            { label: "Discount", value: money(row.discountGhs) },
            { label: "Total", value: money(row.totalGhs) },
            { label: "Amount paid", value: money(row.amountPaidGhs) },
            { label: "Balance due", value: money(row.balanceDueGhs) },
            { label: "Payment", value: pretty(row.paymentMethod) },
        ],
        sections: [
            {
                title: `Items sold (${lines.length})`,
                lines: lines.map((line) => ({
                    title: line.productName,
                    subtitle: `${line.quantity} × ${money(line.unitPriceGhs)}${
                        line.quantityReturned
                            ? ` · ${line.quantityReturned} returned`
                            : ""
                    }`,
                    qty: String(line.quantity),
                    amount: money(line.lineTotalGhs),
                })),
            },
            ...(payments.length
                ? [
                      {
                          title: "Payments",
                          lines: payments.map((p) => ({
                              title: pretty(p.paymentMethod),
                              amount: money(p.amountGhs),
                          })),
                      },
                  ]
                : []),
        ],
    };
}

async function detailCustomer(id: string): Promise<ActivityDetailPayload | null> {
    const [row] = await db
        .select({
            name: customers.name,
            phone: customers.phone,
            email: customers.email,
            status: customers.status,
            ar: customers.accountsReceivableGhs,
            createdAt: customers.createdAt,
            shopName: businesses.name,
            branchName: branches.name,
        })
        .from(customers)
        .innerJoin(businesses, eq(customers.businessId, businesses.id))
        .leftJoin(branches, eq(customers.branchId, branches.id))
        .where(eq(customers.id, id))
        .limit(1);

    if (!row) return null;

    const receipts = await db
        .select({
            invoiceId: sales.invoiceId,
            totalGhs: sales.totalGhs,
            status: sales.status,
            createdAt: sales.createdAt,
        })
        .from(sales)
        .where(eq(sales.customerId, id))
        .orderBy(desc(sales.createdAt))
        .limit(12);

    return {
        kind: "customer",
        title: row.name,
        subtitle: row.phone,
        source: "shop",
        actionLabel: activityActionLabel("shop.customer.saved"),
        resourceLabel: platformResourceLabel("customer"),
        shopName: row.shopName,
        actorName: null,
        actorEmail: null,
        createdAt: iso(row.createdAt),
        fields: [
            { label: "Phone", value: row.phone || "—" },
            { label: "Email", value: row.email || "—" },
            { label: "Status", value: pretty(row.status) },
            { label: "Branch", value: row.branchName || "—" },
            { label: "Amount owed", value: money(row.ar) },
        ],
        sections: [
            {
                title: receipts.length ? `Recent receipts (${receipts.length})` : "Recent receipts",
                lines: receipts.map((r) => ({
                    title: r.invoiceId,
                    subtitle: `${pretty(r.status)} · ${iso(r.createdAt)}`,
                    amount: money(r.totalGhs),
                })),
            },
        ],
    };
}

async function detailProduct(id: string): Promise<ActivityDetailPayload | null> {
    const [row] = await db
        .select({
            name: products.name,
            sku: products.sku,
            barcode: products.barcode,
            priceGhs: products.priceGhs,
            costPriceGhs: products.costPriceGhs,
            stock: products.stock,
            unit: products.unit,
            status: products.status,
            createdAt: products.createdAt,
            shopName: businesses.name,
            categoryName: categories.name,
            branchName: branches.name,
        })
        .from(products)
        .innerJoin(businesses, eq(products.businessId, businesses.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(branches, eq(products.branchId, branches.id))
        .where(eq(products.id, id))
        .limit(1);

    if (!row) return null;

    return {
        kind: "product",
        title: row.name,
        subtitle: row.sku ? `SKU ${row.sku}` : null,
        source: "shop",
        actionLabel: activityActionLabel("shop.product.added"),
        resourceLabel: platformResourceLabel("product"),
        shopName: row.shopName,
        actorName: null,
        actorEmail: null,
        createdAt: iso(row.createdAt),
        fields: [
            { label: "SKU", value: row.sku || "—" },
            { label: "Barcode", value: row.barcode || "—" },
            { label: "Category", value: row.categoryName || "—" },
            { label: "Branch", value: row.branchName || "—" },
            { label: "Price", value: money(row.priceGhs) },
            { label: "Cost", value: money(row.costPriceGhs) },
            { label: "Stock", value: `${row.stock} ${row.unit || "pcs"}` },
            { label: "Status", value: pretty(row.status) },
        ],
        sections: [],
    };
}

async function detailExpense(id: string): Promise<ActivityDetailPayload | null> {
    const [row] = await db
        .select({
            description: expenses.description,
            category: expenses.category,
            amountGhs: expenses.amountGhs,
            status: expenses.status,
            paymentMethod: expenses.paymentMethod,
            vendor: expenses.vendor,
            date: expenses.date,
            createdAt: expenses.createdAt,
            shopName: businesses.name,
            branchName: branches.name,
        })
        .from(expenses)
        .innerJoin(businesses, eq(expenses.businessId, businesses.id))
        .leftJoin(branches, eq(expenses.branchId, branches.id))
        .where(eq(expenses.id, id))
        .limit(1);

    if (!row) return null;

    return {
        kind: "expense",
        title: row.description,
        subtitle: money(row.amountGhs),
        source: "shop",
        actionLabel: activityActionLabel("shop.expense.recorded"),
        resourceLabel: platformResourceLabel("expense"),
        shopName: row.shopName,
        actorName: null,
        actorEmail: null,
        createdAt: iso(row.createdAt),
        fields: [
            { label: "Category", value: row.category || "—" },
            { label: "Vendor", value: row.vendor || "—" },
            { label: "Amount", value: money(row.amountGhs) },
            { label: "Status", value: pretty(row.status) },
            { label: "Payment", value: pretty(row.paymentMethod) },
            { label: "Branch", value: row.branchName || "—" },
            { label: "Expense date", value: iso(row.date) },
        ],
        sections: [],
    };
}

async function detailReturn(id: string): Promise<ActivityDetailPayload | null> {
    const [row] = await db
        .select({
            quantity: saleReturnEvents.quantity,
            createdAt: saleReturnEvents.createdAt,
            shopName: businesses.name,
            invoiceId: sales.invoiceId,
            productName: saleItems.productName,
            actorName: sql<string | null>`nullif(trim(coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')), '')`,
            actorEmail: users.email,
            branchName: branches.name,
        })
        .from(saleReturnEvents)
        .innerJoin(businesses, eq(saleReturnEvents.businessId, businesses.id))
        .innerJoin(sales, eq(saleReturnEvents.saleId, sales.id))
        .innerJoin(saleItems, eq(saleReturnEvents.saleItemId, saleItems.id))
        .leftJoin(users, eq(saleReturnEvents.userId, users.id))
        .leftJoin(branches, eq(saleReturnEvents.branchId, branches.id))
        .where(eq(saleReturnEvents.id, id))
        .limit(1);

    if (!row) return null;

    return {
        kind: "return",
        title: `${row.quantity} unit(s) returned`,
        subtitle: row.productName,
        source: "shop",
        actionLabel: activityActionLabel("shop.return.recorded"),
        resourceLabel: platformResourceLabel("return"),
        shopName: row.shopName,
        actorName: row.actorName,
        actorEmail: row.actorEmail,
        createdAt: iso(row.createdAt),
        fields: [
            { label: "Product", value: row.productName },
            { label: "Quantity", value: String(row.quantity) },
            { label: "Original invoice", value: row.invoiceId },
            { label: "Staff", value: row.actorName || "—" },
            { label: "Branch", value: row.branchName || "—" },
        ],
        sections: [],
    };
}

async function detailStockTake(id: string): Promise<ActivityDetailPayload | null> {
    const [row] = await db
        .select({
            status: stockTakeSessions.status,
            note: stockTakeSessions.note,
            completedAt: stockTakeSessions.completedAt,
            createdAt: stockTakeSessions.createdAt,
            shopName: businesses.name,
            branchName: branches.name,
            actorName: sql<string | null>`nullif(trim(coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')), '')`,
            actorEmail: users.email,
        })
        .from(stockTakeSessions)
        .innerJoin(businesses, eq(stockTakeSessions.businessId, businesses.id))
        .leftJoin(branches, eq(stockTakeSessions.branchId, branches.id))
        .leftJoin(users, eq(stockTakeSessions.userId, users.id))
        .where(eq(stockTakeSessions.id, id))
        .limit(1);

    if (!row) return null;

    const lines = await db
        .select({
            productName: products.name,
            sku: products.sku,
            systemQty: stockTakeLines.systemQtySnapshot,
            countedQty: stockTakeLines.countedQty,
        })
        .from(stockTakeLines)
        .innerJoin(products, eq(stockTakeLines.productId, products.id))
        .where(eq(stockTakeLines.sessionId, id))
        .orderBy(asc(products.name));

    return {
        kind: "stocktake",
        title: row.note?.trim() || "Stock take",
        subtitle: pretty(row.status),
        source: "shop",
        actionLabel: activityActionLabel("shop.stock_take.completed"),
        resourceLabel: platformResourceLabel("stock_take"),
        shopName: row.shopName,
        actorName: row.actorName,
        actorEmail: row.actorEmail,
        createdAt: iso(row.completedAt ?? row.createdAt),
        fields: [
            { label: "Status", value: pretty(row.status) },
            { label: "Branch", value: row.branchName || "—" },
            { label: "Counted by", value: row.actorName || "—" },
            { label: "Lines", value: String(lines.length) },
            { label: "Note", value: row.note?.trim() || "—" },
        ],
        sections: [
            {
                title: `Counted items (${lines.length})`,
                lines: lines.map((line) => {
                    const variance = line.countedQty - line.systemQty;
                    const sign = variance > 0 ? "+" : "";
                    return {
                        title: line.productName,
                        subtitle: line.sku
                            ? `SKU ${line.sku} · system ${line.systemQty}`
                            : `System ${line.systemQty}`,
                        qty: String(line.countedQty),
                        amount: `${sign}${variance}`,
                    };
                }),
            },
        ],
    };
}

async function detailCustomerOrder(id: string): Promise<ActivityDetailPayload | null> {
    const [row] = await db
        .select({
            invoiceId: customerOrders.invoiceId,
            status: customerOrders.status,
            subtotalGhs: customerOrders.subtotalGhs,
            taxGhs: customerOrders.taxGhs,
            discountGhs: customerOrders.discountGhs,
            totalGhs: customerOrders.totalGhs,
            amountPaidGhs: customerOrders.amountPaidGhs,
            balanceDueGhs: customerOrders.balanceDueGhs,
            createdAt: customerOrders.createdAt,
            shopName: businesses.name,
            customerName: customers.name,
            customerPhone: customers.phone,
            actorName: sql<string | null>`nullif(trim(coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')), '')`,
            actorEmail: users.email,
            branchName: branches.name,
        })
        .from(customerOrders)
        .innerJoin(businesses, eq(customerOrders.businessId, businesses.id))
        .innerJoin(customers, eq(customerOrders.customerId, customers.id))
        .leftJoin(users, eq(customerOrders.userId, users.id))
        .leftJoin(branches, eq(customerOrders.branchId, branches.id))
        .where(eq(customerOrders.id, id))
        .limit(1);

    if (!row) return null;

    const [lines, payments] = await Promise.all([
        db
            .select({
                productName: customerOrderLines.productName,
                quantity: customerOrderLines.quantity,
                unitPriceGhs: customerOrderLines.unitPriceGhs,
                lineTotalGhs: customerOrderLines.lineTotalGhs,
            })
            .from(customerOrderLines)
            .where(eq(customerOrderLines.customerOrderId, id))
            .orderBy(asc(customerOrderLines.id)),
        db
            .select({
                paymentMethod: customerOrderPaymentLines.paymentMethod,
                amountGhs: customerOrderPaymentLines.amountGhs,
            })
            .from(customerOrderPaymentLines)
            .where(eq(customerOrderPaymentLines.customerOrderId, id))
            .orderBy(
                asc(customerOrderPaymentLines.sortOrder),
                asc(customerOrderPaymentLines.id),
            ),
    ]);

    return {
        kind: "corder",
        title: row.invoiceId,
        subtitle: `${pretty(row.status)} · ${money(row.totalGhs)}`,
        source: "shop",
        actionLabel: activityActionLabel("shop.customer_order.created"),
        resourceLabel: platformResourceLabel("customer_order"),
        shopName: row.shopName,
        actorName: row.actorName,
        actorEmail: row.actorEmail,
        createdAt: iso(row.createdAt),
        fields: [
            { label: "Customer", value: row.customerName },
            { label: "Phone", value: row.customerPhone || "—" },
            { label: "Staff", value: row.actorName || "—" },
            { label: "Branch", value: row.branchName || "—" },
            { label: "Status", value: pretty(row.status) },
            { label: "Total", value: money(row.totalGhs) },
            { label: "Amount paid", value: money(row.amountPaidGhs) },
            { label: "Balance due", value: money(row.balanceDueGhs) },
        ],
        sections: [
            {
                title: `Order items (${lines.length})`,
                lines: lines.map((line) => ({
                    title: line.productName,
                    subtitle: `${line.quantity} × ${money(line.unitPriceGhs)}`,
                    qty: String(line.quantity),
                    amount: money(line.lineTotalGhs),
                })),
            },
            ...(payments.length
                ? [
                      {
                          title: "Payments",
                          lines: payments.map((p) => ({
                              title: pretty(p.paymentMethod),
                              amount: money(p.amountGhs),
                          })),
                      },
                  ]
                : []),
        ],
    };
}

async function detailSupply(id: string): Promise<ActivityDetailPayload | null> {
    const [row] = await db
        .select({
            reference: supplyOrders.reference,
            paymentStatus: supplyOrders.paymentStatus,
            amountPaidGhs: supplyOrders.amountPaidGhs,
            totalCostGhs: supplyOrders.totalCostGhs,
            totalLineItems: supplyOrders.totalLineItems,
            totalUnitsSupplied: supplyOrders.totalUnitsSupplied,
            paymentMethod: supplyOrders.paymentMethod,
            notes: supplyOrders.notes,
            orderedAt: supplyOrders.orderedAt,
            createdAt: supplyOrders.createdAt,
            shopName: businesses.name,
            supplierName: suppliers.name,
            branchName: branches.name,
        })
        .from(supplyOrders)
        .innerJoin(businesses, eq(supplyOrders.businessId, businesses.id))
        .innerJoin(suppliers, eq(supplyOrders.supplierId, suppliers.id))
        .leftJoin(branches, eq(supplyOrders.branchId, branches.id))
        .where(eq(supplyOrders.id, id))
        .limit(1);

    if (!row) return null;

    const lines = await db
        .select({
            productName: supplyOrderLines.productName,
            quantityTotal: supplyOrderLines.quantityTotal,
            unitCostGhs: supplyOrderLines.unitCostGhs,
            lineTotalGhs: supplyOrderLines.lineTotalGhs,
            batchNo: supplyOrderLines.batchNo,
        })
        .from(supplyOrderLines)
        .where(eq(supplyOrderLines.supplyOrderId, id))
        .orderBy(asc(supplyOrderLines.id));

    return {
        kind: "supply",
        title: row.reference,
        subtitle: `${row.supplierName} · ${money(row.totalCostGhs)}`,
        source: "shop",
        actionLabel: activityActionLabel("shop.supply.recorded"),
        resourceLabel: platformResourceLabel("supply"),
        shopName: row.shopName,
        actorName: null,
        actorEmail: null,
        createdAt: iso(row.createdAt),
        fields: [
            { label: "Supplier", value: row.supplierName },
            { label: "Payment status", value: pretty(row.paymentStatus) },
            { label: "Total cost", value: money(row.totalCostGhs) },
            { label: "Amount paid", value: money(row.amountPaidGhs) },
            { label: "Payment", value: pretty(row.paymentMethod) },
            { label: "Units", value: String(row.totalUnitsSupplied) },
            { label: "Line items", value: String(row.totalLineItems) },
            { label: "Branch", value: row.branchName || "—" },
            { label: "Ordered", value: iso(row.orderedAt) },
            { label: "Notes", value: row.notes?.trim() || "—" },
        ],
        sections: [
            {
                title: `Supplied items (${lines.length})`,
                lines: lines.map((line) => ({
                    title: line.productName,
                    subtitle: [
                        `${line.quantityTotal} × ${money(line.unitCostGhs)}`,
                        line.batchNo ? `batch ${line.batchNo}` : null,
                    ]
                        .filter(Boolean)
                        .join(" · "),
                    qty: String(line.quantityTotal),
                    amount: money(line.lineTotalGhs),
                })),
            },
        ],
    };
}

async function detailStaff(id: string): Promise<ActivityDetailPayload | null> {
    const [row] = await db
        .select({
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            phone: users.phone,
            status: users.status,
            city: users.city,
            lastLoginAt: users.lastLoginAt,
            createdAt: users.createdAt,
            shopName: businesses.name,
        })
        .from(users)
        .innerJoin(businesses, eq(users.businessId, businesses.id))
        .where(eq(users.id, id))
        .limit(1);

    if (!row) return null;

    const roleRows = await db
        .select({ name: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, id));

    const name = person(row.firstName, row.lastName) || row.email;

    return {
        kind: "staff",
        title: name,
        subtitle: row.email,
        source: "shop",
        actionLabel: activityActionLabel("shop.staff.added"),
        resourceLabel: platformResourceLabel("staff"),
        shopName: row.shopName,
        actorName: name,
        actorEmail: row.email,
        createdAt: iso(row.createdAt),
        fields: [
            { label: "Email", value: row.email },
            { label: "Phone", value: row.phone || "—" },
            { label: "Status", value: pretty(row.status) },
            { label: "Role", value: roleRows.map((r) => r.name).join(", ") || "—" },
            { label: "City", value: row.city || "—" },
            { label: "Last sign-in", value: row.lastLoginAt ? iso(row.lastLoginAt) : "—" },
        ],
        sections: [],
    };
}

async function detailPayment(id: string): Promise<ActivityDetailPayload | null> {
    const [row] = await db
        .select({
            kind: customerAccountEntries.kind,
            amountGhs: customerAccountEntries.amountGhs,
            note: customerAccountEntries.note,
            createdAt: customerAccountEntries.createdAt,
            shopName: businesses.name,
            customerName: customers.name,
            customerPhone: customers.phone,
            invoiceId: sales.invoiceId,
        })
        .from(customerAccountEntries)
        .innerJoin(businesses, eq(customerAccountEntries.businessId, businesses.id))
        .innerJoin(customers, eq(customerAccountEntries.customerId, customers.id))
        .leftJoin(sales, eq(customerAccountEntries.saleId, sales.id))
        .where(eq(customerAccountEntries.id, id))
        .limit(1);

    if (!row) return null;

    return {
        kind: "payment",
        title: `${row.customerName} paid ${money(row.amountGhs)}`,
        subtitle: row.note,
        source: "shop",
        actionLabel: activityActionLabel("shop.customer.payment"),
        resourceLabel: platformResourceLabel("customer"),
        shopName: row.shopName,
        actorName: null,
        actorEmail: null,
        createdAt: iso(row.createdAt),
        fields: [
            { label: "Customer", value: row.customerName },
            { label: "Phone", value: row.customerPhone || "—" },
            { label: "Amount", value: money(row.amountGhs) },
            { label: "Type", value: pretty(row.kind) },
            { label: "Linked invoice", value: row.invoiceId || "—" },
            { label: "Note", value: row.note?.trim() || "—" },
        ],
        sections: [],
    };
}

async function detailAudit(id: string): Promise<ActivityDetailPayload | null> {
    const [row] = await db
        .select({
            action: auditLogs.action,
            resource: auditLogs.resource,
            resourceId: auditLogs.resourceId,
            metadata: auditLogs.metadata,
            ipAddress: auditLogs.ipAddress,
            userAgent: auditLogs.userAgent,
            createdAt: auditLogs.createdAt,
            shopName: businesses.name,
            actorName: sql<string | null>`nullif(trim(coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')), '')`,
            actorEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(businesses, eq(auditLogs.businessId, businesses.id))
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(eq(auditLogs.id, id))
        .limit(1);

    if (!row) return null;

    return {
        kind: "audit",
        title: activityActionLabel(row.action),
        subtitle: platformResourceLabel(row.resource),
        source: "shop",
        actionLabel: activityActionLabel(row.action),
        resourceLabel: platformResourceLabel(row.resource),
        shopName: row.shopName,
        actorName: row.actorName,
        actorEmail: row.actorEmail,
        createdAt: iso(row.createdAt),
        fields: [
            { label: "Action", value: activityActionLabel(row.action) },
            { label: "Resource", value: platformResourceLabel(row.resource) },
            { label: "Record id", value: row.resourceId || "—" },
            { label: "IP address", value: row.ipAddress || "—" },
            { label: "Device", value: row.userAgent || "—" },
            ...metadataFields(row.metadata),
        ],
        sections: [],
    };
}

async function detailPlatform(id: string): Promise<ActivityDetailPayload | null> {
    const [row] = await db
        .select({
            action: superadminAuditLogs.action,
            resource: superadminAuditLogs.resource,
            resourceId: superadminAuditLogs.resourceId,
            metadata: superadminAuditLogs.metadata,
            ipAddress: superadminAuditLogs.ipAddress,
            userAgent: superadminAuditLogs.userAgent,
            createdAt: superadminAuditLogs.createdAt,
            adminFirst: superadmins.firstName,
            adminLast: superadmins.lastName,
            adminEmail: superadmins.email,
        })
        .from(superadminAuditLogs)
        .leftJoin(superadmins, eq(superadminAuditLogs.superadminId, superadmins.id))
        .where(eq(superadminAuditLogs.id, id))
        .limit(1);

    if (!row) return null;

    const meta =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : {};
    const actorName =
        (typeof meta.actorName === "string" && meta.actorName) ||
        person(row.adminFirst, row.adminLast) ||
        row.adminEmail ||
        "Platform";
    const actorEmail =
        (typeof meta.actorEmail === "string" && meta.actorEmail) || row.adminEmail;
    const shopName = typeof meta.shopName === "string" ? meta.shopName : null;

    return {
        kind: "platform",
        title: activityActionLabel(row.action),
        subtitle: platformResourceLabel(row.resource),
        source: "platform",
        actionLabel: activityActionLabel(row.action),
        resourceLabel: platformResourceLabel(row.resource),
        shopName,
        actorName,
        actorEmail,
        createdAt: iso(row.createdAt),
        fields: [
            { label: "Action", value: activityActionLabel(row.action) },
            { label: "Resource", value: platformResourceLabel(row.resource) },
            { label: "Record id", value: row.resourceId || "—" },
            { label: "IP address", value: row.ipAddress || "—" },
            { label: "Device", value: row.userAgent || "—" },
            ...metadataFields(row.metadata),
        ],
        sections: [],
    };
}
