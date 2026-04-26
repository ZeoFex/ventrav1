import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema/notifications";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;

        // Mark the specific notification as read
        const [updated] = await db
            .update(notifications)
            .set({ isRead: true })
            .where(
                and(
                    eq(notifications.id, id),
                    eq(notifications.businessId, payload.bid) // security check
                )
            )
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Notification not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PATCH /api/notifications/[id] Error", error);
        return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
    }
}
