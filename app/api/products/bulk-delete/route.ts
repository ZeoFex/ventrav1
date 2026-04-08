import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getActiveBranchId } from "@/server/auth/get-branch-id";
import { db } from "@/server/db";
import { products } from "@/server/db/schema/products";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyAccessToken(token);
    const branchId = getActiveBranchId(cookieStore);
    if (!branchId) return NextResponse.json({ error: "Select a specific branch" }, { status: 400 });

    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    await db.delete(products).where(
      and(
        eq(products.businessId, payload.bid),
        branchId !== "all" ? eq(products.branchId, branchId) : undefined,
        inArray(products.id, ids)
      )
    );

    const { redis } = await import("@/server/lib/redis");
    await Promise.all([
      redis.del(`products:biz_${payload.bid}:brn_${branchId || 'all'}:list`),
      redis.del(`products:biz_${payload.bid}:brn_all:list`),
    ]);

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("Bulk delete failed:", err);
    return NextResponse.json({ error: "Bulk delete failed" }, { status: 500 });
  }
}
