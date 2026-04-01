import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema/notifications";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getActiveBranchId } from "@/server/auth/get-branch-id";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);

        let query;
        if (branchId && branchId !== "all") {
            // Include branch-specific OR global notifications
            query = db.select()
                .from(notifications)
                .where(
                    and(
                        eq(notifications.businessId, payload.bid),
                        or(
                            eq(notifications.branchId, branchId),
                            isNull(notifications.branchId)
                        )
                    )
                )
                .orderBy(desc(notifications.createdAt))
                .limit(50);
        } else {
            query = db.select()
                .from(notifications)
                .where(eq(notifications.businessId, payload.bid))
                .orderBy(desc(notifications.createdAt))
                .limit(50);
        }

        const data = await query;
        return NextResponse.json(data);
    } catch (error) {
        console.error("GET /api/notifications Error", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function PATCH() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);

        let condition;
        if (branchId && branchId !== "all") {
            condition = and(
                eq(notifications.businessId, payload.bid),
                or(
                    eq(notifications.branchId, branchId),
                    isNull(notifications.branchId)
                )
            );
        } else {
            condition = eq(notifications.businessId, payload.bid);
        }

        await db.update(notifications)
            .set({ isRead: true })
            .where(condition);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PATCH /api/notifications Error", error);
        return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);

        const finalBranchId = branchId === "all" ? null : branchId;

        const { title, body, icon = "info" } = await req.json();

        if (!title || !body) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const [inserted] = await db
            .insert(notifications)
            .values({
                businessId: payload.bid,
                branchId: finalBranchId,
                title,
                body,
                icon,
            })
            .returning();

        return NextResponse.json(inserted, { status: 201 });
    } catch (error) {
        console.error("POST /api/notifications Error", error);
        return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
    }
}
