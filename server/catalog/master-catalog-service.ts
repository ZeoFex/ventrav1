/**
 * Master Product Catalog — reads tenant `products` + `businesses` via Drizzle,
 * aggregates into `master_products` without touching POS/inventory workflows.
 */
import {
    and,
    asc,
    count,
    desc,
    eq,
    ilike,
    inArray,
    or,
    sql,
} from "drizzle-orm";
import { db } from "../db";
import { branches } from "../db/schema/branches";
import { businesses } from "../db/schema/businesses";
import { users } from "../db/schema/users";
import {
    masterCatalogCategories,
    masterCatalogSyncLogs,
    masterProducts,
} from "../db/schema/master-catalog";
import { categories, products } from "../db/schema/products";
import {
    MASTER_CATALOG_SHOP_TYPES,
    UNCATEGORIZED_LABEL,
    normalizeCatalogText,
    resolveShopType,
    shopTypeLabel,
    slugifyCatalog,
} from "./constants";

export type MasterProductRow = typeof masterProducts.$inferSelect;
export type MasterCategoryRow = typeof masterCatalogCategories.$inferSelect;

/** API-facing product with shop name, image, and barcode. */
export type MasterProductDto = {
    id: string;
    name: string;
    shopType: string;
    shopTypeLabel: string;
    categoryName: string;
    sku: string | null;
    barcode: string | null;
    imageSrc: string | null;
    unit: string | null;
    description: string | null;
    sourceProductId: string | null;
    sourceBusinessId: string | null;
    sourceBusinessName: string | null;
    createdAt: string;
    updatedAt: string;
    syncedAt: string;
};

export type CatalogListParams = {
    limit: number;
    offset: number;
    shopType?: string;
    categoryName?: string;
    businessId?: string;
    q?: string;
    sort?: "name" | "updated" | "created";
    order?: "asc" | "desc";
};

/** Tenant shop (business) row for the catalog admin. */
export type CatalogShopDto = {
    id: string;
    name: string;
    slug: string;
    shopType: string;
    shopTypeLabel: string;
    city: string | null;
    region: string | null;
    phone: string | null;
    contactEmail: string | null;
    /** Emails from registered tenant users for this shop. */
    registeredEmails: string[];
    productCount: number;
    branchCount: number;
    plan: "starter" | "growth" | "pro";
    status: "active" | "suspended" | "deactivated";
    subscriptionStatus: "active" | "past_due" | "canceled";
    currentPeriodEnd: string | null;
    createdAt: string;
    updatedAt: string;
    onboardingCompleted: boolean;
};

/** Product from a specific shop's inventory (read-only, for catalog admin). */
export type ShopProductDto = {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    imageSrc: string | null;
    categoryName: string;
    unit: string | null;
    priceGhs: string;
    stock: number;
    status: string;
    businessId: string;
    businessName: string;
    shopType: string;
    shopTypeLabel: string;
};

export type MasterProductInput = {
    name: string;
    shopType: string;
    categoryName?: string | null;
    description?: string | null;
    imageSrc?: string | null;
    unit?: string | null;
    sku?: string | null;
    barcode?: string | null;
    sourceBusinessName?: string | null;
    sourceProductId?: string | null;
    sourceBusinessId?: string | null;
};

function categoryDisplayName(raw: string | null | undefined): string {
    const trimmed = (raw ?? "").trim();
    return trimmed.length > 0 ? trimmed : UNCATEGORIZED_LABEL;
}

