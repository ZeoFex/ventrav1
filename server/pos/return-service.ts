import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { products, productVariations } from "../db/schema/products";
import { sales, saleItems } from "../db/schema/sales";
import { invalidatePosBusinessCaches } from "./pos-service";

function roundMoney(n: number): number {
    return Math.round(n * 100) / 100;
}

function toGhsString(n: number): string {
    return roundMoney(n).toFixed(2);
}

export type SaleReturnLineInput = { saleItemId: string; quantity: number };

export type ProcessSaleReturnInput = {
    businessId: string;
    activeBranchId: string | null;
    saleId: string;
    userId: string;
    actorIsOwner: boolean;
    lines: SaleReturnLineInput[];
    reason?: string | null;
};

export class SaleReturnError extends Error {
    constructor(
        message: string,
        readonly status: number = 400,
    ) {
        super(message);
        this.name = "SaleReturnError";
    }
}

/**
 * Post-sale return: restock inventory, increment line-level returns, shrink sale header (subtotal/tax/discount/total), set status.
 */
export async function processSaleReturn(input: ProcessSaleReturnInput) {
    const linesIn = input.lines.filter((l) => l.quantity > 0);
    if (linesIn.length === 0) {
        throw new SaleReturnError("At least one line with quantity greater than zero is required");
    }

    const saleId = input.saleId;
    const branchIdForCache: string | null = input.activeBranchId;

    await db.transaction(async (tx) => {
        const [sale] = await tx
            .select()
            .from(sales)
            .where(and(eq(sales.id, saleId), eq(sales.businessId, input.businessId)))
            .limit(1);

        if (!sale) {
            throw new SaleReturnError("Sale not found", 404);
        }

        if (!input.actorIsOwner && sale.userId !== input.userId) {
            throw new SaleReturnError("Forbidden", 403);
        }

        if (input.activeBranchId != null && sale.branchId !== input.activeBranchId) {
            throw new SaleReturnError("This sale belongs to a different branch", 403);
        }

        if (sale.status === "refunded" || sale.status === "voided") {
            throw new SaleReturnError("This sale cannot be returned");
        }
        if (sale.status !== "completed" && sale.status !== "partially_refunded") {
            throw new SaleReturnError("This sale cannot be returned");
        }

        const dbLines = await tx
            .select()
            .from(saleItems)
            .where(eq(saleItems.saleId, saleId));

        const byId = new Map(dbLines.map((r) => [r.id, r]));

        let subtotalDelta = 0;

        for (const req of linesIn) {
            const row = byId.get(req.saleItemId);
            if (!row) {
                throw new SaleReturnError("Unknown sale line");
            }
            const prevReturned = row.quantityReturned ?? 0;
            const maxReturn = row.quantity - prevReturned;
            if (req.quantity > maxReturn) {
                throw new SaleReturnError("Return quantity exceeds remaining sellable units for a line");
            }

            const unit = Number(row.unitPriceGhs);
            subtotalDelta += unit * req.quantity;

            const nextReturned = prevReturned + req.quantity;
            const nextLineTotal = roundMoney(unit * (row.quantity - nextReturned));

            const [updated] = await tx
                .update(saleItems)
                .set({
                    quantityReturned: nextReturned,
                    lineTotalGhs: toGhsString(nextLineTotal),
                })
                .where(
                    and(
                        eq(saleItems.id, req.saleItemId),
                        eq(saleItems.saleId, saleId),
                        eq(saleItems.quantityReturned, prevReturned),
                    ),
                )
                .returning({ id: saleItems.id });

            if (!updated) {
                throw new SaleReturnError("Could not update line (try again)", 409);
            }

            if (row.variationId) {
                await tx
                    .update(productVariations)
                    .set({
                        stock: sql`${productVariations.stock} + ${req.quantity}`,
                        updatedAt: new Date(),
                    })
                    .where(eq(productVariations.id, row.variationId));
            } else if (row.productId) {
                await tx
                    .update(products)
                    .set({
                        stock: sql`${products.stock} + ${req.quantity}`,
                        updatedAt: new Date(),
                    })
                    .where(and(eq(products.id, row.productId), eq(products.businessId, input.businessId)));
            }
        }

        const refreshed = await tx
            .select({
                quantity: saleItems.quantity,
                quantityReturned: saleItems.quantityReturned,
            })
            .from(saleItems)
            .where(eq(saleItems.saleId, saleId));

        const allFullyReturned = refreshed.every((r) => r.quantityReturned >= r.quantity);
        const itemCount = refreshed.reduce((s, r) => s + (r.quantity - r.quantityReturned), 0);

        const oldSub = Number(sale.subtotalGhs);
        const oldTax = Number(sale.taxGhs);
        const oldDisc = Number(sale.discountGhs);

        let newSub: number;
        let newTax: number;
        let newDisc: number;
        let newTotal: number;

        if (allFullyReturned) {
            newSub = newTax = newDisc = newTotal = 0;
        } else {
            newSub = roundMoney(oldSub - subtotalDelta);
            const ratio = oldSub > 0 ? subtotalDelta / oldSub : 0;
            newTax = roundMoney(oldTax - oldTax * ratio);
            newDisc = roundMoney(oldDisc - oldDisc * ratio);
            newTotal = Math.max(0, roundMoney(newSub + newTax - newDisc));
        }

        const nextStatus = allFullyReturned ? "refunded" : "partially_refunded";

        await tx
            .update(sales)
            .set({
                subtotalGhs: toGhsString(newSub),
                taxGhs: toGhsString(newTax),
                discountGhs: toGhsString(newDisc),
                totalGhs: toGhsString(newTotal),
                itemCount,
                status: nextStatus,
            })
            .where(eq(sales.id, saleId));
    });

    await invalidatePosBusinessCaches(input.businessId, branchIdForCache);

    const [summary] = await db
        .select({
            id: sales.id,
            invoiceId: sales.invoiceId,
            subtotalGhs: sales.subtotalGhs,
            taxGhs: sales.taxGhs,
            discountGhs: sales.discountGhs,
            totalGhs: sales.totalGhs,
            itemCount: sales.itemCount,
            status: sales.status,
        })
        .from(sales)
        .where(eq(sales.id, saleId))
        .limit(1);

    return {
        sale: summary!,
        reason: input.reason ?? null,
    };
}
