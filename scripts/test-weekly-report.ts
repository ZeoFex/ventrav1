import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local BEFORE importing any app code
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Import only types at the top level to avoid triggering env.ts validation early
import type { WeeklyStats } from "../server/lib/reporting-service";

async function main() {
    // Dynamic imports to ensure env.ts validation runs AFTER dotenv.config()
    const { generateWeeklyExcelReport } = await import("../server/lib/reporting-service");
    const { sendWeeklyReportEmail } = await import("../server/auth/email-service");
    const args = process.argv.slice(2);
    const emailArg = args.find(a => a.startsWith("--email="))?.split("=")[1];

    if (!emailArg) {
        console.error("❌ Please provide a target email: --email=your@email.com");
        process.exit(1);
    }

    console.log(`🚀 Starting Mockup Report Flow for ${emailArg}...`);

    // 1. Mock Data (High-performance simulation)
    const mockStats: WeeklyStats = {
        revenue: "14580.50",
        profit: "4374.15",
        orders: 124,
        topProducts: [
            { name: "Premium Coffee Beans (1kg)", quantity: 45, revenue: "2250.00" },
            { name: "Single Origin Espresso", quantity: 38, revenue: "1140.00" },
            { name: "VentraPOS Pro Terminal", quantity: 12, revenue: "8400.00" },
            { name: "Thermal Paper Rolls (Pack 10)", quantity: 24, revenue: "480.00" },
            { name: "Organic Tea Sampler", quantity: 18, revenue: "310.50" },
        ],
        lowStockCount: 7,
    };

    const businessName = "Ventra Coffee Co. (Mockup)";
    const reportDate = "Apr 01 - Apr 07, 2026";

    try {
        // 2. Generate Premium Excel
        console.log("📊 Generating Advanced Excel Report...");
        const excelBuffer = await generateWeeklyExcelReport(businessName, mockStats);

        // 3. Send Advanced UI Email
        console.log("✉️ Sending Advanced Email Template via Resend...");
        const emailResult = await sendWeeklyReportEmail({
            to: emailArg,
            businessName,
            reportDate,
            stats: mockStats,
            excelBuffer,
        });

        if (!emailResult.success) {
            throw new Error(`Email failed: ${JSON.stringify(emailResult.error)}`);
        }

        // 4. Save to DB (optional/test-only)
        // Find or create a test business to satisfy foreign key constraints if needed, 
        // or just log that we would save it.
        console.log("💾 Mockup record would be stored in 'reports' table.");

        console.log("✅ Mockup Report successfully sent! Check your inbox.");
        
    } catch (error) {
        console.error("❌ Mockup Flow Failed:", error);
    } finally {
        process.exit(0);
    }
}

main().catch(console.error);
