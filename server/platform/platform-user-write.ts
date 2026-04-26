import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema/users";

/** @see `userStatusEnum` in schema */
type UserStatus = "pending_verification" | "active" | "suspended" | "deactivated";

/**
 * Superadmin: set account status (suspend, reactivate, etc.). Scoped by business to avoid id guessing.
 */
export async function setPlatformUserStatus(
    userId: string,
    businessId: string,
    status: UserStatus
): Promise<{ updated: boolean }> {
    const r = await db
        .update(users)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(users.id, userId), eq(users.businessId, businessId)))
        .returning({ id: users.id });
    return { updated: r.length > 0 };
}

export async function assertUserInBusiness(userId: string, businessId: string): Promise<boolean> {
    const [row] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.businessId, businessId)))
        .limit(1);
    return !!row;
}
