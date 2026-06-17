import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { lte, eq, and, gt } from "drizzle-orm";
import {
    notifySubscriptionExpiring,
    notifySubscriptionPastDue,
} from "@/server/platform/platform-notification-service";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Only accessible via Vercel Cron or authorized request
export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    const isLocal = process.env.NODE_ENV === "development";

    if (!isLocal && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * MS_PER_DAY);

        const expired = await db
            .update(businesses)
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

        for (const biz of expired) {
            notifySubscriptionPastDue(biz.id, biz.name);
        }

        const expiring = await db
            .select({
                id: businesses.id,
                name: businesses.name,
                currentPeriodEnd: businesses.currentPeriodEnd,
            })
            .from(businesses)
            .where(
                and(
                    eq(businesses.subscriptionStatus, "active"),
                    gt(businesses.currentPeriodEnd, now),
                    lte(businesses.currentPeriodEnd, sevenDaysFromNow)
                )
            );

        for (const biz of expiring) {
            if (!biz.currentPeriodEnd) continue;
            const daysLeft = Math.max(
                1,
                Math.ceil((biz.currentPeriodEnd.getTime() - now.getTime()) / MS_PER_DAY)
            );
            notifySubscriptionExpiring(biz.id, biz.name, daysLeft);
        }

        return NextResponse.json({
            success: true,
            expiredCount: expired.length,
            expiredBusinesses: expired.map((r) => r.id),
            expiringCount: expiring.length,
            expiringBusinesses: expiring.map((r) => r.id),
        });
    } catch (error) {
        console.error("Cron Job Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
