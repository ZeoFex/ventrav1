import { NextResponse } from "next/server";
import { requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema/notifications";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";

export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

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
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

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
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

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
