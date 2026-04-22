import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { db } from "@/server/db";
import { sales, saleItems, REVENUE_SALE_STATUSES } from "@/server/db/schema/sales";
import { products, categories } from "@/server/db/schema/products";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { getActiveBranchId } from "@/server/auth/get-branch-id";

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);

        // Standard filters — revenue-bearing sales only (excludes fully refunded / voided)
        const filters = [
            eq(sales.businessId, payload.bid),
            inArray(sales.status, REVENUE_SALE_STATUSES),
        ];
        if (branchId) filters.push(eq(sales.branchId, branchId));

        // 1. Basic Revenue Metrics from Sales Table
        const revenueResult = await db.select({
            totalRevenue: sql<string>`COALESCE(SUM(${sales.totalGhs}), 0)`,
        })
            .from(sales)
            .where(and(...filters));

        const totalRevenue = Number(revenueResult[0].totalRevenue);

        // 2. COGS calculation (Sale Items joined with Products for costPrice)
        // Note: This assumes current costPrice as historical is not stored in saleItems yet.
        const cogsResult = await db.select({
            totalCost: sql<string>`COALESCE(SUM((${saleItems.quantity} - ${saleItems.quantityReturned}) * ${products.costPriceGhs}), 0)`,
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .innerJoin(products, eq(saleItems.productId, products.id))
            .where(and(...filters));

        const totalCogs = Number(cogsResult[0].totalCost);
        const netProfit = totalRevenue - totalCogs;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        // 3. Profitability by Category
        const categoryStats = await db.select({
            name: categories.name,
            revenue: sql<string>`SUM(${saleItems.lineTotalGhs})`,
            cost: sql<string>`SUM((${saleItems.quantity} - ${saleItems.quantityReturned}) * ${products.costPriceGhs})`,
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .innerJoin(products, eq(saleItems.productId, products.id))
            .innerJoin(categories, eq(products.categoryId, categories.id))
            .where(and(...filters))
            .groupBy(categories.id)
            .orderBy(desc(sql`SUM(${saleItems.lineTotalGhs})`));

        // 4. Top Profitable Item (by Margin)
        const topItemResult = await db.select({
            name: products.name,
            margin: sql<string>`((${products.priceGhs} - ${products.costPriceGhs}) / NULLIF(${products.priceGhs}, 0)) * 100`,
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .innerJoin(products, eq(saleItems.productId, products.id))
            .where(and(...filters))
            .orderBy(desc(sql`((${products.priceGhs} - ${products.costPriceGhs}) / NULLIF(${products.priceGhs}, 0))`))
            .limit(1);

        return NextResponse.json({
            revenue: totalRevenue,
            cogs: totalCogs,
            netProfit,
            profitMargin,
            categories: categoryStats.map(c => ({
                label: c.name,
                revenue: Number(c.revenue),
                cost: Number(c.cost),
                margin: Number(c.revenue) > 0 ? ((Number(c.revenue) - Number(c.cost)) / Number(c.revenue)) * 100 : 0
            })),
            topItem: topItemResult[0] ? {
                name: topItemResult[0].name,
                margin: Number(topItemResult[0].margin)
            } : null
        });

    } catch (error) {
        console.error("GET /api/sales/profit failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
