import { NextRequest, NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { db } from "@/server/db";
import { sales, saleItems, REVENUE_SALE_STATUSES } from "@/server/db/schema/sales";
import { products, categories } from "@/server/db/schema/products";
import { expenses } from "@/server/db/schema/expenses";
import { eq, and, sql, desc, inArray, gte, lte } from "drizzle-orm";

function utcDayStart(isoDate: string): Date {
    return new Date(`${isoDate}T00:00:00.000Z`);
}

function utcDayEnd(isoDate: string): Date {
    return new Date(`${isoDate}T23:59:59.999Z`);
}

export async function GET(req: NextRequest) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

        const fromStr = req.nextUrl.searchParams.get("from");
        const toStr = req.nextUrl.searchParams.get("to");

        // Standard filters — revenue-bearing sales only (excludes fully refunded / voided)
        const filters = [
            eq(sales.businessId, payload.bid),
            inArray(sales.status, REVENUE_SALE_STATUSES),
        ];
        if (branchId) filters.push(eq(sales.branchId, branchId));
        if (fromStr?.match(/^\d{4}-\d{2}-\d{2}$/)) {
            filters.push(gte(sales.createdAt, utcDayStart(fromStr)));
        }
        if (toStr?.match(/^\d{4}-\d{2}-\d{2}$/)) {
            filters.push(lte(sales.createdAt, utcDayEnd(toStr)));
        }

        const expenseConds = [
            eq(expenses.businessId, payload.bid),
            eq(expenses.status, "Paid"),
        ];
        if (branchId) expenseConds.push(eq(expenses.branchId, branchId));
        if (fromStr?.match(/^\d{4}-\d{2}-\d{2}$/)) {
            expenseConds.push(gte(expenses.date, utcDayStart(fromStr)));
        }
        if (toStr?.match(/^\d{4}-\d{2}-\d{2}$/)) {
            expenseConds.push(lte(expenses.date, utcDayEnd(toStr)));
        }

        // 1. Basic Revenue Metrics from Sales Table
        const revenueResult = await db.select({
            totalRevenue: sql<string>`COALESCE(SUM(${sales.totalGhs}), 0)`,
        })
            .from(sales)
            .where(and(...filters));

        const totalRevenue = Number(revenueResult[0].totalRevenue);

        // 2. COGS — uses current product cost per unit (not frozen at sale time).
        const unitCost = sql<string>`COALESCE(${products.costPriceGhs}::numeric, 0)`;
        const cogsResult = await db.select({
            totalCost: sql<string>`COALESCE(SUM((${saleItems.quantity} - ${saleItems.quantityReturned}) * ${unitCost}), 0)`,
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .innerJoin(products, eq(saleItems.productId, products.id))
            .where(and(...filters));

        const totalCogs = Number(cogsResult[0].totalCost);
        /** @deprecated Label as gross profit in UI — kept for backward compatibility. */
        const netProfit = totalRevenue - totalCogs;
        const grossProfit = netProfit;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        const [expenseAgg] = await db
            .select({
                total: sql<string>`COALESCE(SUM(${expenses.amountGhs}::numeric), 0)`,
            })
            .from(expenses)
            .where(and(...expenseConds));

        const operatingExpenses = Number(expenseAgg?.total ?? 0);
        const netOperatingProfit = grossProfit - operatingExpenses;
        const netOperatingMargin =
            totalRevenue > 0 ? (netOperatingProfit / totalRevenue) * 100 : 0;

        // 3. Profitability by Category
        const categoryStats = await db.select({
            name: categories.name,
            revenue: sql<string>`SUM(${saleItems.lineTotalGhs})`,
            cost: sql<string>`SUM((${saleItems.quantity} - ${saleItems.quantityReturned}) * ${unitCost})`,
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .innerJoin(products, eq(saleItems.productId, products.id))
            .innerJoin(categories, eq(products.categoryId, categories.id))
            .where(and(...filters))
            .groupBy(categories.id)
            .orderBy(desc(sql`SUM(${saleItems.lineTotalGhs})`));

        // 4. Top item by realized margin (uses list price vs cost on the product row)
        const marginExpr = sql`((${products.priceGhs}::numeric - COALESCE(${products.costPriceGhs}::numeric, 0)) / NULLIF(${products.priceGhs}::numeric, 0)) * 100`;
        const topItemResult = await db.select({
            name: products.name,
            margin: marginExpr,
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .innerJoin(products, eq(saleItems.productId, products.id))
            .where(and(...filters))
            .orderBy(desc(marginExpr))
            .limit(1);

        return NextResponse.json({
            revenue: totalRevenue,
            cogs: totalCogs,
            grossProfit,
            operatingExpenses,
            netOperatingProfit,
            netOperatingMargin,
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
