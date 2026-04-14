import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { STARTER_TRIAL_DAYS } from "@/config/plans";

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) {
            return NextResponse.json({ user: null });
        }

        const payload = await verifyAccessToken(token);

        // Always fetch fresh data from DB — never rely solely on JWT for mutable fields like plan
        const { db } = await import("@/server/db");
        const { users } = await import("@/server/db/schema/users");
        const { businesses } = await import("@/server/db/schema/businesses");
        const { eq } = await import("drizzle-orm");

        const [userDb] = await db
            .select({
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                avatarUrl: users.avatarUrl,
                plan: businesses.plan,
                subscriptionStatus: businesses.subscriptionStatus,
                currentPeriodEnd: businesses.currentPeriodEnd,
                createdAt: businesses.createdAt,
                businessType: businesses.businessType,
            })
            .from(users)
            .innerJoin(businesses, eq(users.businessId, businesses.id))
            .where(eq(users.id, payload.sub))
            .limit(1);

        const isEpoch = userDb?.currentPeriodEnd && new Date(userDb.currentPeriodEnd).getTime() === 0;
        const computedPeriodEnd = (userDb?.currentPeriodEnd && !isEpoch)
            ? userDb.currentPeriodEnd
            : (userDb?.createdAt
                  ? new Date(
                        new Date(userDb.createdAt).getTime() +
                            STARTER_TRIAL_DAYS * 24 * 60 * 60 * 1000,
                    ).toISOString()
                  : null);

        const response = NextResponse.json({
            user: {
                id: payload.sub,
                name: userDb?.firstName || payload.name,
                businessId: payload.bid,
                role: payload.role,
                branchId: payload.brn,
                email: userDb?.email || payload.email,
                avatarUrl: userDb?.avatarUrl || payload.img,
                permissions: payload.perms,
                plan: userDb?.plan || payload.plan || "starter",
                subscriptionStatus: (userDb?.subscriptionStatus === "past_due" && isEpoch) ? "active" : (userDb?.subscriptionStatus || "active"),
                currentPeriodEnd: computedPeriodEnd,
                businessType: userDb?.businessType || null,
            }
        });

        // Prevent any caching of session data so plan changes are always fresh
        response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
        response.headers.set("Pragma", "no-cache");
        return response;
    } catch (error) {
        return NextResponse.json({ user: null });
    }
}
