import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "../db";
import { stockTakeSessions, stockTakeLines } from "../db/schema/stock-take";
import { products } from "../db/schema/products";
import { invalidatePosBusinessCaches } from "../pos/pos-service";

export async function createStockTakeSession(input: {
    businessId: string;
    branchId: string;
    userId?: string | null;
    note?: string | null;
}) {
    const [row] = await db
        .insert(stockTakeSessions)
        .values({
            businessId: input.businessId,
            branchId: input.branchId,
            userId: input.userId ?? null,
            note: input.note?.trim() || null,
            status: "draft",
        })
        .returning();
    return row ?? null;
}

export async function getStockTakeSession(businessId: string, sessionId: string) {
    const [session] = await db
        .select()
        .from(stockTakeSessions)
        .where(and(eq(stockTakeSessions.id, sessionId), eq(stockTakeSessions.businessId, businessId)))
        .limit(1);
    if (!session) return null;
    const lines = await db
        .select()
        .from(stockTakeLines)
        .where(eq(stockTakeLines.sessionId, sessionId));
    return { session, lines };
}

export async function listRecentStockTakeSessions(businessId: string, branchId: string | null, limit = 20) {
    const cond = branchId
        ? and(eq(stockTakeSessions.businessId, businessId), eq(stockTakeSessions.branchId, branchId))
        : eq(stockTakeSessions.businessId, businessId);
    return db
        .select()
        .from(stockTakeSessions)
        .where(cond)
        .orderBy(desc(stockTakeSessions.createdAt))
        .limit(limit);
}

/**
 * Replace all lines for a draft session. Snapshots current system stock from `products.stock`.
 */
export async function saveStockTakeLines(
    businessId: string,
    sessionId: string,
    lines: { productId: string; countedQty: number }[],
): Promise<boolean> {
    const { session } = (await getStockTakeSession(businessId, sessionId)) ?? {};
    if (!session || session.status !== "draft") return false;

    const pids = [...new Set(lines.map((l) => l.productId))];
    if (pids.length === 0) {
        await db.delete(stockTakeLines).where(eq(stockTakeLines.sessionId, sessionId));
        await db
            .update(stockTakeSessions)
            .set({ updatedAt: new Date() })
            .where(eq(stockTakeSessions.id, sessionId));
        return true;
    }

    const prows = await db
        .select({
            id: products.id,
            stock: products.stock,
        })
        .from(products)
        .where(
            and(
                eq(products.businessId, businessId),
                eq(products.branchId, session.branchId),
                inArray(products.id, pids),
            ),
        );

    if (prows.length !== pids.length) return false;

    const stockById = new Map(prows.map((p) => [p.id, p.stock]));

    await db.transaction(async (tx) => {
        await tx.delete(stockTakeLines).where(eq(stockTakeLines.sessionId, sessionId));

        await tx.insert(stockTakeLines).values(
            lines.map((l) => ({
                sessionId,
                productId: l.productId,
                systemQtySnapshot: stockById.get(l.productId) ?? 0,
                countedQty: Math.max(0, Math.floor(l.countedQty)),
            })),
        );

        await tx
            .update(stockTakeSessions)
            .set({ updatedAt: new Date() })
            .where(eq(stockTakeSessions.id, sessionId));
    });

    return true;
}

export async function completeStockTakeSession(
    businessId: string,
    sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    const detail = await getStockTakeSession(businessId, sessionId);
    if (!detail) return { ok: false, error: "NOT_FOUND" };
    if (detail.session.status !== "draft") return { ok: false, error: "NOT_DRAFT" };
    if (detail.lines.length === 0) return { ok: false, error: "NO_LINES" };

    await db.transaction(async (tx) => {
        for (const line of detail.lines) {
            await tx
                .update(products)
                .set({
                    stock: Math.max(0, Math.floor(line.countedQty)),
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(products.id, line.productId),
                        eq(products.businessId, businessId),
                        eq(products.branchId, detail.session.branchId),
                    ),
                );
        }

        await tx
            .update(stockTakeSessions)
            .set({
                status: "completed",
                completedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(stockTakeSessions.id, sessionId));
    });

    await invalidatePosBusinessCaches(businessId, detail.session.branchId);
    return { ok: true };
}
