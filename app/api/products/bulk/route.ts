import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { saveProductsBulk } from "@/server/products/product-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getActiveBranchId } from "@/server/auth/get-branch-id";
import { generateSlug } from "@/app/lib/catalog-utils";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);

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
