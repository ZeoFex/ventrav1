import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { lte, eq, and } from "drizzle-orm";

// Only accessible via Vercel Cron or authorized request
export async function GET(request: Request) {
    // Basic security to ensure this is a Vercel Cron job
    const authHeader = request.headers.get("authorization");
    const isLocal = process.env.NODE_ENV === "development";
    
    if (!isLocal && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        
        // Find businesses where the current period has ended and they are still active
        const result = await db.update(businesses)
            .set({ 
                subscriptionStatus: "past_due",
                updatedAt: now,
            })
            .where(
                and(
                    eq(businesses.subscriptionStatus, "active"),
                    lte(businesses.currentPeriodEnd, now)
                )
            )
            .returning({ id: businesses.id, name: businesses.name });

        return NextResponse.json({
            success: true,
            expiredCount: result.length,
            expiredBusinesses: result.map(r => r.id)
        });
    } catch (error) {
        console.error("Cron Job Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
