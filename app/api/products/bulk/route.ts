import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { generateSku, saveProductsBulk } from "@/server/products/product-service";
import { syncTenantProductsBulk } from "@/server/catalog/master-catalog-service";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { generateSlug } from "@/app/lib/catalog-utils";
import { toStockQty } from "@/server/stock/sellable-stock";

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseMoney(value: unknown): string | null {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        return value.toFixed(2);
    }
    const n = Number(String(value ?? "").replace(/,/g, "").trim());
    if (!Number.isFinite(n) || n < 0) return null;
    return n.toFixed(2);
}

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

        const preparedItems = items
            .map((item: Record<string, unknown>) => {
                const name = String(item?.name ?? "").trim();
                const priceGhs = parseMoney(item?.priceGhs);
                if (!name || !priceGhs) return null;

                const costRaw = item?.costPriceGhs;
                const costPriceGhs =
                    costRaw === null || costRaw === undefined || String(costRaw).trim() === ""
                        ? null
                        : parseMoney(costRaw);

                const categoryId =
                    typeof item.categoryId === "string" && UUID_RE.test(item.categoryId)
                        ? item.categoryId
                        : null;

                const sku = generateSku();
                const barcodeRaw = String(item.barcode ?? "").trim();
                const status = item.status === "archived" ? "archived" : "active";
                const imageSrc =
                    typeof item.imageSrc === "string" && item.imageSrc.trim()
                        ? item.imageSrc.trim()
                        : null;
                const tagIds = Array.isArray(item.tagIds)
                    ? item.tagIds.filter(
                          (id): id is string => typeof id === "string" && UUID_RE.test(id),
                      )
                    : [];
                const variations = Array.isArray(item.variations)
                    ? item.variations
                          .map((v: Record<string, unknown>) => ({
                              type: String(v?.type ?? "").trim(),
                              name: String(v?.name ?? "").trim(),
                              priceGhs: parseMoney(v?.priceGhs) ?? priceGhs,
                              stock: Math.max(0, toStockQty(v?.stock)),
                          }))
                          .filter((v) => v.type && v.name)
                    : [];

                return {
                    name,
                    slug: `${generateSlug(name)}-${Math.random().toString(36).substring(2, 7)}`,
                    sku,
                    barcode: barcodeRaw || null,
                    description: String(item.description ?? "").trim() || null,
                    imageSrc,
                    priceGhs,
                    costPriceGhs,
                    stock: Math.max(0, toStockQty(item.stock)),
                    reorderAt: Math.max(0, parseInt(String(item.reorderAt ?? "0"), 10) || 0),
                    unit:
                        typeof item.unit === "string" && item.unit.trim().length > 0
                            ? item.unit.trim().toLowerCase().slice(0, 20)
                            : "piece",
                    categoryId,
                    status,
                    tagIds,
                    variations,
                };
            })
            .filter((row): row is NonNullable<typeof row> => row !== null);

        if (preparedItems.length === 0) {
            return NextResponse.json(
                { error: "No valid products to import. Name and price are required." },
                { status: 400 },
            );
        }

        const result = await saveProductsBulk(payload.bid, branchId, preparedItems);

        syncTenantProductsBulk(
            result.map((r) => r.id),
            payload.bid
        );

        return NextResponse.json({
            success: true,
            count: result.length,
            message: `Successfully imported ${result.length} products.`,
        });
    } catch (error) {
        console.error("POST /api/products/bulk failed:", error);
        return NextResponse.json({ error: "Bulk import failed" }, { status: 500 });
    }
}
