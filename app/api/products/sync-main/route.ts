import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { branches } from "@/server/db/schema/branches";
import { products, categories, tags } from "@/server/db/schema/products";
import { eq, and } from "drizzle-orm";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getActiveBranchId } from "@/server/auth/get-branch-id";
import { redis } from "@/server/lib/redis";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
        const activeBranchId = getActiveBranchId(cookieStore);

        if (!activeBranchId || activeBranchId === "all") {
            return NextResponse.json({ error: "Please select a specific branch to sync into." }, { status: 400 });
        }

        // 1. Find the main branch for this business
        const mainBranches = await db.select().from(branches)
            .where(and(eq(branches.businessId, payload.bid), eq(branches.isMain, true)))
            .limit(1);

        if (!mainBranches.length) {
            return NextResponse.json({ error: "No main branch found for this business." }, { status: 404 });
        }
        const mainBranchId = mainBranches[0].id;

        if (mainBranchId === activeBranchId) {
            return NextResponse.json({ error: "You are already in the main branch." }, { status: 400 });
        }

        // 2. Fetch active branch details, main products, local products, main categories, local categories
        const [activeBranch, mainProducts, localProducts, mainCategories, localCategories] = await Promise.all([
            db.select().from(branches).where(eq(branches.id, activeBranchId)).limit(1),
            db.select().from(products).where(and(eq(products.businessId, payload.bid), eq(products.branchId, mainBranchId))),
            db.select().from(products).where(and(eq(products.businessId, payload.bid), eq(products.branchId, activeBranchId))),
            db.select().from(categories).where(and(eq(categories.businessId, payload.bid), eq(categories.branchId, mainBranchId))),
            db.select().from(categories).where(and(eq(categories.businessId, payload.bid), eq(categories.branchId, activeBranchId))),
        ]);

        const branchSuffix = activeBranch[0]?.code || activeBranch[0]?.name.substring(0, 3).toUpperCase() || "BRN";

        if (mainProducts.length === 0) {
            return NextResponse.json({ count: 0, message: "No products to import from main branch." });
        }

        // 3. Create mapping for categories (main category ID -> local category ID)
        const categoryMap = new Map<string, string>();
        for (const mainCat of mainCategories) {
            const localCat = localCategories.find(c => c.slug === mainCat.slug);
            if (localCat) {
                categoryMap.set(mainCat.id, localCat.id);
            }
        }

        const localProductsSkus = new Set(localProducts.map(p => p.sku || p.slug));

        // 4. Identify missing products from main
        const missingProducts = mainProducts.filter(p => !localProductsSkus.has(p.sku || p.slug));

        if (missingProducts.length === 0) {
            return NextResponse.json({ count: 0, message: "Products already up-to-date." });
        }

        // 5. Insert missing products
        const toInsert = missingProducts.map(p => ({
            businessId: payload.bid,
            branchId: activeBranchId,
            categoryId: p.categoryId ? (categoryMap.get(p.categoryId) || null) : null,
            name: p.name,
            slug: `${p.slug}-${branchSuffix.toLowerCase()}`,
            description: p.description,
            sku: p.sku ? `${p.sku}-${branchSuffix}` : `${p.slug.toUpperCase()}-${branchSuffix}`,
            barcode: p.barcode,
            imageSrc: p.imageSrc,
            priceGhs: p.priceGhs,
            costPriceGhs: p.costPriceGhs,
            stock: 0, // Fresh branch starts with zero stock by default
            reorderAt: p.reorderAt,
            status: p.status,
            tagIds: null, // Skip tags logic for brevity in clone, usually ok
        }));

        await db.insert(products).values(toInsert);

        // 6. Invalidate cache
        await Promise.all([
            redis.del(`products:biz_${payload.bid}:brn_${activeBranchId || 'all'}:list`),
            redis.del(`products:biz_${payload.bid}:brn_all:list`)
        ]);

        return NextResponse.json({
            success: true,
            count: missingProducts.length,
            message: `Successfully imported ${missingProducts.length} products.`
        });
    } catch (err) {
        console.error("Failed to sync products:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
