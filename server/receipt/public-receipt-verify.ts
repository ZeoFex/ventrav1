import { eq, asc } from "drizzle-orm";
import { db } from "../db";
import { sales, saleItems } from "../db/schema/sales";
import { businesses } from "../db/schema/businesses";
import { branches } from "../db/schema/branches";
import { customers } from "../db/schema/customers";
import { users } from "../db/schema/users";

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PublicReceiptLine = {
    productName: string;
    quantity: number;
    unitPriceGhs: number;
    lineTotalGhs: number;
};

export type PublicReceiptVerification = {
    authentic: true;
    storeName: string;
    branchName: string | null;
    branchLocation: string | null;
    invoiceId: string;
    status: string;
    createdAt: string;
    subtotalGhs: number;
    taxGhs: number;
    discountGhs: number;
    totalGhs: number;
    paymentMethod: string;
    paymentMethodLabel: string;
    itemCount: number;
    customerName: string | null;
    lines: PublicReceiptLine[];
    operatorName: string | null;
};

const PAYMENT_LABELS: Record<string, string> = {
    cash: "Cash (GHS)",
    mtn_momo: "MTN Mobile Money",
    vodafone_cash: "Telecel Cash",
    airteltigo_money: "AirtelTigo Money",
    card: "Card",
};

function paymentLabel(raw: string): string {
    return PAYMENT_LABELS[raw] ?? raw.replace(/_/g, " ");
}

function branchLocationText(branch: {
    address?: string | null;
    region?: string | null;
    phone?: string | null;
}): string | null {
    const parts = [branch.address, branch.region, branch.phone]
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean);
    return parts.length > 0 ? parts.join("\n") : null;
}

export async function getPublicReceiptVerification(
    saleId: string,
): Promise<PublicReceiptVerification | null> {
    if (!UUID_RE.test(saleId)) return null;

    const row = await db
        .select({
            sale: sales,
            businessName: businesses.name,
            branchName: branches.name,
            branchAddress: branches.address,
            branchRegion: branches.region,
            branchPhone: branches.phone,
            customerName: customers.name,
            operatorFirst: users.firstName,
            operatorLast: users.lastName,
        })
        .from(sales)
        .innerJoin(businesses, eq(sales.businessId, businesses.id))
        .leftJoin(branches, eq(sales.branchId, branches.id))
        .leftJoin(customers, eq(sales.customerId, customers.id))
        .leftJoin(users, eq(sales.userId, users.id))
        .where(eq(sales.id, saleId))
        .limit(1);

    const first = row[0];
    if (!first) return null;

    const { sale, businessName, branchName, branchAddress, branchRegion, branchPhone, customerName, operatorFirst, operatorLast } =
        first;

    const items = await db
        .select({
            productName: saleItems.productName,
            quantity: saleItems.quantity,
            unitPriceGhs: saleItems.unitPriceGhs,
            lineTotalGhs: saleItems.lineTotalGhs,
        })
        .from(saleItems)
        .where(eq(saleItems.saleId, saleId))
        .orderBy(asc(saleItems.id));

    const branchLocation =
        branchName != null
            ? branchLocationText({
                  address: branchAddress,
                  region: branchRegion,
                  phone: branchPhone,
              })
            : null;

    const operatorName =
        operatorFirst != null
            ? [operatorFirst, operatorLast].filter(Boolean).join(" ").trim() || null
            : null;

    return {
        authentic: true,
        storeName: businessName,
        branchName: branchName ?? null,
        branchLocation: branchLocation ?? null,
        invoiceId: sale.invoiceId,
        status: sale.status,
        createdAt: sale.createdAt.toISOString(),
        subtotalGhs: Number(sale.subtotalGhs),
        taxGhs: Number(sale.taxGhs),
        discountGhs: Number(sale.discountGhs),
        totalGhs: Number(sale.totalGhs),
        paymentMethod: sale.paymentMethod,
        paymentMethodLabel: paymentLabel(sale.paymentMethod),
        itemCount: sale.itemCount,
        customerName: customerName ?? null,
        lines: items.map((l) => ({
            productName: l.productName,
            quantity: l.quantity,
            unitPriceGhs: Number(l.unitPriceGhs),
            lineTotalGhs: Number(l.lineTotalGhs),
        })),
        operatorName,
    };
}
