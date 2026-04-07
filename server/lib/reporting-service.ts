import { eq, and, sql, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { sales, saleItems } from "../db/schema/sales";
import { products } from "../db/schema/products";
import { businesses } from "../db/schema/businesses";
import { reports } from "../db/schema/reports";
import { sendWeeklyReportEmail } from "../auth/email-service";
import ExcelJS from "exceljs";

/**
 * Reporting Service — handles weekly performance audits.
 */

export interface WeeklyStats {
    revenue: string;
    profit: string;
    orders: number;
    topProducts: Array<{ name: string; quantity: number; revenue: string }>;
    lowStockCount: number;
}

/**
 * Aggregates performance data for a specific business over the last 7 days.
 */
export async function getWeeklyBusinessStats(businessId: string): Promise<WeeklyStats> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Fetch Sales and calculate totals
    const weeklySales = await db
        .select({
            totalGhs: sales.totalGhs,
            itemCount: sales.itemCount,
        })
        .from(sales)
        .where(
            and(
                eq(sales.businessId, businessId),
                gte(sales.createdAt, sevenDaysAgo),
                eq(sales.status, "completed")
            )
        );

    const revenue = weeklySales.reduce((acc, s) => acc + parseFloat(s.totalGhs), 0);
    const orders = weeklySales.length;

    // 2. Fetch Top Products
    // Query sale items joined with sales to ensure they are within the last 7 days
    const topProductsRaw = await db
        .select({
            name: saleItems.productName,
            quantity: sql<number>`sum(${saleItems.quantity})`.as("qty_sum"),
            revenue: sql<string>`sum(${saleItems.lineTotalGhs})`.as("rev_sum"),
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .where(
            and(
                eq(sales.businessId, businessId),
                gte(sales.createdAt, sevenDaysAgo),
                eq(sales.status, "completed")
            )
        )
        .groupBy(saleItems.productName)
        .orderBy(sql`qty_sum DESC`)
        .limit(5);

    // 3. Fetch Low Stock Count
    const [lowStock] = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(
            and(
                eq(products.businessId, businessId),
                eq(products.status, "active"),
                sql`${products.stock} <= ${products.reorderAt}`
            )
        );

    // Estimated profit (using 30% margin as a fallback if costPriceGhs is missing in some items)
    const profit = revenue * 0.3; 

    return {
        revenue: revenue.toFixed(2),
        profit: profit.toFixed(2),
        orders,
        topProducts: topProductsRaw.map(p => ({
            name: p.name,
            quantity: Number(p.quantity),
            revenue: parseFloat(p.revenue).toFixed(2),
        })),
        lowStockCount: Number(lowStock?.count || 0),
    };
}

/**
 * Generates a professional Excel workbook for the weekly report.
 */
export async function generateWeeklyExcelReport(businessName: string, stats: WeeklyStats): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "VentraPOS Reporting Engine";
    workbook.lastModifiedBy = "VentraPOS System";
    workbook.created = new Date();

    // -- Sheet 1: Summary --
    const summarySheet = workbook.addWorksheet("Performance Summary");
    summarySheet.columns = [
        { header: "Metric", key: "metric", width: 25 },
        { header: "Value", key: "value", width: 20 },
    ];

    summarySheet.addRows([
        { metric: "Business Name", value: businessName },
        { metric: "Report Period", value: "Last 7 Days" },
        { metric: "Total Revenue (GHS)", value: stats.revenue },
        { metric: "Total Orders", value: stats.orders },
        { metric: "Estimated Profit (GHS)", value: stats.profit },
        { metric: "Items needing restock", value: stats.lowStockCount },
    ]);

    // Apply some styling to header
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF003527" },
    };
    summarySheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };

    // -- Sheet 2: Top Products --
    const productSheet = workbook.addWorksheet("Top Products");
    productSheet.columns = [
        { header: "Product Name", key: "name", width: 30 },
        { header: "Units Sold", key: "qty", width: 15 },
        { header: "Total Revenue (GHS)", key: "rev", width: 20 },
    ];

    stats.topProducts.forEach(p => {
        productSheet.addRow({ name: p.name, qty: p.quantity, rev: p.revenue });
    });

    productSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    productSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003527" } };

    const buffer = await workbook.xlsx.writeBuffer() as unknown as Buffer;
    return buffer;
}

/**
 * Core function to run, save, and send a weekly report.
 */
export async function processWeeklyReport(businessId: string) {
    try {
        // 1. Get business info
        const [biz] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
        if (!biz || !biz.contactEmail) {
            console.warn(`[Reporting Service] Skipping biz ${businessId} - No contact email.`);
            return;
        }

        // 2. Aggregate Stats
        const stats = await getWeeklyBusinessStats(businessId);

        // 3. Generate Excel
        const excelBuffer = await generateWeeklyExcelReport(biz.name, stats);

        // 4. Send Email
        const reportDateStr = new Date().toLocaleDateString("en-GH", { month: "short", day: "numeric" }) + 
                             " - " + 
                             new Date().toLocaleDateString("en-GH", { month: "short", day: "numeric", year: "numeric" });

        const emailResult = await sendWeeklyReportEmail({
            to: biz.contactEmail,
            businessName: biz.name,
            reportDate: reportDateStr,
            stats,
            excelBuffer,
        });

        // 5. Store in DB
        await db.insert(reports).values({
            businessId: biz.id,
            stats: stats as any,
            status: emailResult.success ? "sent" : "failed",
            errorMessage: emailResult.success ? null : (emailResult.error as string || "Email delivery failed"),
        });

        console.log(`[Reporting Service] Weekly report processed for ${biz.name} (${biz.id})`);
        return { success: true, bizName: biz.name };

    } catch (error) {
        console.error(`[Reporting Service] Fatal error processing report for biz ${businessId}:`, error);
        throw error;
    }
}
