import { eq, sql, and, gte, lte, desc } from "drizzle-orm";
import { db } from "../db";
import { sales } from "../db/schema/sales";
import { expenses } from "../db/schema/expenses";
import { redis } from "../lib/redis";

const CACHE_KEYS = {
    FINANCE_OVERVIEW: (bizId: string, brn?: string | null) => `finance:biz_${bizId}:brn_${brn || 'all'}:overview`,
    EXPENSES_LIST: (bizId: string, brn?: string | null) => `finance:biz_${bizId}:brn_${brn || 'all'}:expenses`,
};

function salesBranchFilter(branchId?: string | null) {
    return branchId ? eq(sales.branchId, branchId) : undefined;
}

function expenseBranchFilter(branchId?: string | null) {
    return branchId ? eq(expenses.branchId, branchId) : undefined;
}

export async function getFinanceOverview(businessId: string, branchId?: string | null) {
    const cacheKey = CACHE_KEYS.FINANCE_OVERVIEW(businessId, branchId);
    const cached = await redis.get(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fall through */ }
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch in parallel
    const [
        [totalSalesMetrics],
        [totalExpensesMetrics],
        dailyRevenue,
        dailyExpenses,
        expenseBreakdown30d
    ] = await Promise.all([
        // Income for 30 days
        db.select({
            totalRevenue: sql<string>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(and(
                eq(sales.businessId, businessId),
                salesBranchFilter(branchId),
                eq(sales.status, "completed"),
                gte(sales.createdAt, thirtyDaysAgo)
            )),

        // Expenses for 30 days
        db.select({
            totalExpenses: sql<string>`COALESCE(SUM(${expenses.amountGhs}::numeric), 0)`,
        })
            .from(expenses)
            .where(and(
                eq(expenses.businessId, businessId),
                expenseBranchFilter(branchId),
                gte(expenses.date, thirtyDaysAgo)
            )),

        // Daily revenue (Last 7 Days)
        db.select({
            date: sql<string>`TO_CHAR(${sales.createdAt} AT TIME Zone 'Africa/Accra', 'Dy')`,
            dateKey: sql<string>`TO_CHAR(${sales.createdAt} AT TIME Zone 'Africa/Accra', 'YYYY-MM-DD')`,
            revenue: sql<string>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(and(
                eq(sales.businessId, businessId),
                salesBranchFilter(branchId),
                gte(sales.createdAt, sevenDaysAgo),
                eq(sales.status, "completed")
            ))
            .groupBy(sql`TO_CHAR(${sales.createdAt} AT TIME Zone 'Africa/Accra', 'Dy')`, sql`TO_CHAR(${sales.createdAt} AT TIME Zone 'Africa/Accra', 'YYYY-MM-DD')`)
            .orderBy(sql`TO_CHAR(${sales.createdAt} AT TIME Zone 'Africa/Accra', 'YYYY-MM-DD')`),

        // Daily expenses (Last 7 Days)
        db.select({
            date: sql<string>`TO_CHAR(${expenses.date} AT TIME ZONE 'Africa/Accra', 'Dy')`,
            dateKey: sql<string>`TO_CHAR(${expenses.date} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`,
            amount: sql<string>`COALESCE(SUM(${expenses.amountGhs}::numeric), 0)`,
        })
            .from(expenses)
            .where(and(
                eq(expenses.businessId, businessId),
                expenseBranchFilter(branchId),
                gte(expenses.date, sevenDaysAgo)
            ))
            .groupBy(sql`TO_CHAR(${expenses.date} AT TIME ZONE 'Africa/Accra', 'Dy')`, sql`TO_CHAR(${expenses.date} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`)
            .orderBy(sql`TO_CHAR(${expenses.date} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`),

        // Breakdown (Last 30 Days)
        db.select({
            category: expenses.category,
            value: sql<string>`COALESCE(SUM(${expenses.amountGhs}::numeric), 0)`,
        })
            .from(expenses)
            .where(and(
                eq(expenses.businessId, businessId),
                expenseBranchFilter(branchId),
                gte(expenses.date, thirtyDaysAgo)
            ))
            .groupBy(expenses.category)
            .orderBy(desc(sql`SUM(${expenses.amountGhs}::numeric)`))
    ]);

    const totalRev = Number(totalSalesMetrics?.totalRevenue ?? 0);
    const totalExp = Number(totalExpensesMetrics?.totalExpenses ?? 0);
    const netProfit = totalRev - totalExp;

    const trendMap = new Map<string, { date: string, revenue: number, expenses: number }>();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        // Ensure consistent date keys timezone logic, use local date parts simply
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d);
        trendMap.set(dateKey, { date: dayLabel, revenue: 0, expenses: 0 });
    }

    dailyRevenue.forEach(r => {
        if (trendMap.has(r.dateKey)) trendMap.get(r.dateKey)!.revenue = Number(r.revenue);
    });
    dailyExpenses.forEach(e => {
        if (trendMap.has(e.dateKey)) trendMap.get(e.dateKey)!.expenses = Number(e.amount);
    });

    const categoryColors: Record<string, string> = {
        "Payroll": "#006c49",
        "Inventory": "#0ea5e9",
        "Utilities": "#f59e0b",
        "Marketing": "#8b5cf6",
        "Misc": "#64748b"
    };

    const colors = ["#006c49", "#0ea5e9", "#f59e0b", "#8b5cf6", "#64748b", "#ec4899", "#14b8a6"];

    const overview = {
        totalRevenue: totalRev,
        totalExpenses: totalExp,
        netProfit,
        trends: Array.from(trendMap.values()),
        expenseBreakdown: expenseBreakdown30d.map((cb, idx) => ({
            category: cb.category,
            value: Number(cb.value),
            color: categoryColors[cb.category] || colors[idx % colors.length]
        }))
    };

    await redis.setex(cacheKey, 30, JSON.stringify(overview));
    return overview;
}

export async function getExpensesList(businessId: string, branchId?: string | null) {
    const cacheKey = CACHE_KEYS.EXPENSES_LIST(businessId, branchId);
    const cached = await redis.get(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fall through */ }
    }

    const list = await db.select()
        .from(expenses)
        .where(and(eq(expenses.businessId, businessId), expenseBranchFilter(branchId)))
        .orderBy(desc(expenses.date), desc(expenses.createdAt))
        .limit(100);

    const formattedList = list.map(e => ({
        id: e.id,
        date: e.date.toISOString(),
        description: e.description,
        category: e.category,
        amount: Number(e.amountGhs),
        status: e.status,
    }));

    await redis.setex(cacheKey, 30, JSON.stringify(formattedList));
    return formattedList;
}

export async function createExpense(businessId: string, data: { date: Date, description: string, category: string, amountGhs: number, status: "Paid" | "Pending" }, branchId?: string | null) {
    const [expense] = await db
        .insert(expenses)
        .values({
            businessId,
            branchId: branchId ?? null,
            date: data.date,
            description: data.description,
            category: data.category,
            amountGhs: String(data.amountGhs),
            status: data.status,
        })
        .returning();

    // Invalidate caches
    await Promise.all([
        redis.del(CACHE_KEYS.FINANCE_OVERVIEW(businessId, branchId)),
        redis.del(CACHE_KEYS.EXPENSES_LIST(businessId, branchId)),
        redis.del(CACHE_KEYS.FINANCE_OVERVIEW(businessId)),
        redis.del(CACHE_KEYS.EXPENSES_LIST(businessId)),
    ]);

    return expense;
}
export async function updateExpenseStatus(businessId: string, id: string, status: "Paid" | "Pending") {
    const [expense] = await db
        .update(expenses)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(expenses.id, id), eq(expenses.businessId, businessId)))
        .returning();

    if (!expense) return null;

    // Invalidate caches
    await Promise.all([
        redis.del(CACHE_KEYS.FINANCE_OVERVIEW(businessId, expense.branchId)),
        redis.del(CACHE_KEYS.EXPENSES_LIST(businessId, expense.branchId)),
        redis.del(CACHE_KEYS.FINANCE_OVERVIEW(businessId)),
        redis.del(CACHE_KEYS.EXPENSES_LIST(businessId)),
    ]);

    return expense;
}
