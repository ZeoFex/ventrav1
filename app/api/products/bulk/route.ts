import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { saveProductsBulk } from "@/server/products/product-service";
import { syncTenantProductsBulk } from "@/server/catalog/master-catalog-service";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { generateSlug } from "@/app/lib/catalog-utils";

export async function POST(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

        if (!branchId) {
            return NextResponse.json({ error: "Select a specific branch to import products." }, { status: 400 });
        }

        const { items } = await req.json();

        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ error: "Invalid items" }, { status: 400 });
        }

        // Prepare items with slugs
        const preparedItems = items.map(item => ({
            ...item,
            slug: item.slug || generateSlug(item.name || "unnamed-product") + "-" + Math.random().toString(36).substring(2, 7),
            priceGhs: item.priceGhs?.toString() || "0",
            stock: parseInt(item.stock) || 0,
            reorderAt: parseInt(item.reorderAt) || 0,
            unit: (typeof item.unit === "string" && item.unit.trim().length > 0
                ? item.unit.trim().toLowerCase().slice(0, 20)
                : "piece"),
        }));

        const result = await saveProductsBulk(payload.bid, branchId, preparedItems);

        syncTenantProductsBulk(
            result.map((r) => r.id),
            payload.bid
        );

        return NextResponse.json({
            success: true, 
            count: result.length,
            message: `Successfully imported ${result.length} products.` 
        });
    } catch (error) {
        console.error("POST /api/products/bulk failed:", error);
        return NextResponse.json({ error: "Bulk import failed" }, { status: 500 });
    }
}
