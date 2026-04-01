import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema/notifications";
import { eq, and } from "drizzle-orm";
import { COOKIE_NAMES } from "@/server/config/auth-config";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);

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
