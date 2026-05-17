import { NextResponse } from "next/server";
import { processDueExpenseSchedules } from "@/server/finance/expense-schedule-service";

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    const isLocal = process.env.NODE_ENV === "development";

    if (!isLocal && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await processDueExpenseSchedules(new Date());
        return NextResponse.json({ success: true, ...result });
    } catch (e) {
        console.error("Cron expense-schedules:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