function toIso(d: Date | string | null | undefined): string {
    if (!d) return new Date(0).toISOString();
    return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

async function resolveBusinessNames(
    businessIds: string[]
): Promise<Map<string, string>> {
    const unique = [...new Set(businessIds.filter(Boolean))];
    if (unique.length === 0) return new Map();

    const rows = await db
        .select({ id: businesses.id, name: businesses.name })
        .from(businesses)
        .where(inArray(businesses.id, unique));

    return new Map(rows.map((r) => [r.id, r.name]));
}

export function mapMasterProductRow(
    row: MasterProductRow,
    businessName?: string | null
): MasterProductDto {
    return {
        id: row.id,
        name: row.name,
        shopType: row.shopType,
        shopTypeLabel: shopTypeLabel(row.shopType),
        categoryName: row.categoryName,
        sku: row.sku,
        barcode: row.barcode,
        imageSrc: row.imageSrc,
        unit: row.unit,
        description: row.description,
        sourceProductId: row.sourceProductId,
        sourceBusinessId: row.sourceBusinessId,
        sourceBusinessName:
            row.sourceBusinessName ?? businessName ?? null,
        createdAt: toIso(row.createdAt),
        updatedAt: toIso(row.updatedAt),
        syncedAt: toIso(row.syncedAt),
    };
}

export async function enrichMasterProductRows(
    rows: MasterProductRow[]
): Promise<MasterProductDto[]> {
    const missingIds = rows
        .filter((r) => !r.sourceBusinessName && r.sourceBusinessId)
        .map((r) => r.sourceBusinessId as string);
    const nameMap = await resolveBusinessNames(missingIds);

    return rows.map((row) =>
        mapMasterProductRow(
            row,
            row.sourceBusinessId
                ? nameMap.get(row.sourceBusinessId) ?? null
                : null
        )
    );
}

async function ensureMasterCategory(
    shopType: string,
    categoryName: string
): Promise<string | null> {
    if (categoryName === UNCATEGORIZED_LABEL) return null;

    const slug = slugifyCatalog(categoryName);
    const existing = await db
        .select({ id: masterCatalogCategories.id })
        .from(masterCatalogCategories)
        .where(
            and(
                eq(masterCatalogCategories.shopType, shopType),
                eq(masterCatalogCategories.slug, slug)
            )
        )
        .limit(1);

    if (existing[0]) return existing[0].id;

    const [created] = await db
        .insert(masterCatalogCategories)
        .values({
            shopType,
            name: categoryName,
            slug,
        })
        .onConflictDoNothing()
        .returning({ id: masterCatalogCategories.id });

    if (created) return created.id;

    const again = await db
        .select({ id: masterCatalogCategories.id })
        .from(masterCatalogCategories)
        .where(
            and(
                eq(masterCatalogCategories.shopType, shopType),
                eq(masterCatalogCategories.slug, slug)
            )
        )
        .limit(1);
    return again[0]?.id ?? null;
}

async function writeSyncLog(input: {
    action: string;
    masterProductId?: string | null;
    sourceProductId?: string | null;
    sourceBusinessId?: string | null;
    shopType?: string | null;
    productName?: string | null;
    status: "success" | "error";
    message?: string | null;
}) {
    await db.insert(masterCatalogSyncLogs).values({
        action: input.action,
        masterProductId: input.masterProductId ?? null,
        sourceProductId: input.sourceProductId ?? null,
        sourceBusinessId: input.sourceBusinessId ?? null,
        shopType: input.shopType ?? null,
        productName: input.productName ?? null,
        status: input.status,
        message: input.message ?? null,
    });
}

export async function getShopTypesWithCounts(): Promise<
    { id: string; label: string; productCount: number }[]
> {
    const counts = await db
        .select({
            shopType: masterProducts.shopType,
            n: count(),
        })
        .from(masterProducts)
        .groupBy(masterProducts.shopType);

    const countMap = new Map(counts.map((c) => [c.shopType, Number(c.n)]));

    const dbTypes = await db
        .selectDistinct({ shopType: businesses.businessType })
        .from(businesses)
        .where(sql`${businesses.businessType} IS NOT NULL AND ${businesses.businessType} <> ''`);

    const ids = new Set<string>();
    for (const t of MASTER_CATALOG_SHOP_TYPES) ids.add(t.id);
    for (const row of dbTypes) {
        if (row.shopType) ids.add(resolveShopType(row.shopType));
    }
    for (const row of counts) ids.add(row.shopType);

    return [...ids]
        .sort((a, b) => shopTypeLabel(a).localeCompare(shopTypeLabel(b)))
        .map((id) => ({
            id,
            label: shopTypeLabel(id),
            productCount: countMap.get(id) ?? 0,
        }));
}

export async function listMasterProducts(params: CatalogListParams) {
    const conditions = [];
    if (params.shopType) {
        conditions.push(eq(masterProducts.shopType, resolveShopType(params.shopType)));
    }
    if (params.categoryName) {
        conditions.push(eq(masterProducts.categoryName, params.categoryName));
    }
    if (params.businessId) {
        conditions.push(eq(masterProducts.sourceBusinessId, params.businessId));
    }
    if (params.q?.trim()) {
        const term = `%${params.q.trim()}%`;
        conditions.push(
            or(
                ilike(masterProducts.name, term),
                ilike(masterProducts.categoryName, term),
                ilike(masterProducts.sku, term),
                ilike(masterProducts.barcode, term),
                ilike(masterProducts.sourceBusinessName, term)
            )
        );
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const sortCol =
        params.sort === "created"
            ? masterProducts.createdAt
            : params.sort === "updated"
              ? masterProducts.updatedAt
              : masterProducts.name;
    const orderFn = params.order === "desc" ? desc : asc;

    const [totalRow] = where
        ? await db.select({ n: count() }).from(masterProducts).where(where)
        : await db.select({ n: count() }).from(masterProducts);

    const rows = where
        ? await db
              .select()
              .from(masterProducts)
              .where(where)
              .orderBy(orderFn(sortCol))
              .limit(params.limit)
              .offset(params.offset)
        : await db
              .select()
              .from(masterProducts)
              .orderBy(orderFn(sortCol))
              .limit(params.limit)
              .offset(params.offset);

    const items = await enrichMasterProductRows(rows);

    return { total: totalRow?.n ?? 0, items, limit: params.limit, offset: params.offset };
}

export async function searchMasterProducts(q: string, limit = 20) {
    const term = q.trim();
    if (!term) return [];

    const pattern = `%${term}%`;
    const rows = await db
        .select()
        .from(masterProducts)
        .where(
            or(
                ilike(masterProducts.name, pattern),
                ilike(masterProducts.normalizedName, pattern),
                ilike(masterProducts.categoryName, pattern),
                ilike(masterProducts.barcode, pattern),
                ilike(masterProducts.sourceBusinessName, pattern)
            )
        )
        .orderBy(asc(masterProducts.name))
        .limit(Math.min(50, Math.max(1, limit)));

    return enrichMasterProductRows(rows);
}

export async function getMasterProductById(id: string): Promise<MasterProductDto | null> {
    const [row] = await db
        .select()
        .from(masterProducts)
        .where(eq(masterProducts.id, id))
        .limit(1);
    if (!row) return null;
    const [enriched] = await enrichMasterProductRows([row]);
    return enriched ?? null;
}

export async function createMasterProduct(input: MasterProductInput) {
    const shopType = resolveShopType(input.shopType);
    const categoryName = categoryDisplayName(input.categoryName);
    const normalizedName = normalizeCatalogText(input.name);
    const categoryId = await ensureMasterCategory(shopType, categoryName);
    const now = new Date();

    const [row] = await db
        .insert(masterProducts)
        .values({
            name: input.name.trim(),
            normalizedName,
            shopType,
            categoryId,
            categoryName,
            description: input.description ?? null,
            imageSrc: input.imageSrc ?? null,
            unit: input.unit ?? null,
            sku: input.sku ?? null,
            barcode: input.barcode ?? null,
            sourceBusinessName: input.sourceBusinessName ?? null,
            sourceProductId: input.sourceProductId ?? null,
            sourceBusinessId: input.sourceBusinessId ?? null,
            syncedAt: now,
            updatedAt: now,
        })
        .returning();

    await writeSyncLog({
        action: "manual_create",
        masterProductId: row.id,
        sourceProductId: input.sourceProductId ?? null,
        sourceBusinessId: input.sourceBusinessId ?? null,
        shopType,
        productName: row.name,
        status: "success",
    });

    return row;
}

export async function updateMasterProduct(
    id: string,
    input: Partial<MasterProductInput>
) {
    const existing = await getMasterProductById(id);
    if (!existing) return null;

    const shopType = resolveShopType(input.shopType ?? existing.shopType);
    const categoryName = categoryDisplayName(
        input.categoryName ?? existing.categoryName
    );
    const name = (input.name ?? existing.name).trim();
    const categoryId = await ensureMasterCategory(shopType, categoryName);
    const now = new Date();

    const [row] = await db
        .update(masterProducts)
        .set({
            name,
            normalizedName: normalizeCatalogText(name),
            shopType,
            categoryId,
            categoryName,
            description:
                input.description !== undefined
                    ? input.description
                    : existing.description,
            imageSrc:
                input.imageSrc !== undefined ? input.imageSrc : existing.imageSrc,
            unit: input.unit !== undefined ? input.unit : existing.unit,
            sku: input.sku !== undefined ? input.sku : existing.sku,
            barcode: input.barcode !== undefined ? input.barcode : existing.barcode,
            sourceBusinessName:
                input.sourceBusinessName !== undefined
                    ? input.sourceBusinessName
                    : existing.sourceBusinessName,
            sourceProductId:
                input.sourceProductId !== undefined
                    ? input.sourceProductId
                    : existing.sourceProductId,
            sourceBusinessId:
                input.sourceBusinessId !== undefined
                    ? input.sourceBusinessId
                    : existing.sourceBusinessId,
            updatedAt: now,
            syncedAt: now,
        })
        .where(eq(masterProducts.id, id))
        .returning();

    await writeSyncLog({
        action: "manual_update",
        masterProductId: row.id,
        shopType,
        productName: row.name,
        status: "success",
    });

    return row;
}

export async function deleteMasterProduct(id: string) {
    const existing = await getMasterProductById(id);
    if (!existing) return false;

    await db.delete(masterProducts).where(eq(masterProducts.id, id));
    await writeSyncLog({
        action: "manual_delete",
        masterProductId: id,
        shopType: existing.shopType,
        productName: existing.name,
        status: "success",
    });
    return true;
}

export async function listMasterCategories(shopType?: string) {
    const cond = shopType
        ? eq(masterCatalogCategories.shopType, resolveShopType(shopType))
        : undefined;

    const rows = cond
        ? await db
              .select()
              .from(masterCatalogCategories)
              .where(cond)
              .orderBy(asc(masterCatalogCategories.name))
        : await db
              .select()
              .from(masterCatalogCategories)
              .orderBy(
                  asc(masterCatalogCategories.shopType),
                  asc(masterCatalogCategories.name)
              );

    const productCounts = await db
        .select({
            categoryId: masterProducts.categoryId,
            categoryName: masterProducts.categoryName,
            shopType: masterProducts.shopType,
            n: count(),
        })
        .from(masterProducts)
        .groupBy(
            masterProducts.categoryId,
            masterProducts.categoryName,
            masterProducts.shopType
        );

    const countKey = (st: string, catId: string | null, catName: string) =>
        `${st}::${catId ?? ""}::${catName}`;

    const countMap = new Map(
        productCounts.map((p) => [
            countKey(p.shopType, p.categoryId, p.categoryName),
            Number(p.n),
        ])
    );

    return rows.map((r) => ({
        ...r,
        productCount:
            countMap.get(countKey(r.shopType, r.id, r.name)) ??
            countMap.get(countKey(r.shopType, r.id, UNCATEGORIZED_LABEL)) ??
            0,
    }));
}

export async function createMasterCategory(input: {
    shopType: string;
    name: string;
    description?: string | null;
}) {
    const shopType = resolveShopType(input.shopType);
    const name = input.name.trim();
    const slug = slugifyCatalog(name);

    const [row] = await db
        .insert(masterCatalogCategories)
        .values({
            shopType,
            name,
            slug,
            description: input.description ?? null,
        })
        .onConflictDoNothing()
        .returning();

    if (row) return row;

    const [existing] = await db
        .select()
        .from(masterCatalogCategories)
        .where(
            and(
                eq(masterCatalogCategories.shopType, shopType),
                eq(masterCatalogCategories.slug, slug)
            )
        )
        .limit(1);
    return existing ?? null;
}

export async function listSyncLogs(limit: number, offset: number) {
    const [totalRow] = await db.select({ n: count() }).from(masterCatalogSyncLogs);
    const items = await db
        .select()
        .from(masterCatalogSyncLogs)
        .orderBy(desc(masterCatalogSyncLogs.createdAt))
        .limit(limit)
        .offset(offset);

    return { total: totalRow?.n ?? 0, items, limit, offset };
}

export type CatalogHierarchyNode = {
    shopType: string;
    label: string;
    productCount: number;
    categories: {
        name: string;
        productCount: number;
        products: MasterProductDto[];
    }[];
};

export async function getCatalogHierarchy(params: {
    shopType?: string;
    q?: string;
    limitPerCategory?: number;
}) {
    const shopTypes = await getShopTypesWithCounts();
    const filteredTypes = params.shopType
        ? shopTypes.filter((t) => t.id === resolveShopType(params.shopType))
        : shopTypes;

    const hierarchy: CatalogHierarchyNode[] = [];

    for (const st of filteredTypes) {
        const productConditions = [eq(masterProducts.shopType, st.id)];
        if (params.q?.trim()) {
            const term = `%${params.q.trim()}%`;
            productConditions.push(
                or(
                    ilike(masterProducts.name, term),
                    ilike(masterProducts.barcode, term),
                    ilike(masterProducts.sourceBusinessName, term)
                )!
            );
        }

        const grouped = await db
            .select({
                categoryName: masterProducts.categoryName,
                n: count(),
            })
            .from(masterProducts)
            .where(and(...productConditions))
            .groupBy(masterProducts.categoryName)
            .orderBy(asc(masterProducts.categoryName));

        const perCat = params.limitPerCategory ?? 200;
        const categories: CatalogHierarchyNode["categories"] = [];

        for (const g of grouped) {
            const catProducts = await enrichMasterProductRows(
                await db
                    .select()
                    .from(masterProducts)
                    .where(
                        and(
                            eq(masterProducts.shopType, st.id),
                            eq(masterProducts.categoryName, g.categoryName),
                            params.q?.trim()
                                ? or(
                                      ilike(
                                          masterProducts.name,
                                          `%${params.q.trim()}%`
                                      ),
                                      ilike(
                                          masterProducts.barcode,
                                          `%${params.q.trim()}%`
                                      ),
                                      ilike(
                                          masterProducts.sourceBusinessName,
                                          `%${params.q.trim()}%`
                                      )
                                  )
                                : undefined
                        )
                    )
                    .orderBy(asc(masterProducts.name))
                    .limit(perCat)
            );

            categories.push({
                name: g.categoryName,
                productCount: Number(g.n),
                products: catProducts,
            });
        }

        hierarchy.push({
            shopType: st.id,
            label: st.label,
            productCount: st.productCount,
            categories,
        });
    }

    return hierarchy;
}

type TenantProductSnapshot = {
    productId: string;
    productName: string;
    businessId: string;
    businessName: string;
    shopType: string;
    categoryName: string;
    description: string | null;
    imageSrc: string | null;
    unit: string | null;
    sku: string | null;
    barcode: string | null;
};

async function loadTenantProductSnapshot(
    productId: string,
    businessId: string
): Promise<TenantProductSnapshot | null> {
    const [row] = await db
        .select({
            productId: products.id,
            productName: products.name,
            businessId: products.businessId,
            businessName: businesses.name,
            shopType: businesses.businessType,
            categoryName: categories.name,
            description: products.description,
            imageSrc: products.imageSrc,
            unit: products.unit,
            sku: products.sku,
            barcode: products.barcode,
        })
        .from(products)
        .innerJoin(businesses, eq(products.businessId, businesses.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(eq(products.id, productId), eq(products.businessId, businessId)))
        .limit(1);

    if (!row) return null;

    return {
        ...row,
        shopType: resolveShopType(row.shopType),
        categoryName: categoryDisplayName(row.categoryName),
    };
}

/**
 * Upsert one tenant product into the master catalog.
 * Safe to call fire-and-forget from product routes.
 */
export async function syncTenantProductToMasterCatalog(
    productId: string,
    businessId: string
) {
    const snap = await loadTenantProductSnapshot(productId, businessId);
    if (!snap) {
        await writeSyncLog({
            action: "sync",
            sourceProductId: productId,
            sourceBusinessId: businessId,
            status: "error",
            message: "Tenant product not found",
        });
        return null;
    }

    const normalizedName = normalizeCatalogText(snap.productName);
    const categoryId = await ensureMasterCategory(snap.shopType, snap.categoryName);
    const now = new Date();

    const existing = await db
        .select()
        .from(masterProducts)
        .where(
            and(
                eq(masterProducts.normalizedName, normalizedName),
                eq(masterProducts.shopType, snap.shopType),
                eq(masterProducts.categoryName, snap.categoryName)
            )
        )
        .limit(1);

    if (existing[0]) {
        const [updated] = await db
            .update(masterProducts)
            .set({
                name: snap.productName,
                description: snap.description,
                imageSrc: snap.imageSrc,
                unit: snap.unit,
                sku: snap.sku,
                barcode: snap.barcode,
                sourceBusinessName: snap.businessName,
                categoryId,
                sourceProductId: snap.productId,
                sourceBusinessId: snap.businessId,
                updatedAt: now,
                syncedAt: now,
            })
            .where(eq(masterProducts.id, existing[0].id))
            .returning();

        await writeSyncLog({
            action: "updated",
            masterProductId: updated.id,
            sourceProductId: snap.productId,
            sourceBusinessId: snap.businessId,
            shopType: snap.shopType,
            productName: snap.productName,
            status: "success",
        });
        return updated;
    }

    const [created] = await db
        .insert(masterProducts)
        .values({
            name: snap.productName,
            normalizedName,
            shopType: snap.shopType,
            categoryId,
            categoryName: snap.categoryName,
            description: snap.description,
            imageSrc: snap.imageSrc,
            unit: snap.unit,
            sku: snap.sku,
            barcode: snap.barcode,
            sourceBusinessName: snap.businessName,
            sourceProductId: snap.productId,
            sourceBusinessId: snap.businessId,
            syncedAt: now,
        })
        .onConflictDoUpdate({
            target: [
                masterProducts.normalizedName,
                masterProducts.shopType,
                masterProducts.categoryName,
            ],
            set: {
                name: snap.productName,
                description: snap.description,
                imageSrc: snap.imageSrc,
                unit: snap.unit,
                sku: snap.sku,
                barcode: snap.barcode,
                sourceBusinessName: snap.businessName,
                categoryId,
                sourceProductId: snap.productId,
                sourceBusinessId: snap.businessId,
                updatedAt: now,
                syncedAt: now,
            },
        })
        .returning();

    await writeSyncLog({
        action: "created",
        masterProductId: created.id,
        sourceProductId: snap.productId,
        sourceBusinessId: snap.businessId,
        shopType: snap.shopType,
        productName: snap.productName,
        status: "success",
    });

    return created;
}

/** Non-blocking hook for tenant product routes — never throws to caller. */
export function triggerMasterCatalogSync(productId: string, businessId: string) {
    void syncTenantProductToMasterCatalog(productId, businessId).catch((err) => {
        console.error("[MasterCatalog] sync failed", productId, err);
    });
}

export async function backfillMasterCatalogFromTenants(batchSize = 500) {
    let offset = 0;
    let processed = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;

    while (true) {
        const batch = await db
            .select({
                productId: products.id,
                businessId: products.businessId,
            })
            .from(products)
            .orderBy(asc(products.createdAt))
            .limit(batchSize)
            .offset(offset);

        if (batch.length === 0) break;

        for (const row of batch) {
            try {
                const before = await db
                    .select({ id: masterProducts.id })
                    .from(masterProducts)
                    .where(eq(masterProducts.sourceProductId, row.productId))
                    .limit(1);

                const result = await syncTenantProductToMasterCatalog(
                    row.productId,
                    row.businessId
                );
                processed += 1;
                if (!result) {
                    errors += 1;
                    continue;
                }
                if (before[0]) updated += 1;
                else created += 1;
            } catch {
                errors += 1;
                processed += 1;
            }
        }

        offset += batch.length;
        if (batch.length < batchSize) break;
    }

    await writeSyncLog({
        action: "bulk_sync",
        status: "success",
        message: `Processed ${processed}, created ~${created}, updated ~${updated}, errors ${errors}`,
    });

    return { processed, created, updated, errors };
}

export async function syncTenantProductsBulk(
    productIds: string[],
    businessId: string
) {
    const unique = [...new Set(productIds)];
    if (unique.length === 0) return;

    const rows = await db
        .select({ id: products.id })
        .from(products)
        .where(
            and(
                eq(products.businessId, businessId),
                inArray(products.id, unique)
            )
        );

    for (const row of rows) {
        triggerMasterCatalogSync(row.id, businessId);
    }
}

export type CatalogShopListParams = {
    q?: string;
    plan?: "starter" | "growth" | "pro";
    status?: "active" | "suspended" | "deactivated";
    subscriptionStatus?: "active" | "past_due" | "canceled";
    sort?: "name" | "created" | "period_end";
    order?: "asc" | "desc";
    limit: number;
    offset: number;
};

function mapCatalogShopRow(
    r: {
        id: string;
        name: string;
        slug: string;
        businessType: string | null;
        city: string | null;
        region: string | null;
        phone: string | null;
        contactEmail: string | null;
        plan: "starter" | "growth" | "pro";
        status: "active" | "suspended" | "deactivated";
        subscriptionStatus: "active" | "past_due" | "canceled";
        currentPeriodEnd: Date | null;
        createdAt: Date;
        updatedAt: Date;
        onboardingCompleted: boolean | null;
        productCount: number;
    },
    registeredEmails: string[],
    branchCount: number
): CatalogShopDto {
    const shopType = resolveShopType(r.businessType);
    return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        shopType,
        shopTypeLabel: shopTypeLabel(shopType),
        city: r.city,
        region: r.region,
        phone: r.phone,
        contactEmail: r.contactEmail,
        registeredEmails,
        productCount: Number(r.productCount),
        branchCount,
        plan: r.plan,
        status: r.status,
        subscriptionStatus: r.subscriptionStatus,
        currentPeriodEnd: r.currentPeriodEnd ? toIso(r.currentPeriodEnd) : null,
        createdAt: toIso(r.createdAt),
        updatedAt: toIso(r.updatedAt),
        onboardingCompleted: r.onboardingCompleted ?? false,
    };
}

/** All VentraPOS shops (businesses) with live product counts from tenant inventory. */
export async function listCatalogShops(params: CatalogShopListParams) {
    const conditions = [];
    if (params.q?.trim()) {
        const term = `%${params.q.trim()}%`;
        conditions.push(
            or(
                ilike(businesses.name, term),
                ilike(businesses.slug, term),
                ilike(businesses.city, term),
                ilike(businesses.region, term),
                ilike(businesses.contactEmail, term),
                ilike(businesses.phone, term)
            )
        );
    }
    if (params.plan) {
        conditions.push(eq(businesses.plan, params.plan));
    }
    if (params.status) {
        conditions.push(eq(businesses.status, params.status));
    }
    if (params.subscriptionStatus) {
        conditions.push(eq(businesses.subscriptionStatus, params.subscriptionStatus));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [totalRow] = where
        ? await db.select({ n: count() }).from(businesses).where(where)
        : await db.select({ n: count() }).from(businesses);

    const sortCol =
        params.sort === "created"
            ? businesses.createdAt
            : params.sort === "period_end"
              ? businesses.currentPeriodEnd
              : businesses.name;
    const orderFn = params.order === "desc" ? desc : asc;

    const grouped = db
        .select({
            id: businesses.id,
            name: businesses.name,
            slug: businesses.slug,
            businessType: businesses.businessType,
            city: businesses.city,
            region: businesses.region,
            phone: businesses.phone,
            contactEmail: businesses.contactEmail,
            plan: businesses.plan,
            status: businesses.status,
            subscriptionStatus: businesses.subscriptionStatus,
            currentPeriodEnd: businesses.currentPeriodEnd,
            createdAt: businesses.createdAt,
            updatedAt: businesses.updatedAt,
            onboardingCompleted: businesses.onboardingCompleted,
            productCount: sql<number>`count(${products.id})::int`,
        })
        .from(businesses)
        .leftJoin(products, eq(products.businessId, businesses.id))
        .groupBy(
            businesses.id,
            businesses.name,
            businesses.slug,
            businesses.businessType,
            businesses.city,
            businesses.region,
            businesses.phone,
            businesses.contactEmail,
            businesses.plan,
            businesses.status,
            businesses.subscriptionStatus,
            businesses.currentPeriodEnd,
            businesses.createdAt,
            businesses.updatedAt,
            businesses.onboardingCompleted
        )
        .orderBy(orderFn(sortCol))
        .limit(params.limit)
        .offset(params.offset);

    const rows = where ? await grouped.where(where) : await grouped;

    const businessIds = rows.map((r) => r.id);
    const userEmailRows =
        businessIds.length > 0
            ? await db
                  .select({
                      businessId: users.businessId,
                      email: users.email,
                  })
                  .from(users)
                  .where(inArray(users.businessId, businessIds))
            : [];

    const branchCountRows =
        businessIds.length > 0
            ? await db
                  .select({
                      businessId: branches.businessId,
                      n: count(),
                  })
                  .from(branches)
                  .where(inArray(branches.businessId, businessIds))
                  .groupBy(branches.businessId)
            : [];

    const emailsByBusiness = new Map<string, string[]>();
    for (const row of userEmailRows) {
        if (!row.businessId) continue;
        const list = emailsByBusiness.get(row.businessId) ?? [];
        if (!list.includes(row.email)) list.push(row.email);
        emailsByBusiness.set(row.businessId, list);
    }

    const branchesByBusiness = new Map(
        branchCountRows.map((r) => [r.businessId, Number(r.n)])
    );

    const items: CatalogShopDto[] = rows.map((r) => {
        const registeredEmails = [...(emailsByBusiness.get(r.id) ?? [])];
        if (r.contactEmail && !registeredEmails.includes(r.contactEmail)) {
            registeredEmails.unshift(r.contactEmail);
        }
        return mapCatalogShopRow(
            r,
            registeredEmails,
            branchesByBusiness.get(r.id) ?? 0
        );
    });

    return {
        items,
        total: totalRow?.n ?? 0,
        limit: params.limit,
        offset: params.offset,
    };
}

export async function getCatalogShopById(
    businessId: string
): Promise<CatalogShopDto | null> {
    const [row] = await db
        .select({
            id: businesses.id,
            name: businesses.name,
            slug: businesses.slug,
            businessType: businesses.businessType,
            city: businesses.city,
            region: businesses.region,
            phone: businesses.phone,
            contactEmail: businesses.contactEmail,
            plan: businesses.plan,
            status: businesses.status,
            subscriptionStatus: businesses.subscriptionStatus,
            currentPeriodEnd: businesses.currentPeriodEnd,
            createdAt: businesses.createdAt,
            updatedAt: businesses.updatedAt,
            onboardingCompleted: businesses.onboardingCompleted,
        })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

    if (!row) return null;

    const [countRow] = await db
        .select({ n: count() })
        .from(products)
        .where(eq(products.businessId, businessId));

    const [branchRow] = await db
        .select({ n: count() })
        .from(branches)
        .where(eq(branches.businessId, businessId));

    const userRows = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.businessId, businessId));

    const registeredEmails = userRows.map((u) => u.email);
    if (row.contactEmail && !registeredEmails.includes(row.contactEmail)) {
        registeredEmails.unshift(row.contactEmail);
    }

    return mapCatalogShopRow(
        {
            ...row,
            productCount: countRow?.n ?? 0,
        },
        registeredEmails,
        branchRow?.n ?? 0
    );
}

/** All products for one shop — pulled from tenant inventory (images, barcodes, categories). */
export async function listShopProducts(
    businessId: string,
    params: CatalogListParams
) {
    const shop = await getCatalogShopById(businessId);
    if (!shop) {
        return { items: [] as ShopProductDto[], total: 0, limit: params.limit, offset: params.offset, shop: null };
    }

    const conditions = [eq(products.businessId, businessId)];
    if (params.q?.trim()) {
        const term = `%${params.q.trim()}%`;
        conditions.push(
            or(
                ilike(products.name, term),
                ilike(products.sku, term),
                ilike(products.barcode, term),
                ilike(categories.name, term)
            )!
        );
    }

    const where = and(...conditions);
    const sortCol =
        params.sort === "created"
            ? products.createdAt
            : params.sort === "updated"
              ? products.updatedAt
              : products.name;
    const orderFn = params.order === "desc" ? desc : asc;

    const [totalRow] = await db
        .select({ n: count() })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(where);

    const rows = await db
        .select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            barcode: products.barcode,
            imageSrc: products.imageSrc,
            categoryName: categories.name,
            unit: products.unit,
            priceGhs: products.priceGhs,
            stock: products.stock,
            status: products.status,
            businessId: products.businessId,
            businessName: businesses.name,
            businessType: businesses.businessType,
        })
        .from(products)
        .innerJoin(businesses, eq(products.businessId, businesses.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(where)
        .orderBy(orderFn(sortCol))
        .limit(params.limit)
        .offset(params.offset);

    const items: ShopProductDto[] = rows.map((r) => {
        const st = resolveShopType(r.businessType);
        return {
            id: r.id,
            name: r.name,
            sku: r.sku,
            barcode: r.barcode,
            imageSrc: r.imageSrc,
            categoryName: categoryDisplayName(r.categoryName),
            unit: r.unit,
            priceGhs: r.priceGhs,
            stock: Number(r.stock ?? 0),
            status: r.status,
            businessId: r.businessId,
            businessName: r.businessName,
            shopType: st,
            shopTypeLabel: shopTypeLabel(st),
        };
    });

    return {
        items,
        total: totalRow?.n ?? 0,
        limit: params.limit,
        offset: params.offset,
        shop,
    };
}
