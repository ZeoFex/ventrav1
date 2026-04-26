import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { db } from "@/server/db";
import { products } from "@/server/db/schema/products";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const auth = await requireUserAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { payload } = auth;
    const branchId = await getActiveBranchIdFromContext();
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
